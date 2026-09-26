-- Migration: Add Microsoft Teams OTP Authentication tables
-- Run this after the base schema.sql

-- ===================================================================
-- PENDING_REGISTRATIONS: Store pending user registrations before OTP verification
-- ===================================================================
CREATE TABLE IF NOT EXISTS pending_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(140) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department_id INT NULL,
    title VARCHAR(120) DEFAULT 'Employee',
    registration_data JSON,
    otp_hash VARCHAR(255) NOT NULL,
    otp_expires_at DATETIME NOT NULL,
    otp_attempts INT NOT NULL DEFAULT 0,
    max_otp_attempts INT NOT NULL DEFAULT 5,
    requested_ip VARCHAR(45),
    user_agent TEXT,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pending_email (email),
    INDEX idx_pending_email (email),
    INDEX idx_pending_expires (otp_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- TEAMS_USERS: Map application users to Microsoft Teams identities
-- ===================================================================
CREATE TABLE IF NOT EXISTS teams_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    teams_user_id VARCHAR(255) NOT NULL COMMENT 'Microsoft Teams user ID (AAD Object ID)',
    tenant_id VARCHAR(255) NOT NULL COMMENT 'Microsoft Entra Tenant ID',
    conversation_id VARCHAR(255) NOT NULL COMMENT 'Teams conversation ID for proactive messaging',
    service_url VARCHAR(500) NOT NULL COMMENT 'Teams service URL endpoint',
    conversation_reference JSON NOT NULL COMMENT 'Full conversation reference for Bot Framework',
    app_installed BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether user has installed the Teams app',
    connected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at DATETIME NULL,
    UNIQUE KEY uq_teams_user_id (teams_user_id),
    UNIQUE KEY uq_user_id (user_id),
    INDEX idx_teams_user_id (teams_user_id),
    INDEX idx_tenant_id (tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- LOGIN_OTP_REQUESTS: Track login OTP requests for rate limiting and security
-- ===================================================================
CREATE TABLE IF NOT EXISTS login_otp_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(180) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    otp_expires_at DATETIME NOT NULL,
    otp_attempts INT NOT NULL DEFAULT 0,
    max_otp_attempts INT NOT NULL DEFAULT 5,
    verified_at DATETIME NULL,
    requested_ip VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_email (email),
    INDEX idx_login_user_id (user_id),
    INDEX idx_login_expires (otp_expires_at),
    INDEX idx_login_requested_ip (requested_ip),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- AUDIT_LOGS: Security audit trail for authentication events
-- ===================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(180) NULL,
    event VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'success, failed, blocked',
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_email (email),
    INDEX idx_audit_event (event),
    INDEX idx_audit_status (status),
    INDEX idx_audit_created_at (created_at),
    INDEX idx_audit_ip (ip_address),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- OTP_RATE_LIMITS: Track OTP request rates per email and IP
-- ===================================================================
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(180) NULL,
    ip_address VARCHAR(45) NOT NULL,
    request_type VARCHAR(20) NOT NULL COMMENT 'registration, login, resend',
    request_count INT NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    window_end DATETIME NOT NULL,
    blocked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rate_limit (email, ip_address, request_type, window_start),
    INDEX idx_rate_email (email),
    INDEX idx_rate_ip (ip_address),
    INDEX idx_rate_window (window_end),
    INDEX idx_rate_blocked (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- Update users table: Add email_verified and status columns if not exist
-- ===================================================================
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'pending, active, suspended, disabled';

-- ===================================================================
-- Add indexes for users table if not exist
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- ===================================================================
-- Optional: Update existing OTPs table to use hashed OTPs (migration note)
-- The existing otps table stores plaintext OTPs. 
-- For security, consider migrating to hashed OTPs or using the new login_otp_requests table.
-- ===================================================================