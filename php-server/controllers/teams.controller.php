<?php
// php-server/controllers/teams.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/teams.service.php';

class TeamsController {
    /**
     * POST /api/teams/messages
     * Bot Framework webhook endpoint for incoming Teams messages
     * This is where the bot receives messages from users
     */
    public static function messages(): void {
        // Verify this is a Bot Framework request
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            error_response("Unauthorized", 401);
        }

        $input = get_json_input();
        
        // Handle different activity types
        $activityType = $input['type'] ?? '';
        
        switch ($activityType) {
            case 'message':
                self::handleMessage($input);
                break;
            case 'conversationUpdate':
                self::handleConversationUpdate($input);
                break;
            case 'installationUpdate':
                self::handleInstallationUpdate($input);
                break;
            case 'invoke':
                self::handleInvoke($input);
                break;
            default:
                // Acknowledge other activity types
                http_response_code(200);
                echo json_encode(['status' => 'ok']);
                exit;
        }
    }

    /**
     * Handle incoming message from user
     */
    private static function handleMessage(array $activity): void {
        $text = trim($activity['text'] ?? '');
        $from = $activity['from'] ?? [];
        $conversation = $activity['conversation'] ?? [];
        $serviceUrl = $activity['serviceUrl'] ?? '';
        $channelId = $activity['channelId'] ?? '';
        $recipient = $activity['recipient'] ?? [];

        $userId = $from['id'] ?? '';
        $userName = $from['name'] ?? '';
        $userAadObjectId = $from['aadObjectId'] ?? $userId;
        $tenantId = $conversation['tenantId'] ?? $from['tenantId'] ?? '';
        $conversationId = $conversation['id'] ?? '';

        // Store conversation reference for proactive messaging
        $conversationReference = [
            'bot' => $recipient,
            'user' => $from,
            'conversation' => $conversation,
            'serviceUrl' => $serviceUrl,
            'channelId' => $channelId
        ];

        // Try to identify user by email from Teams
        // In a real scenario, you'd use Graph API to get user email from AAD Object ID
        // For now, we'll prompt user to provide email or use a mapping
        
        if (str_starts_with(strtolower($text), 'connect ')) {
            // User sends "connect email@company.com"
            $email = strtolower(trim(substr($text, 8)));
            self::handleConnectCommand($email, $userAadObjectId, $tenantId, $conversationId, $serviceUrl, $conversationReference);
        } elseif (strtolower($text) === 'connect' || strtolower($text) === 'start') {
            // User wants to connect but hasn't provided email
            self::sendConnectPrompt($serviceUrl, $conversationId, $conversationReference);
        } elseif (strtolower($text) === 'help') {
            self::sendHelpMessage($serviceUrl, $conversationId, $conversationReference);
        } else {
            // Default response
            self::sendDefaultResponse($serviceUrl, $conversationId, $conversationReference);
        }

        http_response_code(200);
        echo json_encode(['status' => 'ok']);
        exit;
    }

    /**
     * Handle "connect email@domain.com" command
     */
    private static function handleConnectCommand(
        string $email,
        string $teamsUserId,
        string $tenantId,
        string $conversationId,
        string $serviceUrl,
        array $conversationReference
    ): void {
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::sendErrorMessage($serviceUrl, $conversationId, $conversationReference, "Invalid email format. Please use: connect your@email.com");
            return;
        }

        // Check if email domain is allowed
        $allowedDomains = self::getAllowedDomains();
        $domainValid = false;
        foreach ($allowedDomains as $domain) {
            if (str_ends_with($email, '@' . $domain)) {
                $domainValid = true;
                break;
            }
        }

        if (!$domainValid) {
            self::sendErrorMessage($serviceUrl, $conversationId, $conversationReference, "Please use your company email (@" . implode(', @', $allowedDomains) . ").");
            return;
        }

        // Find user by email
        $user = DB::getUserByEmail($email);
        if (!$user) {
            // Check if there's a pending registration
            $pending = DB::getPendingRegistration($email);
            if ($pending) {
                // Store conversation reference for pending registration
                DB::storeTeamsConversationReference(
                    0, // No user ID yet
                    $teamsUserId,
                    $tenantId,
                    $conversationId,
                    $serviceUrl,
                    $conversationReference
                );
                self::sendMessage($serviceUrl, $conversationId, $conversationReference, 
                    "✅ Teams account connected! You can now complete your registration on the website. The verification code will be sent here.");
                return;
            }
            
            self::sendErrorMessage($serviceUrl, $conversationId, $conversationReference, "No account found with this email. Please register first on the website.");
            return;
        }

        // Store conversation reference linked to user
        $success = DB::storeTeamsConversationReference(
            (int)$user['id'],
            $teamsUserId,
            $tenantId,
            $conversationId,
            $serviceUrl,
            $conversationReference
        );

        if ($success) {
            self::sendMessage($serviceUrl, $conversationId, $conversationReference, 
                "✅ **Teams account connected!**\n\nYour Microsoft Teams account is now linked to your TaskIQ account (**{$user['name']}**). You'll receive verification codes here for login and registration.");
        } else {
            self::sendErrorMessage($serviceUrl, $conversationId, $conversationReference, "Failed to connect your Teams account. Please try again.");
        }
    }

    /**
     * Send prompt asking for email to connect
     */
    private static function sendConnectPrompt(string $serviceUrl, string $conversationId, array $conversationReference): void {
        $message = <<<MD
👋 **Welcome to TaskIQ Bot!**

To connect your Microsoft Teams account with TaskIQ, please send:

\`connect your@company.com\`

For example: \`connect john@abmindia.com\`

This will link your Teams identity to your TaskIQ account so you can receive verification codes directly in Teams.
MD;

        self::sendMessage($serviceUrl, $conversationId, $conversationReference, $message);
    }

    /**
     * Send help message
     */
    private static function sendHelpMessage(string $serviceUrl, string $conversationId, array $conversationReference): void {
        $message = <<<MD
🤖 **TaskIQ Bot Help**

**Commands:**
• \`connect your@email.com\` - Link your Teams account
• \`help\` - Show this help message

**What this bot does:**
• Sends verification codes for login
• Sends verification codes for registration
• Notifies you about important updates

**Need help?** Contact your IT administrator.
MD;

        self::sendMessage($serviceUrl, $conversationId, $conversationReference, $message);
    }

    /**
     * Send default response
     */
    private static function sendDefaultResponse(string $serviceUrl, string $conversationId, array $conversationReference): void {
        $message = "I didn't understand that. Type `help` for available commands or `connect your@email.com` to link your account.";
        self::sendMessage($serviceUrl, $conversationId, $conversationReference, $message);
    }

    /**
     * Send error message
     */
    private static function sendErrorMessage(string $serviceUrl, string $conversationId, array $conversationReference, string $message): void {
        self::sendMessage($serviceUrl, $conversationId, $conversationReference, "❌ " . $message);
    }

    /**
     * Send message via Bot Framework
     */
    private static function sendMessage(string $serviceUrl, string $conversationId, array $conversationReference, string $text): void {
        $botToken = TeamsService::getBotAccessToken();
        if (!$botToken) {
            error_log('[TEAMS BOT] Failed to get bot token for reply');
            return;
        }

        $serviceUrl = rtrim($serviceUrl, '/') . '/';
        $activityUrl = "{$serviceUrl}v3/conversations/{$conversationId}/activities";

        $activity = [
            'type' => 'message',
            'from' => $conversationReference['bot'] ?? ['id' => '', 'name' => 'TaskIQ Bot'],
            'conversation' => ['id' => $conversationId],
            'recipient' => $conversationReference['user'] ?? [],
            'text' => $text,
            'textFormat' => 'markdown'
        ];

        $ch = curl_init($activityUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($activity),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $botToken,
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        curl_exec($ch);
        curl_close($ch);
    }

    /**
     * Handle conversation update (user added/removed)
     */
    private static function handleConversationUpdate(array $activity): void {
        $membersAdded = $activity['membersAdded'] ?? [];
        $recipient = $activity['recipient'] ?? [];
        $botId = $recipient['id'] ?? '';

        foreach ($membersAdded as $member) {
            if ($member['id'] !== $botId) {
                // User added the bot - send welcome message
                $serviceUrl = $activity['serviceUrl'] ?? '';
                $conversationId = $activity['conversation']['id'] ?? '';
                $conversationReference = [
                    'bot' => $recipient,
                    'user' => $member,
                    'conversation' => $activity['conversation'] ?? [],
                    'serviceUrl' => $serviceUrl,
                    'channelId' => $activity['channelId'] ?? ''
                ];
                
                self::sendConnectPrompt($serviceUrl, $conversationId, $conversationReference);
            }
        }

        http_response_code(200);
        echo json_encode(['status' => 'ok']);
        exit;
    }

    /**
     * Handle installation update (app installed/uninstalled)
     */
    private static function handleInstallationUpdate(array $activity): void {
        $action = $activity['action'] ?? '';
        $teamsUserId = $activity['from']['id'] ?? '';
        
        if ($action === 'remove') {
            // User uninstalled the app
            DB::markTeamsAppUninstalled($teamsUserId);
        }

        http_response_code(200);
        echo json_encode(['status' => 'ok']);
        exit;
    }

    /**
     * Handle invoke activities (for Adaptive Cards, etc.)
     */
    private static function handleInvoke(array $activity): void {
        http_response_code(200);
        echo json_encode(['status' => 'ok']);
        exit;
    }

    private static function getAllowedDomains(): array {
        $domains = getenv('ALLOWED_EMAIL_DOMAINS') ?: ($_ENV['ALLOWED_EMAIL_DOMAINS'] ?? 'abmindia.com,abm.com');
        return array_map('trim', explode(',', $domains));
    }
}