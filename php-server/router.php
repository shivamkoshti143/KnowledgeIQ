<?php
// php-server/router.php
// Router script for PHP built-in web server: php -S localhost:4001 php-server/router.php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Serve static files from server/uploads
if (str_starts_with($uri, '/uploads/')) {
    $filePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'server' . DIRECTORY_SEPARATOR . ltrim($uri, '/');
    if (file_exists($filePath) && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
            'pdf'  => 'application/pdf',
            'mp4'  => 'video/mp4',
            'webm' => 'video/webm',
            'json' => 'application/json',
            'txt'  => 'text/plain',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        header("Content-Type: " . ($mimes[$ext] ?? 'application/octet-stream'));
        readfile($filePath);
        exit;
    }
}

// 2. Delegate everything else to the API dispatcher
require_once __DIR__ . '/index.php';
