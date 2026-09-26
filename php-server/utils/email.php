<?php
// php-server/utils/email.php

class Mailer {
    /**
     * Send OTP email using Microsoft 365 / Outlook SMTP or configured SMTP server.
     * Falls back gracefully to error logging if SMTP is not configured or fails.
     */
    public static function sendOtpEmail(string $toEmail, string $otp, string $purpose): array {
        $isSignup = ($purpose === "signup");
        $subject = $isSignup 
            ? "ABM TaskIQ - Verify your email to complete registration" 
            : "ABM TaskIQ - Your login verification code";

        $smtpHost = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? '');
        $smtpPort = (int)(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 587));
        $smtpUser = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? '');
        $smtpPass = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? '');
        $smtpFrom = getenv('SMTP_FROM') ?: ($_ENV['SMTP_FROM'] ?? ($smtpUser ?: 'no-reply@abmindia.com'));
        $smtpSecure = strtolower(getenv('SMTP_SECURE') ?: ($_ENV['SMTP_SECURE'] ?? ($smtpPort === 465 ? 'ssl' : 'tls')));

        // If credentials are empty, log fallback
        if (empty($smtpHost) || empty($smtpUser) || empty($smtpPass)) {
            error_log("[EMAIL FALLBACK - MISSING SMTP CONFIG] To: {$toEmail} | Subject: {$subject} | OTP: {$otp}");
            return [
                'success' => false,
                'fallback' => true,
                'message' => 'SMTP credentials not configured. OTP logged to server console.'
            ];
        }

        $htmlBody = self::buildOtpEmailHtml($otp, $purpose, $toEmail);

        try {
            self::sendSmtpMail(
                $smtpHost,
                $smtpPort,
                $smtpSecure,
                $smtpUser,
                $smtpPass,
                $smtpFrom,
                $toEmail,
                $subject,
                $htmlBody
            );

            error_log("[EMAIL SENT] Successfully sent OTP to {$toEmail}");
            return ['success' => true, 'fallback' => false];
        } catch (Throwable $e) {
            error_log("[EMAIL ERROR] Failed to send OTP to {$toEmail}: " . $e->getMessage());

            // If Microsoft 365 tenant has SMTP Client Auth disabled (535 5.7.139), try Direct Send via MX
            if (str_contains($e->getMessage(), '5.7.139') || str_contains(strtolower($e->getMessage()), 'smtpclientauthentication')) {
                try {
                    error_log("[EMAIL INFO] Microsoft 365 SMTP Auth disabled for tenant. Falling back to Direct Send to {$toEmail}...");
                    $directHost = 'abmindia-com.mail.eo.outlook.com';
                    $directFrom = !empty($smtpUser) ? $smtpUser : $smtpFrom;

                    self::sendSmtpMail(
                        $directHost,
                        25,
                        'tls',
                        '',
                        '',
                        $directFrom,
                        $toEmail,
                        $subject,
                        $htmlBody
                    );

                    error_log("[EMAIL SENT] Successfully delivered OTP to {$toEmail} via Direct Send");
                    return ['success' => true, 'fallback' => false, 'method' => 'direct_send'];
                } catch (Throwable $directErr) {
                    error_log("[EMAIL ERROR] Direct Send also failed: " . $directErr->getMessage());
                }
            }

            error_log("[EMAIL FALLBACK DUE TO ERROR] To: {$toEmail} | OTP: {$otp}");
            return [
                'success' => false,
                'fallback' => true,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send email directly via SMTP socket with STARTTLS / SSL support.
     */
    private static function sendSmtpMail(
        string $host,
        int $port,
        string $secure,
        string $user,
        string $pass,
        string $from,
        string $to,
        string $subject,
        string $htmlBody
    ): void {
        $timeout = 15;
        $scheme = ($secure === 'ssl' || $port === 465) ? 'ssl://' : 'tcp://';
        $remote = $scheme . $host . ':' . $port;

        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $socket = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            throw new Exception("Could not connect to SMTP server {$remote}: {$errstr} ({$errno})");
        }

        stream_set_timeout($socket, $timeout);

        self::expectResponse($socket, '220', "SMTP Connection greeting failed");

        $clientHost = gethostname() ?: 'localhost';
        self::sendCommand($socket, "EHLO {$clientHost}");
        self::expectResponse($socket, '250', "EHLO failed");

        // STARTTLS handshake for port 587 or tls mode
        if ($secure === 'tls' || ($port === 587 && $scheme === 'tcp://')) {
            self::sendCommand($socket, "STARTTLS");
            self::expectResponse($socket, '220', "STARTTLS negotiation rejected");

            $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }

            $cryptoSuccess = stream_socket_enable_crypto($socket, true, $cryptoMethod);
            if (!$cryptoSuccess) {
                throw new Exception("STARTTLS encryption handshake failed");
            }

            // Resend EHLO after encryption established
            self::sendCommand($socket, "EHLO {$clientHost}");
            self::expectResponse($socket, '250', "Post-TLS EHLO failed");
        }

        // Authenticate if credentials are provided and not port 25 direct send
        if (!empty($user) && !empty($pass) && $port !== 25) {
            self::sendCommand($socket, "AUTH LOGIN");
            self::expectResponse($socket, '334', "AUTH LOGIN rejected");

            self::sendCommand($socket, base64_encode($user));
            self::expectResponse($socket, '334', "Username rejected");

            self::sendCommand($socket, base64_encode($pass));
            self::expectResponse($socket, '235', "Authentication failed (Invalid password or app password required)");
        }

        // Mail transaction
        $senderEmail = self::extractEmail($from);
        self::sendCommand($socket, "MAIL FROM:<{$senderEmail}>");
        self::expectResponse($socket, '250', "MAIL FROM rejected");

        $recipientEmail = self::extractEmail($to);
        self::sendCommand($socket, "RCPT TO:<{$recipientEmail}>");
        self::expectResponse($socket, '250', "RCPT TO rejected");

        self::sendCommand($socket, "DATA");
        self::expectResponse($socket, '354', "DATA command rejected");

        // Headers & MIME Body
        $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
        $fromHeader = str_contains($from, '<') ? $from : "ABM TaskIQ <{$from}>";
        $headers = [
            "Date: " . date('r'),
            "From: {$fromHeader}",
            "Reply-To: {$fromHeader}",
            "To: <{$recipientEmail}>",
            "Subject: {$encodedSubject}",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "X-Mailer: ABM-TaskIQ-Mailer/1.0"
        ];

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.\r\n";
        fwrite($socket, $payload);
        self::expectResponse($socket, '250', "Failed to send message data");

        self::sendCommand($socket, "QUIT");
        @fclose($socket);
    }

    private static function sendCommand($socket, string $command): void {
        fwrite($socket, $command . "\r\n");
    }

    private static function expectResponse($socket, string $expectedCode, string $errorPrefix): string {
        $response = '';
        while (!feof($socket)) {
            $line = fgets($socket, 1024);
            if ($line === false) break;
            $response .= $line;
            // End of multiline SMTP response has space at position 3, e.g. "250 OK"
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }

        $code = substr(trim($response), 0, 3);
        if ($code !== $expectedCode) {
            throw new Exception("{$errorPrefix}: {$response}");
        }

        return $response;
    }

    private static function extractEmail(string $str): string {
        if (preg_match('/<([^>]+)>/', $str, $matches)) {
            return trim($matches[1]);
        }
        return trim($str);
    }

    /**
     * Build branded HTML email template.
     */
    private static function buildOtpEmailHtml(string $otp, string $purpose, string $toEmail): string {
        $isSignup = ($purpose === "signup");
        $title = $isSignup ? "Verify your email address" : "Your login verification code";
        $intro = $isSignup 
            ? "Welcome to <strong>ABM TaskIQ</strong>! Please use the One-Time Password (OTP) below to verify your email address and activate your account."
            : "We received a sign-in request for your <strong>ABM TaskIQ</strong> account. Use the verification code below to sign in.";

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 32px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">ABM TaskIQ</div>
                    <div style="font-size: 12px; color: #93c5fd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;">Smart Task Guidance & Learning Platform</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">{$title}</h2>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                {$intro}
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Your 6-Digit One-Time Code</span>
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; display: inline-block;">{$otp}</span>
                <div style="font-size: 12.5px; color: #64748b; margin-top: 10px;">
                  ⏳ Valid for <strong>10 minutes</strong> only
                </div>
              </div>

              <p style="font-size: 13.5px; line-height: 1.5; color: #64748b; margin: 0 0 16px;">
                Enter this verification code on the registration screen to complete your setup.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; font-size: 12.5px; color: #78350f; line-height: 1.5;">
                <strong>Security note:</strong> Never share this OTP with anyone. ABM team members will never ask for your verification code. If you did not initiate this request, please disregard this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              This is an automated notification from ABM TaskIQ for <strong>{$toEmail}</strong>.<br>
              &copy; 2026 ABM Knowledgeware. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}
