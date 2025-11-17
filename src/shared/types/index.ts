//src types/index.js

import type { UUID } from "crypto";

// Device Types
export interface Device {
  id: number;
  hostname: string;
  last_seen: string;
  first_seen: string;
  platform: string;
  os_version: string;
  os_build: string;
  os_product_name: string;
  model: string;
  manufacturer: string;
  type: string;
  chassis: string;
  local_ip: string;
  domain: string;
  mac_address: string;
  cpu_id: string;
  serial_number: string;
  location: string;
  room_or_floor: string;
  assigned_to: string;
  previous_owner: string;
  transfer_date: string;
  transfer_reason: string;
  transfer_department: string;
  transfer_location: string;
  transfer_room_or_floor: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceTransfer {
  id: string;
  device_id: string;
  previous_owner?: string;
  assigned_to: string;
  location?: string;
  room_or_floor?: string;
  transfer_department?: string;
  transfer_location: string;
  transfer_room_or_floor?: string;
  transfer_date: string;
  transfer_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  description_name_of_building: string;
  building_ownership?: string;
  category?: string;
  building_no?: string;
  institution_no?: string;

  // Location fields
  nearest_town_shopping_centre?: string;
  street?: string;
  county?: string;
  sub_county?: string;
  division?: string;
  location?: string;
  sub_location?: string;

  // Land and ownership
  lr_no?: string;
  size_of_land_ha?: number;
  ownership_status?: string;
  source_of_funds?: string;
  mode_of_acquisition?: string;
  date_of_purchase_or_commissioning?: string;

  // Building specifications
  type_of_building?: string;
  designated_use?: string;
  estimated_useful_life?: number;
  no_of_floors?: number;
  plinth_area?: number;

  // Financial fields
  cost_of_construction_or_valuation?: number;
  annual_depreciation?: number;
  accumulated_depreciation_to_date?: number;
  net_book_value?: number;
  annual_rental_income?: number;

  // Additional information
  remarks?: string;

  created_at?: string;
  updated_at?: string;
}

export interface BuildingType {
  id: string;
  description_name_of_building: string;
  building_ownership?: string;
  category?: string;
  building_no?: string;
  institution_no?: string;

  // Location fields
  nearest_town_shopping_centre?: string;
  street?: string;
  county?: string;
  sub_county?: string;
  division?: string;
  location?: string;
  sub_location?: string;

  // Land and ownership
  lr_no?: string;
  size_of_land_ha?: number;
  ownership_status?: string;
  source_of_funds?: string;
  mode_of_acquisition?: string;
  date_of_purchase_or_commissioning?: string;

  // Building specifications
  type_of_building?: string;
  designated_use?: string;
  estimated_useful_life?: number;
  no_of_floors?: number;
  plinth_area?: number;

  // Financial fields
  cost_of_construction_or_valuation?: number;
  annual_depreciation?: number;
  accumulated_depreciation_to_date?: number;
  net_book_value?: number;
  annual_rental_income?: number;

  // Additional information
  remarks?: string;
  support_files?: string | string[] | null;

  created_at?: string;
  updated_at?: string;
}

export interface OfficeEquipment {
  id: UUID;
  asset_description: string;
  financed_by?: string;
  serial_number?: string;
  tag_number?: string;
  make_model?: string;

  // Dates and delivery
  date_of_delivery?: string;
  pv_number?: string;

  // Location tracking
  original_location?: string;
  current_location?: string;
  replacement_date?: string;

  // Financial information
  purchase_amount?: number;
  depreciation_rate?: number;
  annual_depreciation?: number;
  accumulated_depreciation?: number;
  net_book_value?: number;

  // Disposal information
  date_of_disposal?: string;
  disposal_value?: number;

  // Management
  responsible_officer?: string;
  asset_condition?: string;
  notes?: string;

  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  chassis_number?: string;
  engine_number?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity?: string;
  acquisition_date?: string;
  owner?: string;
  valuation?: number;
  created_at?: string;
  updated_at: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  deactivation_reason?: string;
  deactivated_at?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  mfa_enabled?: boolean;
  csrf_token?: string;
  session_id?: string;
  session_expires_at?: string;
}

// Utility to add `name` dynamically
export const getFullName = (user: User): string => {
  return `${user.first_name} ${user.last_name}`.trim();
};

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  VIEWER = "viewer",
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  timestamp: string;
  ip_address?: string;
  user?: User;
}

// Dashboard Types
export interface DashboardStats {
  total_devices: number;
  active_devices: number;
  inactive_devices: number;
  new_devices: number;
  devices_by_type: Record<string, number>;
  devices_by_os: Record<string, number>;
  device_activity: Array<{ date: string; count: number }>;
  recent_devices: Device[];
}

// Permission and security types for asset category access control
export enum AssetCategoryType {
  DEVICES = "devices",
  LAND_REGISTER = "land_register",
  BUILDINGS_REGISTER = "buildings_register",
  MOTOR_VEHICLES_REGISTER = "motor_vehicles_register",
  OFFICE_EQUIPMENT = "office_equipment",
  FURNITURE_FITTINGS_EQUIPMENT = "furniture_fittings_equipment",
  PLANT_MACHINERY = "plant_machinery",
  PORTABLE_ATTRACTIVE_ITEMS = "portable_attractive_items",
  ICT_ASSETS = "ict_assets",
}

export enum PermissionLevel {
  NONE = "none",
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

export interface AssetCategoryPermission {
  id: string;
  user_id: string;
  category: AssetCategoryType;
  permission_level: PermissionLevel;
  is_active: boolean;
  reason?: string;
  notes?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  user_id: string;
  username: string;
  email: string;
  role: string;
  permissions: Record<
    string,
    {
      has_access: boolean;
      permission_level: string;
      can_read: boolean;
      can_write: boolean;
      can_admin: boolean;
      expires_at?: string;
    }
  >;
}

export interface PermissionCreateRequest {
  user_id: string;
  category: AssetCategoryType;
  permission_level: PermissionLevel;
  reason?: string;
  notes?: string;
  expires_at?: string;
}

export interface BulkPermissionUpdate {
  user_id: string;
  permissions: Array<{
    category: AssetCategoryType;
    permission_level: PermissionLevel;
  }>;
}

// Supervisor Permission Types
export interface SupervisorPermission {
  id: string;
  supervisor_id: string;
  subordinate_id: string;
  can_approve_transfers: boolean;
  can_verify_data: boolean;
  can_manage_subordinate_permissions: boolean;
  can_view_audit_logs: boolean;
  can_override_restrictions: boolean;
  can_view_subordinate_assets: boolean;
  is_active: boolean;
  reason?: string;
  notes?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  supervisor?: User;
  subordinate?: User;
}

export interface SupervisorPermissionCreateRequest {
  supervisor_id: string;
  subordinate_id: string;
  can_approve_transfers?: boolean;
  can_verify_data?: boolean;
  can_manage_subordinate_permissions?: boolean;
  can_view_audit_logs?: boolean;
  can_override_restrictions?: boolean;
  can_view_subordinate_assets?: boolean;
  reason?: string;
  notes?: string;
  expires_at?: string;
}

export interface SupervisorPermissionUpdateRequest {
  can_approve_transfers?: boolean;
  can_verify_data?: boolean;
  can_manage_subordinate_permissions?: boolean;
  can_view_audit_logs?: boolean;
  can_override_restrictions?: boolean;
  can_view_subordinate_assets?: boolean;
  is_active?: boolean;
  reason?: string;
  notes?: string;
  expires_at?: string;
}

export interface SupervisorPermissionResponse {
  id: string;
  supervisor_id: string;
  subordinate_id: string;
  supervisor_name: string;
  subordinate_name: string;
  can_approve_transfers: boolean;
  can_verify_data: boolean;
  can_manage_subordinate_permissions: boolean;
  can_view_audit_logs: boolean;
  can_override_restrictions: boolean;
  can_view_subordinate_assets: boolean;
  is_active: boolean;
  reason?: string;
  notes?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Asset Data Approval Types
export enum AssetDataApprovalStatus {
  PENDING_REVIEW = "pending_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  REQUIRES_CHANGES = "requires_changes",
  CANCELLED = "cancelled",
}

export enum AssetDataApprovalType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  TRANSFER = "transfer",
}

export interface AssetDataApproval {
  id: string;
  requester_id: string;
  supervisor_id?: string;
  asset_category: string;
  asset_id: string;
  asset_identifier?: string;
  approval_type: AssetDataApprovalType;
  status: AssetDataApprovalStatus;
  original_data?: Record<string, any>;
  proposed_data: Record<string, any>;
  changes_summary?: string;
  review_notes?: string;
  rejection_reason?: string;
  requires_changes_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  auto_approved: boolean;
  auto_approval_reason?: string;
  business_justification?: string;
  urgency_level: string;
  created_at: string;
  updated_at: string;
}

export interface AssetDataApprovalWithDetails extends AssetDataApproval {
  requester_name?: string;
  supervisor_name?: string;
  reviewer_name?: string;
}

export interface AssetDataApprovalCreateRequest {
  asset_category: string;
  asset_id: string;
  asset_identifier?: string;
  approval_type: AssetDataApprovalType;
  original_data?: Record<string, any>;
  proposed_data: Record<string, any>;
  changes_summary?: string;
  business_justification?: string;
  urgency_level?: string;
}

export interface AssetDataApprovalUpdateRequest {
  status: AssetDataApprovalStatus;
  review_notes?: string;
  rejection_reason?: string;
  requires_changes_notes?: string;
}

export interface AssetDataApprovalSummary {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_requires_changes: number;
  by_category: Record<string, number>;
  by_urgency: Record<string, number>;
}

export interface SupervisorPendingApprovals {
  supervisor_id: string;
  supervisor_name: string;
  pending_approvals: AssetDataApprovalWithDetails[];
  total_pending: number;
}
