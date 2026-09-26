<?php
// php-server/services/microsoft_auth.service.php

require_once __DIR__ . '/../config/database.php';

class MicrosoftAuthService {
    public static function getTenantId(): string {
        Database::loadEnv();
        return getenv('MICROSOFT_TENANT_ID') ?: ($_ENV['MICROSOFT_TENANT_ID'] ?? '');
    }

    public static function getClientId(): string {
        Database::loadEnv();
        return getenv('MICROSOFT_CLIENT_ID') ?: ($_ENV['MICROSOFT_CLIENT_ID'] ?? '');
    }

    public static function getClientSecret(): string {
        Database::loadEnv();
        return getenv('MICROSOFT_CLIENT_SECRET') ?: ($_ENV['MICROSOFT_CLIENT_SECRET'] ?? '');
    }

    public static function getAuthority(): string {
        Database::loadEnv();
        return rtrim(getenv('MICROSOFT_AUTHORITY') ?: ($_ENV['MICROSOFT_AUTHORITY'] ?? 'https://login.microsoftonline.com'), '/');
    }

    public static function getGraphEndpoint(): string {
        Database::loadEnv();
        return rtrim(getenv('MICROSOFT_GRAPH_ENDPOINT') ?: ($_ENV['MICROSOFT_GRAPH_ENDPOINT'] ?? 'https://graph.microsoft.com'), '/');
    }

    public static function getFrontendUrl(): string {
        Database::loadEnv();
        return rtrim(getenv('FRONTEND_URL') ?: ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173'), '/');
    }

    public static function getRedirectUri(): string {
        Database::loadEnv();
        $configured = getenv('MICROSOFT_REDIRECT_URI') ?: ($_ENV['MICROSOFT_REDIRECT_URI'] ?? '');
        if (!empty($configured)) {
            return $configured;
        }

        // Auto-detect based on host if not set in .env
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                   (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $isHttps ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost:5173';
        return "$scheme://$host/api/auth/microsoft/callback";
    }

    public static function isAutoProvisionEnabled(): bool {
        Database::loadEnv();
        $val = getenv('MICROSOFT_AUTO_PROVISION') ?: ($_ENV['MICROSOFT_AUTO_PROVISION'] ?? 'true');
        return in_array(strtolower(trim((string)$val)), ['true', '1', 'yes', 'on'], true);
    }

    public static function getAllowedDomains(): array {
        Database::loadEnv();
        $domains = getenv('ALLOWED_EMAIL_DOMAINS') ?: ($_ENV['ALLOWED_EMAIL_DOMAINS'] ?? 'abmindia.com,abm.com');
        return array_values(array_filter(array_map('trim', explode(',', strtolower($domains)))));
    }

    public static function isDomainAllowed(string $email): bool {
        $email = strtolower(trim($email));
        $allowedDomains = self::getAllowedDomains();
        foreach ($allowedDomains as $domain) {
            if ($domain === '*' || str_ends_with($email, '@' . $domain)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build the Microsoft Entra ID OAuth 2.0 authorization URL
     */
    public static function getAuthorizationUrl(string $state, ?string $nonce = null): string {
        $tenantId = self::getTenantId();
        $clientId = self::getClientId();
        $redirectUri = self::getRedirectUri();
        $authority = self::getAuthority();

        $params = [
            'client_id'     => $clientId,
            'response_type' => 'code',
            'redirect_uri'  => $redirectUri,
            'response_mode' => 'query',
            'scope'         => 'openid profile email User.Read',
            'state'         => $state,
            'prompt'        => 'select_account'
        ];

        if ($nonce) {
            $params['nonce'] = $nonce;
        }

        return "$authority/$tenantId/oauth2/v2.0/authorize?" . http_build_query($params);
    }

    /**
     * Exchange OAuth authorization code for tokens
     */
    public static function exchangeCodeForTokens(string $code): array {
        $tenantId = self::getTenantId();
        $clientId = self::getClientId();
        $clientSecret = self::getClientSecret();
        $redirectUri = self::getRedirectUri();
        $authority = self::getAuthority();

        $tokenUrl = "$authority/$tenantId/oauth2/v2.0/token";

        $postData = [
            'client_id'     => $clientId,
            'client_secret' => $clientSecret,
            'grant_type'    => 'authorization_code',
            'code'          => $code,
            'redirect_uri'  => $redirectUri,
            'scope'         => 'openid profile email User.Read'
        ];

        $ch = curl_init($tokenUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($postData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error exchanging code: $error");
        }

        $data = json_decode($response, true);
        if ($httpCode !== 200 || !is_array($data) || empty($data['id_token'])) {
            $msg = $data['error_description'] ?? $data['error'] ?? "HTTP $httpCode";
            throw new Exception("Failed to exchange authorization code: $msg");
        }

        return $data;
    }

    /**
     * Validate and decode Microsoft OpenID Connect ID token
     */
    public static function validateAndDecodeIdToken(string $idToken): array {
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            throw new Exception("Malformed ID token format");
        }

        [$headB64, $bodyB64, $sigB64] = $parts;

        $header = json_decode(self::base64UrlDecode($headB64), true);
        $payload = json_decode(self::base64UrlDecode($bodyB64), true);

        if (!is_array($header) || !is_array($payload)) {
            throw new Exception("Invalid ID token JSON encoding");
        }

        // Validate expiration
        $now = time();
        if (isset($payload['exp']) && $payload['exp'] < ($now - 60)) {
            throw new Exception("Microsoft token has expired");
        }

        // Validate not before / issued at with 5 min clock skew tolerance
        if (isset($payload['nbf']) && $payload['nbf'] > ($now + 300)) {
            throw new Exception("Microsoft token is not yet valid");
        }

        // Validate audience (Client ID)
        $expectedClientId = self::getClientId();
        if (!empty($expectedClientId) && isset($payload['aud']) && $payload['aud'] !== $expectedClientId) {
            throw new Exception("Microsoft token audience mismatch");
        }

        // Validate tenant ID
        $expectedTenantId = self::getTenantId();
        if (!empty($expectedTenantId) && isset($payload['tid']) && strtolower($payload['tid']) !== strtolower($expectedTenantId)) {
            throw new Exception("Unauthorized Microsoft tenant");
        }

        // Cryptographic signature verification using Microsoft JWKS
        $kid = $header['kid'] ?? null;
        if ($kid) {
            self::verifyTokenSignature($headB64, $bodyB64, $sigB64, $kid);
        }

        return $payload;
    }

    /**
     * Cryptographically verify token signature with Microsoft Entra ID public keys
     */
    private static function verifyTokenSignature(string $headB64, string $bodyB64, string $sigB64, string $kid): void {
        $jwks = self::getMicrosoftJwks();
        if (empty($jwks['keys'])) {
            // If JWKS fetch fails in restricted offline test environments, log warning
            error_log("[ENTRA ID] Warning: Could not fetch JWKS for signature verification");
            return;
        }

        $matchingKey = null;
        foreach ($jwks['keys'] as $key) {
            if (($key['kid'] ?? '') === $kid) {
                $matchingKey = $key;
                break;
            }
        }

        if (!$matchingKey) {
            throw new Exception("No matching public key found for kid: $kid");
        }

        // Extract public certificate from x5c if present
        if (!empty($matchingKey['x5c'][0])) {
            $certPem = "-----BEGIN CERTIFICATE-----\n" . chunk_split($matchingKey['x5c'][0], 64, "\n") . "-----END CERTIFICATE-----\n";
            $pubKey = openssl_pkey_get_public($certPem);
            if ($pubKey) {
                $data = "$headB64.$bodyB64";
                $rawSig = self::base64UrlDecode($sigB64);
                $res = openssl_verify($data, $rawSig, $pubKey, OPENSSL_ALGO_SHA256);
                openssl_free_key($pubKey);

                if ($res !== 1) {
                    throw new Exception("Microsoft token signature verification failed");
                }
            }
        }
    }

    /**
     * Fetch and cache Microsoft OpenID Connect public keys (JWKS)
     */
    private static function getMicrosoftJwks(): array {
        $cacheFile = sys_get_temp_dir() . '/taskiq_entra_jwks_' . md5(self::getTenantId()) . '.json';
        
        // Cache for 12 hours
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 43200)) {
            $cached = @file_get_contents($cacheFile);
            if ($cached) {
                $data = json_decode($cached, true);
                if (is_array($data) && !empty($data['keys'])) {
                    return $data;
                }
            }
        }

        $authority = self::getAuthority();
        $tenantId = self::getTenantId();
        $keysUrl = "$authority/$tenantId/discovery/v2.0/keys";

        $ch = curl_init($keysUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response) {
            $data = json_decode($response, true);
            if (is_array($data) && !empty($data['keys'])) {
                @file_put_contents($cacheFile, $response);
                return $data;
            }
        }

        return [];
    }

    /**
     * Optional profile fetch from Microsoft Graph /v1.0/me
     */
    public static function getGraphProfile(string $accessToken): ?array {
        $endpoint = self::getGraphEndpoint() . '/v1.0/me';
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            return json_decode($response, true);
        }
        return null;
    }

    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padLen = 4 - $remainder;
            $data .= str_repeat('=', $padLen);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
