<?php
// php-server/utils/response.php

function json_response(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Connection: close');
    $body = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    header('Content-Length: ' . strlen($body));
    echo $body;
    exit;
}

function error_response(string $message, int $statusCode = 400): void {
    json_response(['message' => $message], $statusCode);
}

function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST;
}
