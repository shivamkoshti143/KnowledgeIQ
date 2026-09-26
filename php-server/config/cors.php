<?php
// php-server/config/cors.php

function handleCors(): void {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With");
    header("Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
