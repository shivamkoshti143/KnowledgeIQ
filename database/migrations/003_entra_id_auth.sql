-- Migration 003: Add Microsoft Entra ID Authentication Columns
-- Safe, additive migration only. Does NOT drop or recreate any tables.
-- Preserves all existing users, roles, permissions, and Teams historical data.

-- 1. Add entra_id, entra_tenant_id, and auth_provider columns if they do not exist
SET @dbname = DATABASE();
SET @tablename = "users";

-- Add entra_id
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = "entra_id")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN entra_id VARCHAR(255) NULL AFTER email;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add entra_tenant_id
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = "entra_tenant_id")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN entra_tenant_id VARCHAR(255) NULL AFTER entra_id;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add auth_provider
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = "auth_provider")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local' AFTER entra_tenant_id;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Add index on entra_id if it does not exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = "idx_users_entra_id")
  ) > 0,
  "SELECT 1",
  "CREATE INDEX idx_users_entra_id ON users (entra_id);"
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- 3. Add authentication logging columns to audit_logs if not present
SET @tablename_audit = "audit_logs";

-- Make user_id nullable for pre-auth events
ALTER TABLE audit_logs MODIFY COLUMN user_id INT(11) NULL;

-- Add email
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename_audit)
      AND (table_schema = @dbname)
      AND (column_name = "email")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE audit_logs ADD COLUMN email VARCHAR(180) NULL AFTER user_id;"
));
PREPARE alterAuditEmail FROM @preparedStatement;
EXECUTE alterAuditEmail;
DEALLOCATE PREPARE alterAuditEmail;

-- Add event
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename_audit)
      AND (table_schema = @dbname)
      AND (column_name = "event")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE audit_logs ADD COLUMN event VARCHAR(64) NULL AFTER email;"
));
PREPARE alterAuditEvent FROM @preparedStatement;
EXECUTE alterAuditEvent;
DEALLOCATE PREPARE alterAuditEvent;

-- Add status
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename_audit)
      AND (table_schema = @dbname)
      AND (column_name = "status")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) NULL AFTER event;"
));
PREPARE alterAuditStatus FROM @preparedStatement;
EXECUTE alterAuditStatus;
DEALLOCATE PREPARE alterAuditStatus;

-- Add metadata
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename_audit)
      AND (table_schema = @dbname)
      AND (column_name = "metadata")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE audit_logs ADD COLUMN metadata JSON NULL AFTER user_agent;"
));
PREPARE alterAuditMetadata FROM @preparedStatement;
EXECUTE alterAuditMetadata;
DEALLOCATE PREPARE alterAuditMetadata;

