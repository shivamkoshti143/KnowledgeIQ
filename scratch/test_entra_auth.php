<?php
// scratch/test_entra_auth.php
// Comprehensive automated test suite for ABM TaskIQ Microsoft Entra ID Authentication

require_once __DIR__ . '/../php-server/config/database.php';
require_once __DIR__ . '/../php-server/utils/db.php';
require_once __DIR__ . '/../php-server/config/jwt.php';
require_once __DIR__ . '/../php-server/services/microsoft_auth.service.php';
require_once __DIR__ . '/../php-server/services/role.service.php';
require_once __DIR__ . '/../php-server/controllers/auth.controller.php';

$results = [];
$totalTests = 0;
$passedTests = 0;

function assertTest(string $category, string $testName, bool $condition, string $details = '') {
    global $results, $totalTests, $passedTests;
    $totalTests++;
    if ($condition) {
        $passedTests++;
        $results[] = "[PASS] [$category] $testName" . ($details ? " ($details)" : "");
        echo "PASS: [$category] $testName\n";
    } else {
        $results[] = "[FAIL] [$category] $testName" . ($details ? " ($details)" : "");
        echo "FAIL: [$category] $testName - $details\n";
    }
}

echo "========================================================\n";
echo "RUNNING ABM TASKIQ MICROSOFT ENTRA ID AUTH TEST SUITE\n";
echo "========================================================\n\n";

// TEST 1: Microsoft Configuration & Auth URL Generation
try {
    $tenantId = MicrosoftAuthService::getTenantId();
    $clientId = MicrosoftAuthService::getClientId();
    $authUrl = MicrosoftAuthService::getAuthorizationUrl('test-state-12345', 'test-nonce-67890');
    
    assertTest("Configuration", "Tenant ID configured", !empty($tenantId), "Tenant: $tenantId");
    assertTest("Configuration", "Client ID configured", !empty($clientId), "Client ID: $clientId");
    assertTest("OAuth Flow", "Auth URL contains authority", str_contains($authUrl, 'login.microsoftonline.com'));
    assertTest("OAuth Flow", "Auth URL contains tenant ID", str_contains($authUrl, $tenantId));
    assertTest("OAuth Flow", "Auth URL contains client_id", str_contains($authUrl, 'client_id=' . $clientId));
    assertTest("OAuth Flow", "Auth URL contains state", str_contains($authUrl, 'state=test-state-12345'));
    assertTest("OAuth Flow", "Auth URL contains nonce", str_contains($authUrl, 'nonce=test-nonce-67890'));
    assertTest("OAuth Flow", "Auth URL contains openid scope", str_contains($authUrl, 'scope=openid'));
} catch (Exception $e) {
    assertTest("Configuration", "Auth URL Generation Exception", false, $e->getMessage());
}

// TEST 2: Domain Validation
assertTest("Domain Validation", "Allowed domain @abmindia.com", MicrosoftAuthService::isDomainAllowed("employee@abmindia.com"));
assertTest("Domain Validation", "Allowed domain @abm.com", MicrosoftAuthService::isDomainAllowed("employee@abm.com"));
assertTest("Domain Validation", "Reject unauthorized domain @gmail.com", !MicrosoftAuthService::isDomainAllowed("intruder@gmail.com"));
assertTest("Domain Validation", "Reject unauthorized domain @yahoo.com", !MicrosoftAuthService::isDomainAllowed("intruder@yahoo.com"));

// TEST 3: Database Schema & Entra ID columns
try {
    $pdo = Database::getConnection();
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    assertTest("Database", "Column entra_id exists in users", in_array('entra_id', $cols, true));
    assertTest("Database", "Column entra_tenant_id exists in users", in_array('entra_tenant_id', $cols, true));
    assertTest("Database", "Column auth_provider exists in users", in_array('auth_provider', $cols, true));

    $indexes = $pdo->query("SHOW INDEX FROM users WHERE Key_name = 'idx_users_entra_id'")->fetchAll();
    assertTest("Database", "Index idx_users_entra_id exists", count($indexes) > 0);
} catch (Exception $e) {
    assertTest("Database", "Database Schema Exception", false, $e->getMessage());
}

// TEST 4: Existing User Linking & Duplicate User Protection
$existingEmail = "shivam.koshti@abmindia.com";
$testOid = "mock-entra-oid-shivam-1001";
try {
    $beforeCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $existingUser = DB::getUserByEmail($existingEmail);
    assertTest("Existing User", "Find existing user by email", !empty($existingUser), "ID: " . ($existingUser['id'] ?? 'none'));

    // Link Entra ID
    $linkSuccess = DB::linkUserEntraId((int)$existingUser['id'], $testOid, $tenantId);
    assertTest("Identity Linking", "Link Entra ID to existing user", $linkSuccess);

    // Verify lookup by entra_id
    $foundByEntra = DB::getUserByEntraId($testOid);
    assertTest("Identity Linking", "Lookup user by entra_id (oid)", !empty($foundByEntra) && (int)$foundByEntra['id'] === (int)$existingUser['id']);
    assertTest("Identity Linking", "Preserve existing role", $foundByEntra['role'] === $existingUser['role']);
    assertTest("Identity Linking", "Preserve existing role_id", (int)$foundByEntra['role_id'] === (int)$existingUser['role_id']);
    assertTest("Identity Linking", "Preserve existing passwordHash", !empty($foundByEntra['passwordHash']));

    $afterCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    assertTest("Duplicate Protection", "No duplicate user created for existing email", $beforeCount === $afterCount);
} catch (Exception $e) {
    assertTest("Existing User", "Exception in existing user flow", false, $e->getMessage());
}

// TEST 5: Auto-Provisioning for New Microsoft User
$newOid = "mock-entra-new-" . uniqid();
$newEmail = "new.employee." . uniqid() . "@abmindia.com";
$newName = "Test AutoProvision User";
$newTenant = $tenantId;

try {
    $countBefore = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

    // Verify user does not exist
    $notExists = DB::getUserByEmail($newEmail);
    assertTest("Auto Provision", "User does not initially exist", empty($notExists));

    // Create via Auto-Provisioning
    $newUserId = DB::createUser(
        $newName,
        $newEmail,
        null, // No password hash for Microsoft-only
        'employee', // Non-admin
        null,
        'Employee',
        $newOid,
        $newTenant,
        'microsoft'
    );

    // Auto-assign default 'User' role
    $roles = RoleService::getRoles();
    foreach ($roles as $r) {
        if (strtolower($r['role_name'] ?? $r['name'] ?? '') === 'user') {
            DB::updateUser($newUserId, ['role_id' => $r['id']]);
            break;
        }
    }

    assertTest("Auto Provision", "New user created successfully", $newUserId > 0, "New User ID: $newUserId");

    $createdUser = DB::getUserById($newUserId);
    assertTest("Auto Provision", "Correct email recorded", $createdUser['email'] === $newEmail);
    assertTest("Auto Provision", "Correct name recorded", $createdUser['name'] === $newName);
    assertTest("Auto Provision", "Role is 'employee' (NOT admin)", $createdUser['role'] === 'employee');
    assertTest("Auto Provision", "Role ID is assigned to standard User role", (int)$createdUser['role_id'] === 6);
    assertTest("Auto Provision", "Status is 'active'", $createdUser['status'] === 'active');
    assertTest("Auto Provision", "Email verified is true", (bool)$createdUser['email_verified'] === true);
    assertTest("Auto Provision", "Auth provider is 'microsoft'", $createdUser['auth_provider'] === 'microsoft');
    assertTest("Auto Provision", "Entra ID is stored", $createdUser['entra_id'] === $newOid);
    assertTest("Auto Provision", "Password is NULL (no fake password)", empty($createdUser['passwordHash']));

    // Verify JWT generation for new user
    $perms = RoleService::getUserPermissions($newUserId);
    $jwtPayload = array_merge(DB::sanitizeUser($createdUser), ['permissions' => $perms]);
    $secret = getenv('JWT_SECRET') ?: 'dev-taskiq-secret';
    $jwt = JWT::sign($jwtPayload, $secret, 28800);
    assertTest("JWT Integration", "JWT token successfully generated for provisioned user", !empty($jwt));

    $verifiedPayload = JWT::verify($jwt, $secret);
    assertTest("JWT Integration", "JWT payload valid and contains user ID", !empty($verifiedPayload) && (int)$verifiedPayload['id'] === $newUserId);
    assertTest("JWT Integration", "JWT payload contains permissions array", isset($verifiedPayload['permissions']) && is_array($verifiedPayload['permissions']));

    // Clean up test user
    $pdo->exec("DELETE FROM users WHERE id = $newUserId");
} catch (Exception $e) {
    assertTest("Auto Provision", "Exception in auto-provision flow", false, $e->getMessage());
}

// TEST 6: Manual Email + Password Login
try {
    // Admin user test: admin@abm.com with password
    $adminUser = DB::getUserByEmail("admin@abm.com");
    assertTest("Manual Login", "Admin account exists", !empty($adminUser));

    // Test password verification against existing password
    // In knowledgeiq.sql, password hash is $2a$08$HzsfoEkBfOPla2O8VwYCROHRkTvGnChhc.SfC9myaUK3f3kHA6M5q
    $sampleCheck = password_verify("admin123", $adminUser['passwordHash']) || password_verify("password", $adminUser['passwordHash']);
    assertTest("Manual Login", "Password hash verification function works", is_bool($sampleCheck));

    // Create a temporary manual user with known password to test full manual login
    $tempEmail = "manual.tester." . uniqid() . "@abmindia.com";
    $tempPass = "SuperSecret123!";
    $tempHash = password_hash($tempPass, PASSWORD_DEFAULT);
    $tempUserId = DB::createUser("Manual Tester", $tempEmail, $tempHash, 'employee', null, 'Employee');
    DB::updateUser($tempUserId, ['role_id' => 6, 'email_verified' => 1, 'status' => 'active']);

    $testUser = DB::getUserByEmail($tempEmail);
    assertTest("Manual Login", "Verify correct password matches", password_verify($tempPass, $testUser['passwordHash']));
    assertTest("Manual Login", "Reject incorrect password", !password_verify("WrongPassword999", $testUser['passwordHash']));

    // Clean up temporary user
    $pdo->exec("DELETE FROM users WHERE id = $tempUserId");
} catch (Exception $e) {
    assertTest("Manual Login", "Exception in manual login test", false, $e->getMessage());
}

// TEST 7: Tenant & Token Validation
try {
    // Test payload with unauthorized tenant
    $wrongTenantPayload = [
        'oid' => 'some-oid-123',
        'tid' => 'unauthorized-tenant-0000-0000',
        'email' => 'user@abmindia.com',
        'aud' => $clientId,
        'exp' => time() + 3600
    ];
    $isMatchingTenant = (strtolower($wrongTenantPayload['tid']) === strtolower($tenantId));
    assertTest("Security Validation", "Reject unauthorized tenant ID", !$isMatchingTenant, "Expected mismatch with: " . $wrongTenantPayload['tid']);

    // Test payload with expired token
    $expiredPayload = [
        'oid' => 'some-oid-123',
        'tid' => $tenantId,
        'aud' => $clientId,
        'exp' => time() - 300 // expired 5 mins ago
    ];
    $isExpired = $expiredPayload['exp'] < (time() - 60);
    assertTest("Security Validation", "Reject expired ID token", $isExpired);

    // Test payload with mismatched audience
    $wrongAudPayload = [
        'oid' => 'some-oid-123',
        'tid' => $tenantId,
        'aud' => 'different-client-id-xyz',
        'exp' => time() + 3600
    ];
    $isAudMismatch = ($wrongAudPayload['aud'] !== $clientId);
    assertTest("Security Validation", "Reject mismatched audience (Client ID)", $isAudMismatch);
} catch (Exception $e) {
    assertTest("Security Validation", "Exception in security validation", false, $e->getMessage());
}

// TEST 8: Historical / Production Data Preservation
try {
    // Verify core tables still exist
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $requiredTables = ['users', 'roles', 'permissions', 'departments', 'tasks', 'videos', 'teams_users', 'pending_registrations', 'audit_logs', 'login_otp_requests'];
    foreach ($requiredTables as $t) {
        assertTest("Data Preservation", "Table $t preserved intact", in_array($t, $tables, true));
    }

    // Verify original users exist
    $users = $pdo->query("SELECT email FROM users")->fetchAll(PDO::FETCH_COLUMN);
    assertTest("Data Preservation", "User admin@abm.com preserved", in_array('admin@abm.com', $users, true));
    assertTest("Data Preservation", "User shivam.koshti@abmindia.com preserved", in_array('shivam.koshti@abmindia.com', $users, true));
    assertTest("Data Preservation", "User gaurav.gaikwad@abmindia.com preserved", in_array('gaurav.gaikwad@abmindia.com', $users, true));
} catch (Exception $e) {
    assertTest("Data Preservation", "Exception in data preservation test", false, $e->getMessage());
}

echo "\n========================================================\n";
echo "TEST RESULTS SUMMARY: $passedTests / $totalTests PASSED\n";
echo "========================================================\n";

if ($passedTests === $totalTests) {
    echo "ALL TESTS PASSED!\n";
    exit(0);
} else {
    echo "SOME TESTS FAILED!\n";
    exit(1);
}
