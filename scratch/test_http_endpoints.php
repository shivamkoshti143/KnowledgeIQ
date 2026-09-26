<?php
// scratch/test_http_endpoints.php

function httpReq(string $method, string $url, ?array $body = null, ?string $token = null): array {
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER         => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT        => 10
    ]);

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headerStr = substr($raw, 0, $headerSize);
    $bodyStr = substr($raw, $headerSize);
    curl_close($ch);

    return [
        'code'    => $httpCode,
        'headers' => $headerStr,
        'body'    => $bodyStr,
        'json'    => json_decode($bodyStr, true)
    ];
}

echo "Testing HTTP Endpoints on http://localhost:4001...\n\n";

// 1. GET /api/auth/microsoft
$res = httpReq('GET', 'http://localhost:4001/api/auth/microsoft');
echo "1. GET /api/auth/microsoft: HTTP {$res['code']}\n";
preg_match('/Location:\s*([^\r\n]+)/i', $res['headers'], $loc);
$location = $loc[1] ?? 'None';
echo "   Redirect Location: " . substr($location, 0, 80) . "...\n";
$isCorrectRedirect = ($res['code'] === 302 && str_contains($location, 'login.microsoftonline.com'));
echo "   Check: " . ($isCorrectRedirect ? "PASS" : "FAIL") . "\n\n";

// 2. GET /api/auth/microsoft/callback with error
$res = httpReq('GET', 'http://localhost:4001/api/auth/microsoft/callback?error=access_denied&error_description=The+user+canceled+at+the+external+provider');
echo "2. GET /api/auth/microsoft/callback (cancelled): HTTP {$res['code']}\n";
preg_match('/Location:\s*([^\r\n]+)/i', $res['headers'], $loc);
$location = $loc[1] ?? 'None';
echo "   Redirect Location: " . $location . "\n";
$isCorrectCancelRedirect = ($res['code'] === 302 && str_contains($location, 'error=Microsoft+sign-in+was+cancelled'));
echo "   Check: " . ($isCorrectCancelRedirect ? "PASS" : "FAIL") . "\n\n";

// 3. GET /api/auth/microsoft/callback with invalid state
$res = httpReq('GET', 'http://localhost:4001/api/auth/microsoft/callback?code=some-code&state=invalid-tampered-state');
echo "3. GET /api/auth/microsoft/callback (invalid state): HTTP {$res['code']}\n";
preg_match('/Location:\s*([^\r\n]+)/i', $res['headers'], $loc);
$location = $loc[1] ?? 'None';
echo "   Redirect Location: " . $location . "\n";
$isStateProtected = ($res['code'] === 302 && str_contains($location, 'error='));
echo "   Check: " . ($isStateProtected ? "PASS" : "FAIL") . "\n\n";

// 4. POST /api/auth/signup (Manual Registration)
$testRegEmail = "auto.signup.tester." . uniqid() . "@abmindia.com";
$res = httpReq('POST', 'http://localhost:4001/api/auth/signup', [
    'name' => 'Auto Signup Tester',
    'email' => $testRegEmail,
    'password' => 'SecurePass123!',
    'departmentId' => 2,
    'title' => 'Software Engineer'
]);
echo "4. POST /api/auth/signup: HTTP {$res['code']}\n";
echo "   Response: " . substr($res['body'], 0, 100) . "\n";
$isSignupSuccess = ($res['code'] === 200 && !empty($res['json']['token']));
echo "   Check: " . ($isSignupSuccess ? "PASS" : "FAIL") . "\n\n";

$jwtToken = $res['json']['token'] ?? null;
$createdUserId = $res['json']['user']['id'] ?? null;

// 5. GET /api/auth/me (Protected Route with JWT)
if ($jwtToken) {
    $res = httpReq('GET', 'http://localhost:4001/api/auth/me', null, $jwtToken);
    echo "5. GET /api/auth/me (Authenticated): HTTP {$res['code']}\n";
    $isMeSuccess = ($res['code'] === 200 && ($res['json']['email'] ?? '') === $testRegEmail);
    echo "   User email in /me: " . ($res['json']['email'] ?? 'None') . "\n";
    echo "   User role in /me: " . ($res['json']['role'] ?? 'None') . " (role_id: " . ($res['json']['role_id'] ?? 'None') . ")\n";
    echo "   Check: " . ($isMeSuccess ? "PASS" : "FAIL") . "\n\n";
}

// 6. POST /api/auth/login (Manual Login with correct credentials)
$res = httpReq('POST', 'http://localhost:4001/api/auth/login', [
    'email' => $testRegEmail,
    'password' => 'SecurePass123!'
]);
echo "6. POST /api/auth/login (Correct Password): HTTP {$res['code']}\n";
$isLoginSuccess = ($res['code'] === 200 && !empty($res['json']['token']));
echo "   Check: " . ($isLoginSuccess ? "PASS" : "FAIL") . "\n\n";

// 7. POST /api/auth/login (Wrong Password)
$res = httpReq('POST', 'http://localhost:4001/api/auth/login', [
    'email' => $testRegEmail,
    'password' => 'TotallyWrongPassword'
]);
echo "7. POST /api/auth/login (Wrong Password): HTTP {$res['code']}\n";
$isLoginRejected = ($res['code'] === 401);
echo "   Check: " . ($isLoginRejected ? "PASS" : "FAIL") . "\n\n";

// 8. POST /api/auth/logout
$res = httpReq('POST', 'http://localhost:4001/api/auth/logout', null, $jwtToken);
echo "8. POST /api/auth/logout: HTTP {$res['code']}\n";
$isLogoutSuccess = ($res['code'] === 200 && ($res['json']['success'] ?? false) === true);
echo "   Check: " . ($isLogoutSuccess ? "PASS" : "FAIL") . "\n\n";

// Clean up test user
if ($createdUserId) {
    require_once __DIR__ . '/../php-server/config/database.php';
    $pdo = Database::getConnection();
    $pdo->exec("DELETE FROM users WHERE id = $createdUserId");
    echo "Cleaned up test user ID: $createdUserId\n";
}

echo "\nAll HTTP endpoint checks complete!\n";
