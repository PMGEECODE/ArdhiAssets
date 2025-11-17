/*
  # Password Change Tracking Migration (DEPRECATED - Merged into 001)
  
  This migration has been merged into 001_init_auth_schema.sql
  to align with the User model definition.
  
  Fields now created directly in users table:
  - password_changed_at
  - requires_password_change  
  - previous_password_hash
*/

-- This file is kept for reference but all changes are in 001_init_auth_schema.sql
-- No additional migrations needed as the schema is complete.
-- If you need to create a new migration, please create a new file with the next sequence number.