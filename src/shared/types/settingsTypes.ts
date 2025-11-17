export interface NotificationSettings {
  email_notifications: boolean;
  device_alerts: boolean;
  security_alerts: boolean;
  maintenance_alerts: boolean;
  system_alerts: boolean;
  compliance_alerts: boolean;
  audit_alerts: boolean;
  emergency_alerts: boolean;
}

export interface SecuritySettings {
  full_name: string;
  two_factor_auth: boolean;
  session_timeout: number;
  password_expiration: number;
  max_login_attempts: number;
  account_lockout_duration: number;
  require_password_change: boolean;
  enable_biometric_auth: boolean;
  suspicious_activity_monitoring: boolean;
}

export interface AuditSettings {
  enable_audit_logging: boolean;
  log_failed_logins: boolean;
  log_data_access: boolean;
  log_system_changes: boolean;
  log_export_activities: boolean;
  retention_period: number;
  enable_real_time_monitoring: boolean;
}

export interface AccessControlSettings {
  ip_whitelist_enabled: boolean;
  allowed_ip_ranges: string[];
  location_restrictions: boolean;
  device_registration_required: boolean;
  max_concurrent_sessions: number;
  require_supervisor_approval: boolean;
}

export interface ComplianceSettings {
  data_classification_level:
    | "public"
    | "internal"
    | "confidential"
    | "restricted"
    | "top_secret";
  gdpr_compliance: boolean;
  hipaa_compliance: boolean;
  sox_compliance: boolean;
  data_retention_days: number;
  auto_delete_expired_data: boolean;
  encryption_level: "standard" | "high" | "military_grade";
}

export interface BackupSettings {
  automatic_backup: boolean;
  backup_frequency: "daily" | "weekly" | "monthly";
  backup_encryption: boolean;
  offsite_backup: boolean;
  backup_retention_days: number;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AccountSettings {
  full_name: string;
  email: string;
  employee_id: string;
  department: string;
  security_clearance_level: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface SecurityQuestion {
  question: string;
  answer: string;
}

export type SettingsTab =
  | "notifications"
  | "security"
  | "account"
  | "audit"
  | "access"
  | "compliance"
  | "backup"
  | "devices";
