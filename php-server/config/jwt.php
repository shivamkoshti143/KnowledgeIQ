<?php
// php-server/config/jwt.php

class JWT {
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function sign(array $payload, string $secret, int $expiresInSeconds = 28800): string {
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
        $now = time();
        $payload['iat'] = $now;
        $payload['exp'] = $now + $expiresInSeconds;

        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        return "$base64Header.$base64Payload.$base64Signature";
    }

    public static function verify(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        $expectedSig = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
        $expectedBase64Sig = self::base64UrlEncode($expectedSig);

        if (!hash_equals($expectedBase64Sig, $base64Signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Expired
        }

        return $payload;
    }
}
