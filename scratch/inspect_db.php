<?php
require_once __DIR__ . '/../php-server/config/database.php';
try {
    $pdo = Database::getConnection();
    echo "Connected to DB!\n\nExisting tables:\n";
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    print_r($tables);

    echo "\nColumns in audit_logs table:\n";
    $cols = $pdo->query('DESCRIBE audit_logs')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "{$c['Field']} - {$c['Type']} - Null: {$c['Null']} - Default: {$c['Default']}\n";
    }

    echo "\nExisting roles:\n";
    $roles = $pdo->query('SELECT id, role_name, name, description FROM roles')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($roles as $r) {
        echo "ID: {$r['id']} | role_name: {$r['role_name']} | name: {$r['name']} | desc: {$r['description']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
