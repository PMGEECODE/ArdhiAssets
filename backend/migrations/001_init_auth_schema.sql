/*
  # Government-Grade Authentication System - Initial Schema

  ## Overview
  This migration creates the complete database schema for a government-grade
  authentication system with comprehensive security controls.

  ## Tables Created

  ### 1. roles
  - Stores user roles (Admin, User, Guest, etc.)
  - Foundation for RBAC system

  ### 2. permissions
  - Granular permissions for fine-grained access control
  - Examples: users.read, users.write, audit.read

  ### 3. role_permissions
  - Many-to-many relationship between roles and permissions
  - Allows flexible permission assignment

  ### 4. users
  - Core user table with authentication credentials
  - Includes 2FA, password lifecycle, and audit fields
  - Argon2id password hashing (handled by application)

  ### 5. refresh_tokens
  - Stores refresh tokens with rotation support
  - One-time use semantics via replaced_by_token_id
  - Device fingerprinting via device_info JSONB column

  ### 6. sessions
  - Active session tracking per device
  - Links to refresh_tokens for revocation

  ### 7. user_sessions
  - Enhanced session tracking with additional metadata

  ### 8. audit_logs
  - Comprehensive audit trail of all authentication events
  - JSON storage for flexible event data
  - Supports SIEM integration

  ### 9. failed_login_attempts
  - Tracks failed login attempts for brute force detection
  - Supports both per-IP and per-user analysis

  ### 10. mfa_secrets
  - Stores TOTP secrets and backup codes for 2FA
  - One-to-one with users table
  - Backup codes stored as array of hashed values

  ## Security Features
  - All sensitive columns use appropriate types (UUID, INET, JSONB)
  - Comprehensive indexing for performance and security queries
  - Foreign key cascades for data integrity
  - Default values prevent null-related vulnerabilities
  - Timestamp tracking for audit compliance

  ## Indexes
  - Email and username (unique, frequent lookups)
  - User ID (foreign key joins)
  - Token hashes (validation)
  - IP addresses (rate limiting, attack detection)
  - Timestamps (audit queries, cleanup jobs)
  - Event types (audit log filtering)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Align users table with User model: add 2FA, password lifecycle, and profile fields
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    two_factor_auth BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    two_factor_code VARCHAR(10) NULL,
    two_factor_code_expires TIMESTAMP WITH TIME ZONE NULL,
    password_expiration TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    reset_token VARCHAR(100) NULL,
    reset_token_expiry TIMESTAMP WITH TIME ZONE NULL,
    password_changed_at TIMESTAMP WITH TIME ZONE NULL,
    requires_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    previous_password_hash VARCHAR(255) NULL,
    session_timeout INTEGER NOT NULL DEFAULT 1800,
    first_name VARCHAR(50) NULL,
    last_name VARCHAR(50) NULL,
    department VARCHAR(100) NULL,
    personal_number VARCHAR(20) NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    deactivation_reason TEXT NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE NULL,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    device_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_alerts BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
CREATE INDEX IF NOT EXISTS ix_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS ix_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS ix_users_two_factor_code ON users(two_factor_code);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS ix_users_password_changed_at ON users(password_changed_at);
CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- Refresh Tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    device_info JSONB,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_id UUID NOT NULL REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Add user_sessions table for enhanced session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions(device_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at);

-- Audit Logs table - Aligned with AuditLog model: added action, entity_type, entity_id, event_category, status
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    event_category VARCHAR(100),
    role VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    old_values JSONB,
    new_values JSONB,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditlog_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auditlog_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_auditlog_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auditlog_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_auditlog_event_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_auditlog_role ON audit_logs(role);
CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_auditlog_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_auditlog_user_time ON audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_entity_action ON audit_logs(entity_type, action);
CREATE INDEX IF NOT EXISTS idx_auditlog_action_time ON audit_logs(action, timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_status_time ON audit_logs(status, timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_event_time ON audit_logs(event_category, timestamp);

-- Failed Login Attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255),
    ip_address INET NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_attempts_user ON failed_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_username ON failed_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_time ON failed_login_attempts(attempted_at DESC);

-- MFA Secrets table
CREATE TABLE IF NOT EXISTS mfa_secrets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    backup_codes TEXT[] NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mfa_secrets_enabled ON mfa_secrets(enabled) WHERE enabled = TRUE;

-- Add notification table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Add backups table
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_name VARCHAR(255) NOT NULL,
    backup_size BIGINT,
    backup_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);

-- Add system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    setting_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator with full system access'),
    ('user', 'Standard user with limited access'),
    ('viewer', 'Viewer user with read-only access'),
    ('guest', 'Guest user with minimal access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (code, description) VALUES
    ('users.read', 'Read user information'),
    ('users.write', 'Create and update users'),
    ('users.delete', 'Delete users'),
    ('roles.read', 'Read roles and permissions'),
    ('roles.write', 'Modify roles and permissions'),
    ('audit.read', 'Read audit logs'),
    ('sessions.read', 'View user sessions'),
    ('sessions.revoke', 'Revoke user sessions'),
    ('admin.all', 'Full administrative access'),
    ('assets.read', 'Read assets'),
    ('assets.write', 'Create and update assets'),
    ('assets.delete', 'Delete assets'),
    ('backups.read', 'Read backups'),
    ('backups.write', 'Create and manage backups')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign basic permissions to user role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user' AND p.code IN ('users.read', 'sessions.read', 'sessions.revoke', 'assets.read', 'assets.write')
ON CONFLICT DO NOTHING;

-- Assign read-only permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer' AND p.code IN ('users.read', 'assets.read', 'audit.read')
ON CONFLICT DO NOTHING;

-- Assign minimal permissions to guest role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'guest' AND p.code IN ('assets.read')
ON CONFLICT DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backups_updated_at
    BEFORE UPDATE ON backups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment on tables for documentation
COMMENT ON TABLE users IS 'Core user authentication table with account lockout, 2FA, and password lifecycle support';
COMMENT ON TABLE refresh_tokens IS 'Refresh tokens with rotation and reuse detection';
COMMENT ON TABLE sessions IS 'Active user sessions for device management';
COMMENT ON TABLE user_sessions IS 'Enhanced session tracking with device metadata';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';
COMMENT ON TABLE failed_login_attempts IS 'Failed login tracking for brute force detection';
COMMENT ON TABLE mfa_secrets IS 'TOTP secrets and backup codes for two-factor authentication';
COMMENT ON TABLE roles IS 'User roles for RBAC system';
COMMENT ON TABLE permissions IS 'Granular permissions for access control';
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON TABLE backups IS 'Database backup records and metadata';
COMMENT ON TABLE system_settings IS 'Global system configuration settings';
