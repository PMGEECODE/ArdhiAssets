# Security Incident Response Runbook

## Incident Classification

### Severity Levels

**P0 - Critical**
- Active data breach
- System-wide compromise
- Token signing key exposure
- Database compromise

**P1 - High**
- Token reuse detection
- Sustained brute force attack
- Privilege escalation attempt
- MFA bypass attempt

**P2 - Medium**
- High rate of failed logins
- Unusual access patterns
- Account enumeration attempts
- Suspicious IP activity

**P3 - Low**
- Individual failed logins
- Password policy violations
- Rate limit triggers

## Incident Response Procedures

### 1. Token Reuse Detected

**Indicators:**
- `token_reuse_detected` event in audit logs
- Automatic token chain revocation triggered

**Immediate Actions:**
1. **Identify affected user** (within 1 minute)
   ```bash
   kubectl exec -it postgres-0 -n production -- \
     psql -U authuser -d authdb -c "
     SELECT u.id, u.username, u.email, al.event_data
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     WHERE al.event_type = 'token_reuse_detected'
     AND al.created_at > NOW() - INTERVAL '5 minutes'
     ORDER BY al.created_at DESC;"
   ```

2. **Verify token revocation** (within 2 minutes)
   ```sql
   SELECT * FROM refresh_tokens
   WHERE user_id = '<user-id>'
   AND revoked = false;
   ```
   Should return 0 rows (all tokens revoked)

3. **Review access logs** (within 5 minutes)
   ```sql
   SELECT event_type, ip_address, user_agent, created_at, event_data
   FROM audit_logs
   WHERE user_id = '<user-id>'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

4. **Check for data exfiltration** (within 10 minutes)
   - Review API access logs for unusual endpoints
   - Check for bulk data retrieval
   - Analyze response sizes and frequencies

5. **Notify user** (within 15 minutes)
   ```bash
   python scripts/send_security_alert.py \
     --user-id <user-id> \
     --incident-type token_reuse \
     --template security_alert_token_reuse
   ```

6. **Force password reset** (within 20 minutes)
   ```sql
   UPDATE users
   SET password_hash = NULL,
       is_active = false
   WHERE id = '<user-id>';
   ```

7. **Document incident** (within 30 minutes)
   - Create incident ticket
   - Document timeline
   - Note affected resources
   - Record actions taken

**Follow-up Actions (within 24 hours):**
- Conduct security review of user's recent activity
- Check for compromised credentials on haveibeenpwned
- Review IP addresses for known malicious actors
- Update threat intelligence feeds

---

### 2. Brute Force Attack

**Indicators:**
- High volume of `login_failed` events from single IP
- Multiple `account_locked` events in short time
- Rate limit exceeded alerts

**Immediate Actions:**
1. **Identify attack source** (within 1 minute)
   ```sql
   SELECT ip_address, COUNT(*) as attempts,
          MIN(attempted_at) as first_attempt,
          MAX(attempted_at) as last_attempt
   FROM failed_login_attempts
   WHERE attempted_at > NOW() - INTERVAL '5 minutes'
   GROUP BY ip_address
   HAVING COUNT(*) > 10
   ORDER BY attempts DESC;
   ```

2. **Block offending IPs** (within 2 minutes)
   ```bash
   # At firewall level
   iptables -A INPUT -s <ip-address> -j DROP

   # At ingress level
   kubectl annotate ingress auth-ingress -n production \
     nginx.ingress.kubernetes.io/whitelist-source-range-="<ip-address>"
   ```

3. **Review targeted accounts** (within 5 minutes)
   ```sql
   SELECT username, COUNT(*) as attempts, is_active, locked_until
   FROM failed_login_attempts fla
   JOIN users u ON fla.user_id = u.id
   WHERE attempted_at > NOW() - INTERVAL '10 minutes'
   GROUP BY username, is_active, locked_until
   ORDER BY attempts DESC;
   ```

4. **Verify account lockout working** (within 5 minutes)
   ```sql
   SELECT username, failed_attempts, locked_until
   FROM users
   WHERE locked_until IS NOT NULL
   AND locked_until > NOW();
   ```

5. **Adjust rate limits** (temporary, within 10 minutes)
   ```bash
   # Reduce rate limits temporarily
   kubectl set env deployment/auth-backend -n production \
     RATE_LIMIT_PER_IP=20/minute \
     RATE_LIMIT_PER_USER=5/minute
   ```

6. **Enable geo-blocking** (if attack from specific region)
   ```bash
   kubectl annotate ingress auth-ingress -n production \
     nginx.ingress.kubernetes.io/configuration-snippet=|
       if ($geoip_country_code ~ (CN|RU)) {
         return 403;
       }
   ```

7. **Monitor attack progression** (continuous)
   ```bash
   watch -n 5 "kubectl exec -it postgres-0 -n production -- \
     psql -U authuser -d authdb -c '
     SELECT COUNT(*) FROM failed_login_attempts
     WHERE attempted_at > NOW() - INTERVAL '\''1 minute'\'';'"
   ```

**Follow-up Actions:**
- Analyze attack patterns
- Update WAF rules
- Review and strengthen password policies
- Consider implementing CAPTCHA
- Document attack vectors

---

### 3. Database Compromise

**Indicators:**
- Unauthorized database access
- Unusual query patterns
- Data exfiltration detected
- Credential exposure

**Immediate Actions:**
1. **Isolate database** (within 30 seconds)
   ```bash
   # Block all external connections
   kubectl scale deployment/auth-backend --replicas=0 -n production

   # Apply strict network policy
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: postgres-lockdown
     namespace: production
   spec:
     podSelector:
       matchLabels:
         app: postgres
     policyTypes:
     - Ingress
     - Egress
     ingress: []
     egress: []
   EOF
   ```

2. **Revoke ALL tokens** (within 1 minute)
   ```sql
   UPDATE refresh_tokens SET revoked = true WHERE revoked = false;
   ```

3. **Rotate all secrets** (within 5 minutes)
   ```bash
   # Generate new keys
   python scripts/generate_secrets.py > new_secrets.env

   # Update Kubernetes secrets
   kubectl create secret generic auth-secrets-new \
     --from-env-file=new_secrets.env \
     -n production

   # Update deployment to use new secrets
   kubectl patch deployment auth-backend -n production \
     -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","envFrom":[{"secretRef":{"name":"auth-secrets-new"}}]}]}}}}'
   ```

4. **Change database credentials** (within 10 minutes)
   ```sql
   ALTER USER authuser WITH PASSWORD '<new-secure-password>';
   ```

5. **Enable database audit logging** (immediately)
   ```bash
   kubectl exec -it postgres-0 -n production -- \
     psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
   kubectl exec -it postgres-0 -n production -- \
     psql -U postgres -c "SELECT pg_reload_conf();"
   ```

6. **Snapshot database** (for forensics, within 15 minutes)
   ```bash
   kubectl exec -it postgres-0 -n production -- \
     pg_dump -U authuser authdb | \
     gzip > forensic-snapshot-$(date +%Y%m%d-%H%M%S).sql.gz

   aws s3 cp forensic-snapshot-*.sql.gz \
     s3://security-forensics/database/
   ```

7. **Analyze database logs** (within 30 minutes)
   ```bash
   kubectl exec -it postgres-0 -n production -- \
     grep -E 'DROP|DELETE|UPDATE|SELECT.*password' \
     /var/log/postgresql/postgresql*.log
   ```

8. **Notify all users** (within 1 hour)
   ```bash
   python scripts/send_mass_notification.py \
     --type database_incident \
     --action force_password_reset
   ```

**Follow-up Actions:**
- Conduct full forensic analysis
- Review database access logs
- Identify root cause
- Implement additional monitoring
- Report to authorities if required
- Update disaster recovery procedures

---

### 4. Privilege Escalation Attempt

**Indicators:**
- Unauthorized admin endpoint access
- Role modification attempts
- Permission bypass attempts

**Immediate Actions:**
1. **Identify actor** (within 1 minute)
   ```sql
   SELECT u.username, u.email, u.role_id, r.name as role,
          al.event_type, al.event_data, al.ip_address
   FROM audit_logs al
   JOIN users u ON al.user_id = u.id
   LEFT JOIN roles r ON u.role_id = r.id
   WHERE al.event_data::text LIKE '%permission%denied%'
      OR al.event_data::text LIKE '%unauthorized%'
   AND al.created_at > NOW() - INTERVAL '10 minutes';
   ```

2. **Suspend account** (within 2 minutes)
   ```sql
   UPDATE users
   SET is_active = false
   WHERE id = '<user-id>';
   ```

3. **Revoke sessions** (within 2 minutes)
   ```sql
   UPDATE refresh_tokens
   SET revoked = true
   WHERE user_id = '<user-id>' AND revoked = false;
   ```

4. **Review role assignments** (within 5 minutes)
   ```sql
   SELECT u.username, u.email, r.name as role,
          u.created_at, u.updated_at
   FROM users u
   LEFT JOIN roles r ON u.role_id = r.id
   WHERE u.role_id = (SELECT id FROM roles WHERE name = 'admin')
   ORDER BY u.updated_at DESC;
   ```

5. **Check for backdoor accounts** (within 10 minutes)
   ```sql
   SELECT * FROM users
   WHERE created_at > NOW() - INTERVAL '24 hours'
   OR updated_at > NOW() - INTERVAL '24 hours';
   ```

6. **Review permission changes** (within 15 minutes)
   ```sql
   SELECT event_type, event_data, user_id, created_at
   FROM audit_logs
   WHERE event_type IN ('role_changed', 'permission_modified', 'user_created')
   AND created_at > NOW() - INTERVAL '7 days';
   ```

7. **Enable enhanced monitoring** (within 20 minutes)
   ```bash
   kubectl set env deployment/auth-backend -n production \
     LOG_LEVEL=DEBUG \
     AUDIT_LOG_LEVEL=VERBOSE
   ```

**Follow-up Actions:**
- Review access control implementation
- Audit RBAC configuration
- Check for application vulnerabilities
- Implement additional authorization checks
- Conduct security code review

---

### 5. MFA Bypass Attempt

**Indicators:**
- Multiple MFA failures
- MFA disabled without proper authentication
- Unusual MFA reset requests

**Immediate Actions:**
1. **Identify attempts** (within 1 minute)
   ```sql
   SELECT u.username, COUNT(*) as failures,
          MIN(al.created_at) as first_failure,
          MAX(al.created_at) as last_failure
   FROM audit_logs al
   JOIN users u ON al.user_id = u.id
   WHERE al.event_type = 'mfa_failed'
   AND al.created_at > NOW() - INTERVAL '10 minutes'
   GROUP BY u.username
   HAVING COUNT(*) > 5;
   ```

2. **Lock affected accounts** (within 2 minutes)
   ```sql
   UPDATE users
   SET locked_until = NOW() + INTERVAL '24 hours'
   WHERE id IN (
     SELECT user_id FROM audit_logs
     WHERE event_type = 'mfa_failed'
     AND created_at > NOW() - INTERVAL '10 minutes'
     GROUP BY user_id
     HAVING COUNT(*) > 5
   );
   ```

3. **Notify users** (within 5 minutes)
   ```bash
   python scripts/send_security_alert.py \
     --user-ids <comma-separated-ids> \
     --incident-type mfa_bypass_attempt
   ```

4. **Review MFA disable events** (within 10 minutes)
   ```sql
   SELECT u.username, al.event_type, al.event_data,
          al.ip_address, al.created_at
   FROM audit_logs al
   JOIN users u ON al.user_id = u.id
   WHERE al.event_type IN ('mfa_disabled', 'mfa_reset')
   AND al.created_at > NOW() - INTERVAL '24 hours';
   ```

5. **Enforce MFA for all admin users** (within 15 minutes)
   ```sql
   -- Ensure all admins have MFA enabled
   SELECT u.username, ms.enabled
   FROM users u
   LEFT JOIN mfa_secrets ms ON u.id = ms.user_id
   WHERE u.role_id = (SELECT id FROM roles WHERE name = 'admin')
   AND (ms.enabled IS NULL OR ms.enabled = false);
   ```

**Follow-up Actions:**
- Review MFA implementation
- Consider requiring MFA for all users
- Implement device trust
- Add IP-based MFA exemptions for known locations

---

## Alert Response Matrix

| Alert Type | Severity | Response Time | On-Call? | Escalation |
|-----------|----------|---------------|----------|------------|
| Token reuse detected | P1 | 1 minute | Yes | Security team |
| Brute force attack | P1 | 2 minutes | Yes | Security + Infra |
| Database compromise | P0 | 30 seconds | Yes | All hands |
| Privilege escalation | P1 | 1 minute | Yes | Security team |
| MFA bypass attempt | P1 | 2 minutes | Yes | Security team |
| High failed login rate | P2 | 10 minutes | Yes | On-call engineer |
| Account lockout spike | P2 | 10 minutes | No | Security team (next day) |
| Rate limit exceeded | P3 | 30 minutes | No | Monitoring team |

## Security Contacts

### Emergency Contacts (24/7)
- **Security Operations Center:** +1-555-SEC-OPS1
- **On-Call Security Engineer:** oncall-security@example.gov
- **Incident Commander:** incident-commander@example.gov

### Escalation Chain
1. On-Call Engineer
2. Security Team Lead
3. CISO
4. CTO

### External Contacts
- **FBI Cyber Division:** cyber@fbi.gov
- **CISA:** central@cisa.dhs.gov
- **Vendor Support:** See vendor contact list

## Post-Incident Procedures

### Incident Report Template

```markdown
# Security Incident Report

**Incident ID:** INC-YYYYMMDD-NNN
**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Status:** Open/Resolved/Under Investigation

## Executive Summary
[Brief description of incident]

## Timeline
- **Detection:** YYYY-MM-DD HH:MM UTC
- **Response Initiated:** YYYY-MM-DD HH:MM UTC
- **Containment:** YYYY-MM-DD HH:MM UTC
- **Resolution:** YYYY-MM-DD HH:MM UTC

## Incident Details
[Detailed description]

## Impact Assessment
- **Users Affected:** N
- **Data Compromised:** Yes/No
- **Services Disrupted:** List
- **Duration:** N hours/minutes

## Root Cause
[Analysis of root cause]

## Actions Taken
1. [Action 1]
2. [Action 2]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Lessons Learned
[Key takeaways]
```

### Post-Mortem Meeting
- Schedule within 48 hours of resolution
- Include all responders
- Review timeline and actions
- Identify improvements
- Assign action items

### Follow-up Actions
- Update runbooks
- Improve monitoring
- Patch vulnerabilities
- Train team on new procedures
- Update documentation

## Training & Drills

### Quarterly Security Drills
- Simulated token reuse scenario
- Brute force attack simulation
- Database compromise drill
- Privilege escalation test

### Annual Tabletop Exercise
- Full incident response simulation
- Multi-team coordination
- Executive communication
- Customer notification

## Compliance Reporting

### Required Reports
- **FISMA:** Within 1 hour of P0, 24 hours of P1
- **Internal:** All incidents documented
- **Regulatory:** As required by law

### Documentation Requirements
- Incident timeline
- Actions taken
- Root cause analysis
- Remediation plan
- Lessons learned
