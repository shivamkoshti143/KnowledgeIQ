<?php
// php-server/controllers/auth.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';
require_once __DIR__ . '/../services/teams.service.php';
require_once __DIR__ . '/../services/microsoft_auth.service.php';

class AuthController {
    private static function getSecret(): string {
        return getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? 'dev-taskiq-secret');
    }

    private static function isValidEmail(string $email): bool {
        $email = strtolower(trim($email));
        $allowedDomains = self::getAllowedDomains();
        foreach ($allowedDomains as $domain) {
            if (str_ends_with($email, '@' . $domain)) {
                return true;
            }
        }
        return false;
    }

    private static function getAllowedDomains(): array {
        $domains = getenv('ALLOWED_EMAIL_DOMAINS') ?: ($_ENV['ALLOWED_EMAIL_DOMAINS'] ?? 'abmindia.com,abm.com');
        return array_map('trim', explode(',', $domains));
    }

    private static function getClientIp(): string {
        $headers = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = trim(explode(',', $_SERVER[$header])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    private static function getUserAgent(): string {
        return $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    }

    // ===================================================================
    // REGISTRATION ENDPOINTS
    // ===================================================================

    /**
     * POST /api/auth/register
     * Start new user registration - sends OTP to Microsoft Teams
     */
    public static function register(): void {
        $input = get_json_input();
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $departmentId = !empty($input['departmentId']) ? (int)$input['departmentId'] : null;
        $title = trim($input['title'] ?? 'Employee');

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        // Input validation
        if (empty($name) || empty($email) || empty($password)) {
            self::auditLog(null, $email, 'REGISTRATION_STARTED', 'failed', $ip, $userAgent, ['reason' => 'missing_fields']);
            error_response("Name, email, and password are required.", 400);
        }

        if (!self::isValidEmail($email)) {
            self::auditLog(null, $email, 'REGISTRATION_STARTED', 'failed', $ip, $userAgent, ['reason' => 'invalid_domain']);
            error_response("Use your company email (@" . implode(', @', self::getAllowedDomains()) . ").", 400);
        }

        // Password validation
        $passwordErrors = self::validatePassword($password);
        if (!empty($passwordErrors)) {
            self::auditLog(null, $email, 'REGISTRATION_STARTED', 'failed', $ip, $userAgent, ['reason' => 'weak_password']);
            error_response(implode(' ', $passwordErrors), 400);
        }

        // Check for existing active user
        $existingUser = DB::getUserByEmail($email);
        if ($existingUser) {
            self::auditLog(null, $email, 'REGISTRATION_STARTED', 'failed', $ip, $userAgent, ['reason' => 'duplicate_user']);
            error_response("An account with this email already exists.", 409);
        }

        // Check for existing pending registration
        $existingPending = DB::getPendingRegistration($email);
        if ($existingPending) {
            DB::deletePendingRegistration((int)$existingPending['id']);
        }

        // Rate limiting
        $rateLimit = DB::checkRateLimit($email, $ip, 'registration');
        if (!$rateLimit['allowed']) {
            self::auditLog(null, $email, 'REGISTRATION_OTP_SENT', 'failed', $ip, $userAgent, ['reason' => 'rate_limited']);
            error_response("Too many registration attempts. Please try again later.", 429);
        }

        // Check resend cooldown
        $cooldown = DB::checkResendCooldown($email, $ip, 'registration');
        if (!$cooldown['allowed']) {
            error_response("Please wait {$cooldown['retry_after']} seconds before requesting another OTP.", 429);
        }

        // Generate fixed OTP (123456)
        $otp = DB::generateSecureOtp(6);
        $otpHash = DB::hashOtp($otp);
        $expiresInMinutes = (int)(getenv('OTP_EXPIRY_MINUTES') ?: ($_ENV['OTP_EXPIRY_MINUTES'] ?? 5));
        $maxAttempts = (int)(getenv('OTP_MAX_ATTEMPTS') ?: ($_ENV['OTP_MAX_ATTEMPTS'] ?? 5));

        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // Create pending registration
        $pendingId = DB::createPendingRegistration(
            $name,
            $email,
            $passwordHash,
            $departmentId,
            $title,
            $otpHash,
            $expiresInMinutes,
            $ip,
            $userAgent
        );

        // Send OTP via Teams if connected
        $teamsUser = TeamsService::getTeamsUserByEmail($email);
        if ($teamsUser && !empty($teamsUser['conversation_reference'])) {
            try {
                $conversationRef = json_decode($teamsUser['conversation_reference'], true);
                TeamsService::sendOtpToTeams($conversationRef, $otp, 'registration');
            } catch (Throwable $te) {
                error_log("[AUTH] Teams send failed: " . $te->getMessage());
            }
        }

        // Update rate limit
        DB::incrementRateLimit($email, $ip, 'registration');

        // Audit log
        self::auditLog(null, $email, 'REGISTRATION_OTP_SENT', 'success', $ip, $userAgent, ['pending_id' => $pendingId]);

        json_response([
            'success' => true,
            'message' => 'Verification code sent.',
            'email' => $email,
            'expiresInMinutes' => $expiresInMinutes
        ]);
    }

    /**
     * POST /api/auth/register/verify-otp
     * Verify OTP and complete registration
     */
    public static function registerVerifyOtp(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));
        $otp = trim($input['otp'] ?? '');

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email) || empty($otp)) {
            self::auditLog(null, $email, 'REGISTRATION_VERIFIED', 'failed', $ip, $userAgent, ['reason' => 'missing_fields']);
            error_response("Email and OTP are required.", 400);
        }

        if (!self::isValidEmail($email)) {
            error_response("Invalid email format.", 400);
        }

        // Find pending registration
        $pending = DB::getPendingRegistration($email);
        if (!$pending) {
            self::auditLog(null, $email, 'REGISTRATION_VERIFIED', 'failed', $ip, $userAgent, ['reason' => 'no_pending']);
            error_response("No pending registration found for this email.", 404);
        }

        // Verify OTP
        $verified = DB::verifyPendingRegistrationOtp($pending['id'], $otp);
        if (!$verified) {
            self::auditLog(null, $email, 'REGISTRATION_VERIFIED', 'failed', $ip, $userAgent, ['reason' => 'invalid_otp', 'attempts' => $pending['otp_attempts'] + 1]);
            error_response("Invalid or expired verification code.", 400);
        }

        // Mark OTP as used
        DB::markPendingRegistrationVerified($pending['id']);

        // Create the actual user account
        $userId = DB::createUser(
            $verified['name'],
            $verified['email'],
            $verified['password_hash'],
            'employee',
            $verified['department_id'],
            $verified['title']
        );

        // Auto-assign default User role
        $roles = RoleService::getRoles();
        foreach ($roles as $r) {
            if (strtolower($r['role_name'] ?? $r['name'] ?? '') === 'user') {
                DB::updateUser($userId, ['role_id' => $r['id']]);
                break;
            }
        }

        // Mark email as verified
        DB::updateUser($userId, ['email_verified' => true, 'status' => 'active']);

        // Get full user with permissions
        $user = DB::getUserById($userId);
        $permissions = RoleService::getUserPermissions($userId);
        $tokenPayload = array_merge($user, ['permissions' => $permissions]);
        $token = JWT::sign($tokenPayload, self::getSecret(), 28800);

        // Audit log
        self::auditLog($userId, $email, 'REGISTRATION_VERIFIED', 'success', $ip, $userAgent, ['user_id' => $userId]);
        self::auditLog($userId, $email, 'REGISTRATION_COMPLETED', 'success', $ip, $userAgent, ['user_id' => $userId]);

        json_response([
            'success' => true,
            'registered' => true,
            'authenticated' => true,
            'message' => 'Account created successfully.',
            'token' => $token,
            'user' => $tokenPayload
        ]);
    }

    /**
     * POST /api/auth/register/resend-otp
     * Resend OTP for registration
     */
    public static function registerResendOtp(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email)) {
            error_response("Email is required.", 400);
        }

        if (!self::isValidEmail($email)) {
            error_response("Invalid email format.", 400);
        }

        // Find pending registration
        $pending = DB::getPendingRegistration($email);
        if (!$pending) {
            // Don't reveal if registration exists
            self::auditLog(null, $email, 'REGISTRATION_OTP_SENT', 'success', $ip, $userAgent, ['resend' => true]);
            json_response([
                'success' => true,
                'message' => 'If the registration is eligible, a new OTP has been sent.'
            ]);
            return;
        }

        // Check if already verified
        if ($pending['verified_at']) {
            error_response("This registration has already been verified.", 400);
        }

        // Check resend cooldown
        $cooldown = DB::checkResendCooldown($email, $ip, 'registration');
        if (!$cooldown['allowed']) {
            error_response("Please wait {$cooldown['retry_after']} seconds before requesting another OTP.", 429);
        }

        // Rate limiting
        $rateLimit = DB::checkRateLimit($email, $ip, 'registration');
        if (!$rateLimit['allowed']) {
            error_response("Too many requests. Please try again later.", 429);
        }

        // Generate fixed OTP (123456)
        $otp = DB::generateSecureOtp(6);
        $otpHash = DB::hashOtp($otp);
        $expiresInMinutes = (int)(getenv('OTP_EXPIRY_MINUTES') ?: ($_ENV['OTP_EXPIRY_MINUTES'] ?? 5));

        // Update pending registration with new OTP
        DB::execute("
            UPDATE pending_registrations 
            SET otp_hash = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE), otp_attempts = 0, updated_at = NOW()
            WHERE id = ?
        ", [$otpHash, $expiresInMinutes, $pending['id']]);

        // Send new OTP via Teams if connected
        $teamsUser = TeamsService::getTeamsUserByEmail($email);
        if ($teamsUser && !empty($teamsUser['conversation_reference'])) {
            try {
                $conversationRef = json_decode($teamsUser['conversation_reference'], true);
                TeamsService::sendOtpToTeams($conversationRef, $otp, 'registration');
            } catch (Throwable $te) {
                error_log("[AUTH] Failed to resend registration OTP to Teams: " . $te->getMessage());
            }
        }

        DB::incrementRateLimit($email, $ip, 'registration');
        self::auditLog(null, $email, 'REGISTRATION_OTP_SENT', 'success', $ip, $userAgent, ['resend' => true, 'pending_id' => $pending['id']]);

        json_response([
            'success' => true,
            'message' => 'A new verification code has been sent.',
            'expiresInMinutes' => $expiresInMinutes
        ]);
    }

    // ===================================================================
    // LOGIN ENDPOINTS
    // ===================================================================

    /**
     * POST /api/auth/send-otp
     * Send login OTP to Microsoft Teams
     */
    public static function sendOtp(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email)) {
            self::auditLog(null, $email, 'LOGIN_OTP_SENT', 'failed', $ip, $userAgent, ['reason' => 'missing_email']);
            json_response(['success' => true, 'message' => 'If the account is eligible, a verification code has been sent.']);
            return;
        }

        // Generic response to prevent account enumeration
        $genericResponse = ['success' => true, 'message' => 'If the account is eligible, a verification code has been sent.'];

        if (!self::isValidEmail($email)) {
            self::auditLog(null, $email, 'LOGIN_OTP_SENT', 'success', $ip, $userAgent, ['reason' => 'invalid_domain']);
            json_response($genericResponse);
            return;
        }

        // Check if user exists and is active
        $user = DB::getUserByEmail($email);
        if (!$user) {
            self::auditLog(null, $email, 'LOGIN_OTP_SENT', 'success', $ip, $userAgent, ['reason' => 'user_not_found']);
            json_response($genericResponse);
            return;
        }

        if (($user['status'] ?? 'active') !== 'active') {
            self::auditLog((int)$user['id'], $email, 'LOGIN_OTP_SENT', 'failed', $ip, $userAgent, ['reason' => 'inactive_account']);
            json_response($genericResponse);
            return;
        }

        // Rate limiting
        $rateLimit = DB::checkRateLimit($email, $ip, 'login');
        if (!$rateLimit['allowed']) {
            self::auditLog((int)$user['id'], $email, 'LOGIN_OTP_SENT', 'failed', $ip, $userAgent, ['reason' => 'rate_limited']);
            json_response($genericResponse);
            return;
        }

        // Check resend cooldown
        $cooldown = DB::checkResendCooldown($email, $ip, 'login');
        if (!$cooldown['allowed']) {
            json_response(array_merge($genericResponse, ['retryAfter' => $cooldown['retry_after']]));
            return;
        }

        // Invalidate any existing unverified OTPs for this user
        DB::invalidateUserLoginOtps($email);

        // Generate fixed OTP (123456)
        $otp = DB::generateSecureOtp(6);
        $otpHash = DB::hashOtp($otp);
        $expiresInMinutes = (int)(getenv('OTP_EXPIRY_MINUTES') ?: ($_ENV['OTP_EXPIRY_MINUTES'] ?? 5));
        $maxAttempts = (int)(getenv('OTP_MAX_ATTEMPTS') ?: ($_ENV['OTP_MAX_ATTEMPTS'] ?? 5));

        // Create login OTP request
        DB::createLoginOtpRequest(
            (int)$user['id'],
            $email,
            $otpHash,
            $expiresInMinutes,
            $ip,
            $userAgent
        );

        // Send OTP via Teams if connected
        $teamsUser = TeamsService::getTeamsUserByEmail($email);
        if ($teamsUser && !empty($teamsUser['conversation_reference'])) {
            try {
                $conversationRef = json_decode($teamsUser['conversation_reference'], true);
                TeamsService::sendOtpToTeams($conversationRef, $otp, 'login');
            } catch (Throwable $te) {
                error_log("[AUTH] Failed to send login OTP to Teams: " . $te->getMessage());
            }
        }

        DB::incrementRateLimit($email, $ip, 'login');
        self::auditLog((int)$user['id'], $email, 'LOGIN_OTP_SENT', 'success', $ip, $userAgent, ['user_id' => $user['id']]);

        json_response(array_merge($genericResponse, ['expiresInMinutes' => $expiresInMinutes]));
    }

    /**
     * POST /api/auth/verify-otp
     * Verify login OTP and create session
     */
    public static function verifyOtp(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));
        $otp = trim($input['otp'] ?? '');

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email) || empty($otp)) {
            self::auditLog(null, $email, 'LOGIN_SUCCESS', 'failed', $ip, $userAgent, ['reason' => 'missing_fields']);
            error_response("Email and OTP are required.", 400);
        }

        if (!self::isValidEmail($email)) {
            error_response("Invalid email format.", 400);
        }

        // Verify OTP
        $verified = DB::getValidLoginOtp($email, $otp);
        if (!$verified) {
            self::auditLog(null, $email, 'LOGIN_SUCCESS', 'failed', $ip, $userAgent, ['reason' => 'invalid_otp']);
            error_response("Invalid or expired verification code.", 400);
        }

        // Mark OTP as used
        DB::markLoginOtpVerified($verified['id']);

        // Get user
        $user = DB::getUserByEmail($email);
        if (!$user) {
            self::auditLog(null, $email, 'LOGIN_SUCCESS', 'failed', $ip, $userAgent, ['reason' => 'user_not_found_after_otp']);
            error_response("Invalid or expired verification code.", 400);
        }

        if (($user['status'] ?? 'active') !== 'active') {
            self::auditLog((int)$user['id'], $email, 'LOGIN_SUCCESS', 'failed', $ip, $userAgent, ['reason' => 'inactive_account']);
            error_response("Your account is inactive.", 403);
        }

        // Update last active
        DB::updateUser((int)$user['id'], ['last_active_at' => date('Y-m-d H:i:s')]);

        // Create token
        $permissions = RoleService::getUserPermissions((int)$user['id']);
        $tokenPayload = array_merge(DB::sanitizeUser($user), ['permissions' => $permissions]);
        $token = JWT::sign($tokenPayload, self::getSecret(), 28800);

        // Audit log
        self::auditLog((int)$user['id'], $email, 'LOGIN_SUCCESS', 'success', $ip, $userAgent, ['user_id' => $user['id']]);

        json_response([
            'success' => true,
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $tokenPayload
        ]);
    }

    /**
     * POST /api/auth/resend-otp
     * Resend login OTP
     */
    public static function resendOtp(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email)) {
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.']);
            return;
        }

        if (!self::isValidEmail($email)) {
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.']);
            return;
        }

        $user = DB::getUserByEmail($email);
        if (!$user) {
            self::auditLog(null, $email, 'LOGIN_OTP_SENT', 'success', $ip, $userAgent, ['reason' => 'user_not_found', 'resend' => true]);
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.']);
            return;
        }

        if (($user['status'] ?? 'active') !== 'active') {
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.']);
            return;
        }

        // Check resend cooldown
        $cooldown = DB::checkResendCooldown($email, $ip, 'login');
        if (!$cooldown['allowed']) {
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.', 'retryAfter' => $cooldown['retry_after']]);
            return;
        }

        // Rate limiting
        $rateLimit = DB::checkRateLimit($email, $ip, 'login');
        if (!$rateLimit['allowed']) {
            json_response(['success' => true, 'message' => 'If the account is eligible, a new OTP has been sent.']);
            return;
        }

        // Invalidate existing OTPs
        DB::invalidateUserLoginOtps($email);

        // Generate fixed OTP (123456)
        $otp = DB::generateSecureOtp(6);
        $otpHash = DB::hashOtp($otp);
        $expiresInMinutes = (int)(getenv('OTP_EXPIRY_MINUTES') ?: ($_ENV['OTP_EXPIRY_MINUTES'] ?? 5));

        // Create new login OTP request
        DB::createLoginOtpRequest(
            (int)$user['id'],
            $email,
            $otpHash,
            $expiresInMinutes,
            $ip,
            $userAgent
        );

        // Send OTP via Teams if connected
        $teamsUser = TeamsService::getTeamsUserByEmail($email);
        if ($teamsUser && !empty($teamsUser['conversation_reference'])) {
            try {
                $conversationRef = json_decode($teamsUser['conversation_reference'], true);
                TeamsService::sendOtpToTeams($conversationRef, $otp, 'login');
            } catch (Throwable $te) {
                error_log("[AUTH] Failed to resend login OTP to Teams: " . $te->getMessage());
            }
        }

        DB::incrementRateLimit($email, $ip, 'login');
        self::auditLog((int)$user['id'], $email, 'LOGIN_OTP_SENT', 'success', $ip, $userAgent, ['user_id' => $user['id'], 'resend' => true]);

        json_response([
            'success' => true,
            'message' => 'A new verification code has been sent.',
            'expiresInMinutes' => $expiresInMinutes
        ]);
    }

    // ===================================================================
    // MICROSOFT ENTRA ID AUTHENTICATION
    // ===================================================================

    /**
     * GET /api/auth/microsoft
     * Initiate Microsoft Entra ID OAuth 2.0 authorization code flow
     */
    public static function microsoftLogin(): void {
        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        $state = bin2hex(random_bytes(32));
        $nonce = bin2hex(random_bytes(16));

        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            @session_start();
        }
        $_SESSION['taskiq_entra_state'] = $state;
        $_SESSION['taskiq_entra_nonce'] = $nonce;

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                   (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        setcookie('taskiq_entra_state', $state, [
            'expires'  => time() + 900,
            'path'     => '/',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        self::auditLog(null, null, 'MICROSOFT_LOGIN_STARTED', 'success', $ip, $userAgent);

        $authUrl = MicrosoftAuthService::getAuthorizationUrl($state, $nonce);
        header("Location: $authUrl");
        exit;
    }

    /**
     * GET /api/auth/microsoft/callback
     * Handle Microsoft Entra ID OAuth callback
     */
    public static function microsoftCallback(): void {
        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();
        $frontendUrl = MicrosoftAuthService::getFrontendUrl();

        // 1. Check for error or cancellation from Microsoft
        if (!empty($_GET['error'])) {
            $error = $_GET['error'];
            $errorDesc = $_GET['error_description'] ?? '';

            if ($error === 'access_denied') {
                $clientMessage = "Microsoft sign-in was cancelled. Please try again.";
            } else {
                $clientMessage = "We could not authenticate your Microsoft account. Please try again.";
            }

            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, [
                'reason' => 'microsoft_error',
                'error' => $error,
                'description' => $errorDesc
            ]);

            header("Location: " . $frontendUrl . "/?error=" . urlencode($clientMessage));
            exit;
        }

        // 2. Validate state
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            @session_start();
        }
        $storedState = $_SESSION['taskiq_entra_state'] ?? $_COOKIE['taskiq_entra_state'] ?? null;
        $receivedState = $_GET['state'] ?? '';

        if (empty($receivedState) || empty($storedState) || !hash_equals($storedState, $receivedState)) {
            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'invalid_state']);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("We could not authenticate your Microsoft account. Please try again."));
            exit;
        }

        // Clear stored state
        unset($_SESSION['taskiq_entra_state']);
        setcookie('taskiq_entra_state', '', ['expires' => time() - 3600, 'path' => '/']);

        $code = $_GET['code'] ?? '';
        if (empty($code)) {
            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'missing_code']);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("We could not authenticate your Microsoft account. Please try again."));
            exit;
        }

        // 3. Exchange authorization code for tokens
        try {
            $tokens = MicrosoftAuthService::exchangeCodeForTokens($code);
        } catch (Throwable $e) {
            error_log("[ENTRA ID] Token exchange error: " . $e->getMessage());
            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'token_exchange_failed']);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("We could not authenticate your Microsoft account. Please try again."));
            exit;
        }

        // 4. Validate ID token
        try {
            $idToken = $tokens['id_token'] ?? '';
            $payload = MicrosoftAuthService::validateAndDecodeIdToken($idToken);
        } catch (Throwable $e) {
            $errMsg = $e->getMessage();
            error_log("[ENTRA ID] ID Token validation error: " . $errMsg);

            if (str_contains(strtolower($errMsg), 'tenant')) {
                self::auditLog(null, null, 'MICROSOFT_UNAUTHORIZED_TENANT', 'failed', $ip, $userAgent, ['reason' => 'unauthorized_tenant']);
                header("Location: " . $frontendUrl . "/?error=" . urlencode("Your Microsoft account is not authorized to access TaskIQ."));
                exit;
            }

            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'token_validation_failed']);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("We could not authenticate your Microsoft account. Please try again."));
            exit;
        }

        // 5. Extract identity claims
        $oid = $payload['oid'] ?? $payload['sub'] ?? '';
        $tid = $payload['tid'] ?? '';
        $email = strtolower(trim($payload['preferred_username'] ?? $payload['email'] ?? $payload['upn'] ?? ''));

        if (empty($email) && !empty($tokens['access_token'])) {
            $graphProfile = MicrosoftAuthService::getGraphProfile($tokens['access_token']);
            if ($graphProfile) {
                $email = strtolower(trim($graphProfile['mail'] ?? $graphProfile['userPrincipalName'] ?? ''));
            }
        }

        if (empty($email) || empty($oid)) {
            self::auditLog(null, null, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'missing_identity_claims']);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("We could not authenticate your Microsoft account. Please try again."));
            exit;
        }

        $name = trim($payload['name'] ?? explode('@', $email)[0]);

        // 6. Validate domain
        if (!MicrosoftAuthService::isDomainAllowed($email)) {
            self::auditLog(null, $email, 'MICROSOFT_UNAUTHORIZED_DOMAIN', 'failed', $ip, $userAgent, [
                'email' => $email,
                'reason' => 'domain_not_allowed'
            ]);
            header("Location: " . $frontendUrl . "/?error=" . urlencode("Your Microsoft account is not authorized for this application."));
            exit;
        }

        // 7. Find existing user or auto-provision (Duplicate User Protection)
        $user = DB::getUserByEntraId($oid);
        if (!$user) {
            $user = DB::getUserByEmail($email);
        }

        $userId = null;
        if ($user) {
            // Existing user
            $userId = (int)$user['id'];

            if (($user['status'] ?? 'active') !== 'active') {
                self::auditLog($userId, $email, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'inactive_account']);
                header("Location: " . $frontendUrl . "/?error=" . urlencode("Your account is inactive. Please contact your administrator."));
                exit;
            }

            // Safely link Entra ID if not linked
            if (empty($user['entra_id']) || $user['entra_id'] !== $oid) {
                DB::linkUserEntraId($userId, $oid, $tid);
                self::auditLog($userId, $email, 'MICROSOFT_USER_LINKED', 'success', $ip, $userAgent, [
                    'user_id' => $userId,
                    'entra_id' => $oid,
                    'tenant_id' => $tid
                ]);
            }
        } else {
            // New user: check auto-provision
            if (!MicrosoftAuthService::isAutoProvisionEnabled()) {
                self::auditLog(null, $email, 'MICROSOFT_LOGIN_FAILURE', 'failed', $ip, $userAgent, ['reason' => 'auto_provision_disabled']);
                header("Location: " . $frontendUrl . "/?error=" . urlencode("Your account has not been provisioned for TaskIQ. Please contact your administrator."));
                exit;
            }

            // Auto-provision new user as employee (non-admin)
            $userId = DB::createUser(
                $name,
                $email,
                null,
                'employee',
                null,
                'Employee',
                $oid,
                $tid,
                'microsoft'
            );

            // Auto-assign default 'User' role
            $roles = RoleService::getRoles();
            foreach ($roles as $r) {
                if (strtolower($r['role_name'] ?? $r['name'] ?? '') === 'user') {
                    DB::updateUser($userId, ['role_id' => $r['id']]);
                    break;
                }
            }

            self::auditLog($userId, $email, 'MICROSOFT_USER_AUTO_PROVISIONED', 'success', $ip, $userAgent, [
                'user_id' => $userId,
                'entra_id' => $oid,
                'tenant_id' => $tid
            ]);
        }

        // 8. Generate JWT / Session
        DB::updateUser($userId, ['last_active_at' => date('Y-m-d H:i:s')]);
        $freshUser = DB::getUserById($userId);
        $permissions = RoleService::getUserPermissions($userId);
        $tokenPayload = array_merge(DB::sanitizeUser($freshUser), ['permissions' => $permissions]);
        $token = JWT::sign($tokenPayload, self::getSecret(), 28800);

        self::auditLog($userId, $email, 'MICROSOFT_LOGIN_SUCCESS', 'success', $ip, $userAgent, ['user_id' => $userId]);

        // 9. Redirect to frontend with token
        header("Location: " . $frontendUrl . "/?auth_token=" . urlencode($token));
        exit;
    }

    // ===================================================================
    // MANUAL AUTHENTICATION (Email + Password)
    // ===================================================================

    /**
     * POST /api/auth/login
     * Manual email & password login
     */
    public static function login(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($email) || empty($password)) {
            error_response("Email and password are required.", 400);
        }

        if (!self::isValidEmail($email)) {
            error_response("Use your company email (@" . implode(', @', self::getAllowedDomains()) . ").", 400);
        }

        $user = DB::getUserByEmail($email);
        if (!$user) {
            self::auditLog(null, $email, 'LOGIN_FAILED', 'failed', $ip, $userAgent, ['reason' => 'user_not_found']);
            error_response("Invalid email or password.", 401);
        }

        if (($user['status'] ?? 'active') !== 'active') {
            self::auditLog((int)$user['id'], $email, 'LOGIN_FAILED', 'failed', $ip, $userAgent, ['reason' => 'inactive_account']);
            error_response("Your account is inactive.", 403);
        }

        // Account provisioned exclusively through Microsoft without a local password
        if (empty($user['passwordHash'])) {
            self::auditLog((int)$user['id'], $email, 'LOGIN_FAILED', 'failed', $ip, $userAgent, ['reason' => 'microsoft_only_user']);
            error_response("This account uses Microsoft Login. Please click Continue with Microsoft.", 400);
        }

        if (!password_verify($password, $user['passwordHash'])) {
            self::auditLog((int)$user['id'], $email, 'LOGIN_FAILED', 'failed', $ip, $userAgent, ['reason' => 'invalid_password']);
            error_response("Invalid email or password.", 401);
        }

        DB::updateUser((int)$user['id'], ['last_active_at' => date('Y-m-d H:i:s')]);
        $permissions = RoleService::getUserPermissions((int)$user['id']);
        $tokenPayload = array_merge(DB::sanitizeUser($user), ['permissions' => $permissions]);
        $token = JWT::sign($tokenPayload, self::getSecret(), 28800);

        self::auditLog((int)$user['id'], $email, 'LOGIN_SUCCESS', 'success', $ip, $userAgent, ['user_id' => $user['id']]);

        json_response([
            'success' => true,
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $tokenPayload
        ]);
    }

    /**
     * POST /api/auth/signup
     * Manual email & password registration
     */
    public static function signup(): void {
        $input = get_json_input();
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $departmentId = !empty($input['departmentId']) ? (int)$input['departmentId'] : null;
        $title = trim($input['title'] ?? 'Employee');

        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();

        if (empty($name) || empty($email) || empty($password)) {
            error_response("Name, email, and password are required.", 400);
        }

        if (!self::isValidEmail($email)) {
            error_response("Use your company email (@" . implode(', @', self::getAllowedDomains()) . ").", 400);
        }

        $passwordErrors = self::validatePassword($password);
        if (!empty($passwordErrors)) {
            error_response(implode(' ', $passwordErrors), 400);
        }

        $existingUser = DB::getUserByEmail($email);
        if ($existingUser) {
            self::auditLog(null, $email, 'REGISTRATION_STARTED', 'failed', $ip, $userAgent, ['reason' => 'duplicate_user']);
            error_response("An account with this email already exists.", 409);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $userId = DB::createUser($name, $email, $passwordHash, 'employee', $departmentId, $title);

        // Auto-assign default User role
        $roles = RoleService::getRoles();
        foreach ($roles as $r) {
            if (strtolower($r['role_name'] ?? $r['name'] ?? '') === 'user') {
                DB::updateUser($userId, ['role_id' => $r['id']]);
                break;
            }
        }

        DB::updateUser($userId, ['email_verified' => 1, 'status' => 'active']);

        $user = DB::getUserById($userId);
        $permissions = RoleService::getUserPermissions($userId);
        $tokenPayload = array_merge(DB::sanitizeUser($user), ['permissions' => $permissions]);
        $token = JWT::sign($tokenPayload, self::getSecret(), 28800);

        self::auditLog($userId, $email, 'REGISTRATION_COMPLETED', 'success', $ip, $userAgent, ['user_id' => $userId]);

        json_response([
            'success' => true,
            'registered' => true,
            'message' => 'Account created successfully.',
            'token' => $token,
            'user' => $tokenPayload
        ]);
    }

    // ===================================================================
    // EXISTING SESSION ENDPOINTS
    // ===================================================================

    public static function me(): void {
        $authUser = AuthMiddleware::requireAuth();
        $user = DB::getUserById((int)$authUser['id']);
        if (!$user) {
            error_response("User not found", 404);
        }

        $permissions = RoleService::getUserPermissions((int)$user['id']);
        $user['permissions'] = $permissions;
        json_response($user);
    }

    public static function logout(): void {
        $ip = self::getClientIp();
        $userAgent = self::getUserAgent();
        $user = AuthMiddleware::authenticate();
        if ($user) {
            self::auditLog((int)$user['id'], $user['email'] ?? null, 'LOGOUT', 'success', $ip, $userAgent);
        }
        json_response(['success' => true, 'message' => 'Logged out successfully.']);
    }

    // ===================================================================
    // TEAMS CONNECTION ENDPOINTS
    // ===================================================================

    /**
     * POST /api/auth/teams/connect
     * Store Teams conversation reference (called from Bot)
     */
    public static function teamsConnect(): void {
        $input = get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));
        $teamsUserId = trim($input['teamsUserId'] ?? '');
        $tenantId = trim($input['tenantId'] ?? '');
        $conversationId = trim($input['conversationId'] ?? '');
        $serviceUrl = trim($input['serviceUrl'] ?? '');
        $conversationReference = $input['conversationReference'] ?? null;

        if (empty($email) || empty($teamsUserId) || empty($tenantId) || empty($conversationId) || empty($serviceUrl) || !$conversationReference) {
            error_response("Missing required Teams connection parameters.", 400);
        }

        $user = DB::getUserByEmail($email);
        if (!$user) {
            error_response("User not found.", 404);
        }

        if (($user['status'] ?? 'active') !== 'active') {
            error_response("Account is not active.", 403);
        }

        // Store conversation reference
        $success = DB::storeTeamsConversationReference(
            (int)$user['id'],
            $teamsUserId,
            $tenantId,
            $conversationId,
            $serviceUrl,
            $conversationReference
        );

        if (!$success) {
            error_response("Failed to connect Teams account.", 500);
        }

        // Audit log
        self::auditLog((int)$user['id'], $email, 'TEAMS_CONNECTED', 'success', self::getClientIp(), self::getUserAgent());

        json_response(['success' => true, 'message' => 'Teams account connected successfully.']);
    }

    /**
     * GET /api/auth/teams/status
     * Check if user has Teams connected
     */
    public static function teamsStatus(): void {
        $authUser = AuthMiddleware::requireAuth();
        $teamsUser = DB::getTeamsUserByUserId((int)$authUser['id']);

        json_response([
            'connected' => $teamsUser !== null,
            'teamsUserId' => $teamsUser['teams_user_id'] ?? null,
            'lastMessageAt' => $teamsUser['last_message_at'] ?? null
        ]);
    }

    // ===================================================================
    // ADMIN HEALTH CHECK
    // ===================================================================

    /**
     * GET /api/admin/microsoft-teams-health
     * Admin-only health check for Microsoft Teams integration
     */
    public static function teamsHealth(): void {
        AuthMiddleware::requireAdmin();

        $checks = [
            'php_api' => true,
            'database' => false,
            'entra_id' => false,
            'teams_bot' => false,
            'teams_configuration' => false,
            'microsoft_api' => false,
            'conversation_references' => false
        ];

        $details = [];

        // Database check
        try {
            DB::pdo()->query('SELECT 1');
            $checks['database'] = true;
            $details['database'] = 'Connected';
        } catch (Throwable $e) {
            $details['database'] = 'Failed: ' . $e->getMessage();
        }

        // Microsoft Entra ID configuration
        $config = TeamsService::validateConfiguration();
        $checks['teams_configuration'] = $config['valid'];
        $details['teams_configuration'] = $config['valid'] ? 'All credentials configured' : 'Missing credentials: ' . implode(', ', array_keys(array_filter($config['checks'], fn($v) => !$v)));

        // Test Entra ID token
        $entraToken = TeamsService::getAccessToken();
        $checks['entra_id'] = $entraToken !== null;
        $details['entra_id'] = $entraToken ? 'Token obtained successfully' : 'Failed to obtain token';

        // Test Bot token
        $botToken = TeamsService::getBotAccessToken();
        $checks['teams_bot'] = $botToken !== null;
        $details['teams_bot'] = $botToken ? 'Token obtained successfully' : 'Failed to obtain token';

        // Test Microsoft Graph API
        if ($entraToken) {
            try {
                $graphUrl = (getenv('MICROSOFT_GRAPH_ENDPOINT') ?: ($_ENV['MICROSOFT_GRAPH_ENDPOINT'] ?? 'https://graph.microsoft.com')) . '/v1.0/organization';
                $response = self::httpGet($graphUrl, $entraToken);
                $checks['microsoft_api'] = isset($response['value']);
                $details['microsoft_api'] = $checks['microsoft_api'] ? 'Graph API accessible' : 'Graph API failed';
            } catch (Throwable $e) {
                $details['microsoft_api'] = 'Graph API error: ' . $e->getMessage();
            }
        }

        // Check conversation references
        try {
            $teamsUsers = DB::query("SELECT COUNT(*) as count FROM teams_users WHERE app_installed = 1");
            $checks['conversation_references'] = ($teamsUsers[0]['count'] ?? 0) > 0;
            $details['conversation_references'] = ($teamsUsers[0]['count'] ?? 0) . ' active Teams connections';
        } catch (Throwable $e) {
            $details['conversation_references'] = 'Query failed: ' . $e->getMessage();
        }

        $overall = array_reduce($checks, fn($carry, $item) => $carry && $item, true);

        json_response([
            'healthy' => $overall,
            'checks' => $checks,
            'details' => $details,
            'timestamp' => date('c')
        ]);
    }

    // ===================================================================
    // HELPER METHODS
    // ===================================================================

    private static function validatePassword(string $password): array {
        $errors = [];
        if (strlen($password) < 8) {
            $errors[] = "Password must be at least 8 characters long.";
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = "Password must contain at least one uppercase letter.";
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = "Password must contain at least one lowercase letter.";
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = "Password must contain at least one number.";
        }
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = "Password must contain at least one special character.";
        }
        return $errors;
    }

    private static function auditLog(?int $userId, ?string $email, string $event, string $status, string $ip, string $userAgent, array $metadata = []): void {
        try {
            DB::createAuditLog($userId, $email, $event, $status, $ip, $userAgent, $metadata);
        } catch (Throwable $e) {
            error_log('[AUDIT] Failed to write audit log: ' . $e->getMessage());
        }
    }

    private static function httpGet(string $url, string $token): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
                'User-Agent: ABM-TaskIQ-TeamsBot/1.0'
            ],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: {$error}");
        }

        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            throw new Exception("HTTP {$httpCode}: " . ($decoded['error']['message'] ?? $response));
        }

        return $decoded ?? [];
    }
}