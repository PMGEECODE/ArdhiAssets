# Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [ ] All security configurations reviewed and approved
- [ ] Environment variables configured with production values
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] SSL/TLS certificates obtained and installed
- [ ] Secrets managed via Secrets Manager
- [ ] Disaster recovery plan documented
- [ ] Incident response team notified
- [ ] Change management approval obtained

### Infrastructure Setup

#### 1. Kubernetes Cluster

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic auth-secrets \
  --from-literal=database-url='postgresql+asyncpg://...' \
  --from-literal=jwt-private-key='...' \
  --from-literal=refresh-token-key='...' \
  --from-literal=csrf-secret='...' \
  --namespace=production

# Apply configurations
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

#### 2. Database Setup

```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n production -- psql -U authuser -d authdb

# Run migrations
psql -U authuser -d authdb < migrations/001_init_auth_schema.sql

# Verify tables
\dt

# Create initial admin user
psql -U authuser -d authdb -c "
INSERT INTO users (email, username, password_hash, is_active, is_verified, role_id)
VALUES (
  'admin@production.gov',
  'admin',
  '<argon2id-hash>',
  true,
  true,
  (SELECT id FROM roles WHERE name = 'admin')
);
"
```

#### 3. Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-backend
  template:
    metadata:
      labels:
        app: auth-backend
    spec:
      containers:
      - name: backend
        image: registry.production.gov/auth-backend:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: database-url
        - name: JWT_PRIVATE_KEY_PATH
          value: /secrets/jwt_private.pem
        - name: REFRESH_TOKEN_SIGNING_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: refresh-token-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: jwt-keys
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: jwt-keys
        secret:
          secretName: jwt-keys
---
apiVersion: v1
kind: Service
metadata:
  name: auth-backend
  namespace: production
spec:
  selector:
    app: auth-backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 4. Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - auth.production.gov
    secretName: auth-tls
  rules:
  - host: auth.production.gov
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: auth-backend
            port:
              number: 8000
```

### Monitoring Setup

#### Prometheus

```yaml
# monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-backend-monitor
  namespace: production
spec:
  selector:
    matchLabels:
      app: auth-backend
  endpoints:
  - port: metrics
    interval: 30s
```

#### Grafana Dashboard

Import dashboard from `monitoring/grafana-dashboard.json`

Key metrics:
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Failed login attempts
- Token rotation rate
- Database connection pool usage

### Logging Setup

#### Fluentd Configuration

```yaml
# logging/fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: production
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/auth-backend*.log
      pos_file /var/log/fluentd-auth-backend.pos
      tag auth.backend
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter auth.backend>
      @type record_transformer
      <record>
        environment production
        cluster ${ENV["CLUSTER_NAME"]}
      </record>
    </filter>

    <match auth.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix auth
      include_tag_key true
      type_name _doc
      tag_key @log_name
      <buffer>
        @type file
        path /var/log/fluentd-buffer/auth
        flush_thread_count 2
        flush_interval 5s
        chunk_limit_size 2M
        queue_limit_length 8
        retry_max_interval 30
        retry_forever true
      </buffer>
    </match>
```

### Backup Configuration

#### PostgreSQL Backups

```bash
# Create backup CronJob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: postgres-password
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres -U authuser authdb | \
              gzip > /backup/authdb-\$(date +%Y%m%d-%H%M%S).sql.gz
              aws s3 cp /backup/*.sql.gz s3://production-backups/database/
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
EOF
```

### Security Hardening

#### 1. Network Policies

```yaml
# security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-backend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: auth-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

#### 2. Pod Security Policy

```yaml
# security/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: auth-backend-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

### Post-Deployment Verification

#### 1. Smoke Tests

```bash
# Health check
curl -f https://auth.production.gov/health

# Test login endpoint
curl -X POST https://auth.production.gov/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPassword123!"}'

# Check logs
kubectl logs -f deployment/auth-backend -n production

# Verify database connectivity
kubectl exec -it deployment/auth-backend -n production -- \
  python -c "from app.db.base import engine; print('DB OK')"
```

#### 2. Load Testing

```bash
# Run load test with k6
k6 run --vus 100 --duration 30s load-tests/auth-load-test.js

# Monitor during load test
kubectl top pods -n production
watch -n 2 "kubectl get hpa -n production"
```

#### 3. Security Scan

```bash
# Scan running container
trivy image registry.production.gov/auth-backend:v1.0.0

# Check for exposed secrets
kubectl get secrets -n production -o json | \
  jq -r '.items[].data | to_entries[] | select(.value | @base64d | test("password|key|secret"))'
```

### Rollback Procedure

```bash
# List previous deployments
kubectl rollout history deployment/auth-backend -n production

# Rollback to previous version
kubectl rollout undo deployment/auth-backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/auth-backend --to-revision=2 -n production

# Verify rollback
kubectl rollout status deployment/auth-backend -n production
```

### Disaster Recovery

#### Database Restore

```bash
# Stop application
kubectl scale deployment/auth-backend --replicas=0 -n production

# Restore from backup
kubectl exec -it postgres-0 -n production -- bash
aws s3 cp s3://production-backups/database/authdb-20251028-020000.sql.gz - | \
  gunzip | psql -U authuser authdb

# Restart application
kubectl scale deployment/auth-backend --replicas=3 -n production
```

#### Full System Recovery

1. Restore Kubernetes cluster from backup
2. Restore PostgreSQL data
3. Verify secrets in Secrets Manager
4. Deploy application
5. Run smoke tests
6. Notify stakeholders

### Maintenance Windows

#### Zero-Downtime Deployment

```bash
# Update image with rolling update
kubectl set image deployment/auth-backend \
  backend=registry.production.gov/auth-backend:v1.0.1 \
  -n production

# Monitor rollout
kubectl rollout status deployment/auth-backend -n production

# Verify no downtime
while true; do
  curl -f https://auth.production.gov/health || echo "FAILED"
  sleep 1
done
```

#### Database Migration

```bash
# Run migration in maintenance mode
kubectl exec -it deployment/auth-backend -n production -- \
  alembic upgrade head

# Verify migration
kubectl exec -it postgres-0 -n production -- \
  psql -U authuser -d authdb -c "\dt"
```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY idx_audit_logs_created_desc ON audit_logs (created_at DESC);
CREATE INDEX CONCURRENTLY idx_refresh_tokens_user_active ON refresh_tokens (user_id) WHERE revoked = false;

-- Analyze tables
ANALYZE users;
ANALYZE refresh_tokens;
ANALYZE sessions;
ANALYZE audit_logs;

-- Vacuum tables
VACUUM ANALYZE;
```

### Connection Pooling

```python
# app/db/base.py
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,           # Connections per instance
    max_overflow=10,        # Additional connections during peak
    pool_pre_ping=True,     # Verify connections before use
    pool_recycle=3600,      # Recycle connections every hour
)
```

### Caching Strategy

```python
# Add Redis caching for token validation
from redis.asyncio import Redis

redis = Redis.from_url(settings.REDIS_URL)

async def validate_token_cached(token: str):
    # Check cache first
    cached = await redis.get(f"token:{token}")
    if cached:
        return json.loads(cached)

    # Validate and cache
    result = validate_token(token)
    await redis.setex(f"token:{token}", 300, json.dumps(result))
    return result
```

## Compliance & Auditing

### Audit Log Retention

```sql
-- Create partitioned table for audit logs
CREATE TABLE audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Set up automatic partition creation
-- (use pg_partman extension or cron job)
```

### Compliance Reports

```bash
# Generate monthly compliance report
kubectl exec -it deployment/auth-backend -n production -- \
  python scripts/generate_compliance_report.py \
    --start-date 2025-10-01 \
    --end-date 2025-10-31 \
    --output /reports/compliance-2025-10.pdf
```

## Support Contacts

- **Infrastructure Team:** infra@example.gov
- **Security Team:** security@example.gov
- **On-Call:** oncall@example.gov (24/7)
- **Incident Management:** incidents@example.gov
