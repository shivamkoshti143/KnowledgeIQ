<?php
// php-server/services/teams.service.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../config/database.php';

class TeamsService {
    private static ?string $cachedToken = null;
    private static ?int $tokenExpiresAt = null;

    /**
     * Get Microsoft Entra ID access token using client credentials flow
     * This token is used for Microsoft Graph API and Bot Framework
     */
    public static function getAccessToken(): ?string {
        if (self::$cachedToken && self::$tokenExpiresAt && time() < self::$tokenExpiresAt - 60) {
            return self::$cachedToken;
        }

        $tenantId = getenv('MICROSOFT_TENANT_ID') ?: ($_ENV['MICROSOFT_TENANT_ID'] ?? '');
        $clientId = getenv('MICROSOFT_CLIENT_ID') ?: ($_ENV['MICROSOFT_CLIENT_ID'] ?? '');
        $clientSecret = getenv('MICROSOFT_CLIENT_SECRET') ?: ($_ENV['MICROSOFT_CLIENT_SECRET'] ?? '');

        if (empty($tenantId) || empty($clientId) || empty($clientSecret)) {
            error_log('[TEAMS] Missing Microsoft Entra credentials');
            return null;
        }

        $tokenUrl = "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/token";
        $scope = 'https://graph.microsoft.com/.default';

        $postData = [
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scope' => $scope
        ];

        try {
            $response = self::httpPost($tokenUrl, $postData, [
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            if (isset($response['access_token'])) {
                self::$cachedToken = $response['access_token'];
                self::$tokenExpiresAt = time() + ($response['expires_in'] ?? 3600);
                return self::$cachedToken;
            }

            error_log('[TEAMS] Failed to get access token: ' . json_encode($response));
            return null;
        } catch (Throwable $e) {
            error_log('[TEAMS] Exception getting access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get Bot Framework access token for sending proactive messages
     * Uses the Bot Framework OAuth endpoint
     */
    public static function getBotAccessToken(): ?string {
        $appId = getenv('MICROSOFT_BOT_ID') ?: ($_ENV['MICROSOFT_BOT_ID'] ?? '');
        $appPassword = getenv('MICROSOFT_BOT_PASSWORD') ?: ($_ENV['MICROSOFT_BOT_PASSWORD'] ?? '');

        if (empty($appId) || empty($appPassword)) {
            error_log('[TEAMS] Missing Bot credentials');
            return null;
        }

        $tokenUrl = 'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token';
        $scope = 'https://api.botframework.com/.default';

        $postData = [
            'grant_type' => 'client_credentials',
            'client_id' => $appId,
            'client_secret' => $appPassword,
            'scope' => $scope
        ];

        try {
            $response = self::httpPost($tokenUrl, $postData, [
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            if (isset($response['access_token'])) {
                return $response['access_token'];
            }

            error_log('[TEAMS] Failed to get bot access token: ' . json_encode($response));
            return null;
        } catch (Throwable $e) {
            error_log('[TEAMS] Exception getting bot access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send proactive message to a Teams user
     * 
     * @param array $conversationReference The stored conversation reference
     * @param string $message The message text to send
     * @param string $messageType 'message' or 'AdaptiveCard'
     * @return array ['success' => bool, 'error' => string|null]
     */
    public static function sendProactiveMessage(array $conversationReference, string $message, string $messageType = 'message'): array {
        $botToken = self::getBotAccessToken();
        if (!$botToken) {
            return ['success' => false, 'error' => 'Failed to obtain bot access token'];
        }

        $serviceUrl = $conversationReference['serviceUrl'] ?? '';
        $conversationId = $conversationReference['conversation']['id'] ?? '';

        if (empty($serviceUrl) || empty($conversationId)) {
            return ['success' => false, 'error' => 'Invalid conversation reference'];
        }

        // Ensure serviceUrl ends with /
        $serviceUrl = rtrim($serviceUrl, '/') . '/';

        $activityUrl = "{$serviceUrl}v3/conversations/{$conversationId}/activities";

        $activity = [
            'type' => $messageType,
            'from' => [
                'id' => $conversationReference['bot']['id'] ?? '',
                'name' => $conversationReference['bot']['name'] ?? 'TaskIQ Bot'
            ],
            'conversation' => [
                'id' => $conversationId,
                'isGroup' => $conversationReference['conversation']['isGroup'] ?? false
            ],
            'recipient' => [
                'id' => $conversationReference['user']['id'] ?? '',
                'name' => $conversationReference['user']['name'] ?? ''
            ],
            'text' => $message,
            'textFormat' => 'markdown'
        ];

        // If AdaptiveCard, add attachments
        if ($messageType === 'AdaptiveCard') {
            $activity['attachments'] = [[
                'contentType' => 'application/vnd.microsoft.card.adaptive',
                'content' => json_decode($message, true)
            ]];
        }

        try {
            $response = self::httpPost($activityUrl, $activity, [
                'Authorization: Bearer ' . $botToken,
                'Content-Type: application/json'
            ]);

            if (isset($response['id'])) {
                // Update last message timestamp
                if (!empty($conversationReference['user']['id'])) {
                    self::updateLastMessageTime($conversationReference['user']['id']);
                }
                return ['success' => true, 'activityId' => $response['id']];
            }

            return ['success' => false, 'error' => 'Failed to send message: ' . json_encode($response)];
        } catch (Throwable $e) {
            error_log('[TEAMS] Exception sending proactive message: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send OTP message to Teams user
     */
    public static function sendOtpToTeams(array $conversationReference, string $otp, string $purpose): array {
        $appName = getenv('APP_NAME') ?: ($_ENV['APP_NAME'] ?? 'ABM TaskIQ');
        $expiryMinutes = (int)(getenv('OTP_EXPIRY_MINUTES') ?: ($_ENV['OTP_EXPIRY_MINUTES'] ?? 5));

        $purposeText = $purpose === 'registration' ? 'account verification' : 'login';
        $actionText = $purpose === 'registration' ? 'verify your account and complete registration' : 'sign in to your account';

        $message = <<<MD
🔐 **Verify Your Account**

Welcome to **{$appName}**.

Your {$purposeText} code is:

# **{$otp}**

This code expires in **{$expiryMinutes} minutes**.

Use this code to {$actionText}.

If you did not request this {$purposeText}, please ignore this message.

---
*This is an automated message from {$appName}. Never share this code with anyone.*
MD;

        return self::sendProactiveMessage($conversationReference, $message);
    }

    /**
     * Get Teams user mapping by email
     */
    public static function getTeamsUserByEmail(string $email): ?array {
        $email = strtolower(trim($email));
        return DB::getOne(
            "SELECT tu.*, u.email, u.name FROM teams_users tu 
             JOIN users u ON tu.user_id = u.id 
             WHERE LOWER(u.email) = LOWER(?) AND tu.app_installed = 1
             ORDER BY tu.last_message_at DESC LIMIT 1",
            [$email]
        );
    }

    /**
     * Get Teams user mapping by user ID
     */
    public static function getTeamsUserByUserId(int $userId): ?array {
        return DB::getOne(
            "SELECT * FROM teams_users WHERE user_id = ? AND app_installed = 1 ORDER BY last_message_at DESC LIMIT 1",
            [$userId]
        );
    }

    /**
     * Store or update Teams conversation reference
     */
    public static function storeConversationReference(int $userId, array $reference): bool {
        $required = ['teams_user_id', 'tenant_id', 'conversation_id', 'service_url', 'conversation_reference'];
        foreach ($required as $field) {
            if (empty($reference[$field])) {
                error_log("[TEAMS] Missing required field: {$field}");
                return false;
            }
        }

        try {
            DB::execute("
                INSERT INTO teams_users (user_id, teams_user_id, tenant_id, conversation_id, service_url, conversation_reference, app_installed, connected_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    teams_user_id = VALUES(teams_user_id),
                    tenant_id = VALUES(tenant_id),
                    conversation_id = VALUES(conversation_id),
                    service_url = VALUES(service_url),
                    conversation_reference = VALUES(conversation_reference),
                    app_installed = VALUES(app_installed),
                    updated_at = NOW()
            ", [
                $userId,
                $reference['teams_user_id'],
                $reference['tenant_id'],
                $reference['conversation_id'],
                $reference['service_url'],
                json_encode($reference['conversation_reference'])
            ]);
            return true;
        } catch (Throwable $e) {
            error_log('[TEAMS] Error storing conversation reference: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Update last message timestamp
     */
    public static function updateLastMessageTime(string $teamsUserId): bool {
        try {
            DB::execute(
                "UPDATE teams_users SET last_message_at = NOW() WHERE teams_user_id = ?",
                [$teamsUserId]
            );
            return true;
        } catch (Throwable $e) {
            return false;
        }
    }

    /**
     * Check if user has Teams connected
     */
    public static function isTeamsConnected(string $email): bool {
        $teamsUser = self::getTeamsUserByEmail($email);
        return $teamsUser !== null;
    }

    /**
     * Validate Microsoft credentials configuration
     */
    public static function validateConfiguration(): array {
        $checks = [
            'tenant_id' => !empty(getenv('MICROSOFT_TENANT_ID') ?: ($_ENV['MICROSOFT_TENANT_ID'] ?? '')),
            'client_id' => !empty(getenv('MICROSOFT_CLIENT_ID') ?: ($_ENV['MICROSOFT_CLIENT_ID'] ?? '')),
            'client_secret' => !empty(getenv('MICROSOFT_CLIENT_SECRET') ?: ($_ENV['MICROSOFT_CLIENT_SECRET'] ?? '')),
            'bot_id' => !empty(getenv('MICROSOFT_BOT_ID') ?: ($_ENV['MICROSOFT_BOT_ID'] ?? '')),
            'bot_password' => !empty(getenv('MICROSOFT_BOT_PASSWORD') ?: ($_ENV['MICROSOFT_BOT_PASSWORD'] ?? '')),
        ];

        $allValid = true;
        foreach ($checks as $key => $valid) {
            if (!$valid) {
                $allValid = false;
            }
        }

        return [
            'valid' => $allValid,
            'checks' => $checks
        ];
    }

    /**
     * HTTP POST helper
     */
    private static function httpPost(string $url, array $data, array $headers = []): array {
        $ch = curl_init($url);
        
        $postFields = is_array($data) ? http_build_query($data) : json_encode($data);
        
        $defaultHeaders = [
            'Accept: application/json',
            'User-Agent: ABM-TaskIQ-TeamsBot/1.0'
        ];
        
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => array_merge($defaultHeaders, $headers),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
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
            throw new Exception("HTTP {$httpCode}: " . ($decoded['error_description'] ?? $decoded['error'] ?? $response));
        }

        return $decoded ?? [];
    }
}