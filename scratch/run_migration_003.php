<?php
require_once __DIR__ . '/../php-server/config/database.php';

try {
    $pdo = Database::getConnection();
    echo "Running migration 003_entra_id_auth.sql...\n";

    // Safe column check and addition
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('entra_id', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN entra_id VARCHAR(255) NULL AFTER email");
        echo "Added column entra_id\n";
    } else {
        echo "Column entra_id already exists\n";
    }

    if (!in_array('entra_tenant_id', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN entra_tenant_id VARCHAR(255) NULL AFTER entra_id");
        echo "Added column entra_tenant_id\n";
    } else {
        echo "Column entra_tenant_id already exists\n";
    }

    if (!in_array('auth_provider', $cols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local' AFTER entra_tenant_id");
        echo "Added column auth_provider\n";
    } else {
        echo "Column auth_provider already exists\n";
    }

    // Index check
    $indexes = $pdo->query("SHOW INDEX FROM users WHERE Key_name = 'idx_users_entra_id'")->fetchAll();
    if (empty($indexes)) {
        $pdo->exec("CREATE INDEX idx_users_entra_id ON users (entra_id)");
        echo "Created index idx_users_entra_id\n";
    } else {
        echo "Index idx_users_entra_id already exists\n";
    }

    // Audit logs columns check and addition
    $auditCols = $pdo->query("SHOW COLUMNS FROM audit_logs")->fetchAll(PDO::FETCH_COLUMN);

    // Make user_id nullable for audit_logs
    $pdo->exec("ALTER TABLE audit_logs MODIFY COLUMN user_id INT(11) NULL");

    if (!in_array('email', $auditCols, true)) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN email VARCHAR(180) NULL AFTER user_id");
        echo "Added column email to audit_logs\n";
    }

    if (!in_array('event', $auditCols, true)) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN event VARCHAR(64) NULL AFTER email");
        echo "Added column event to audit_logs\n";
    }

    if (!in_array('status', $auditCols, true)) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) NULL AFTER event");
        echo "Added column status to audit_logs\n";
    }

    if (!in_array('metadata', $auditCols, true)) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN metadata JSON NULL AFTER user_agent");
        echo "Added column metadata to audit_logs\n";
    }

    echo "\nVerification of users table columns:\n";
    $updatedCols = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($updatedCols as $c) {
        echo "{$c['Field']} - {$c['Type']} - Null: {$c['Null']} - Default: {$c['Default']}\n";
    }

    echo "\nMigration 003 completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
