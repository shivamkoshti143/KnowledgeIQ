<?php
// php-server/utils/upload.php

class UploadHandler {
    public static function getUploadDir(): string {
        $dir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'server' . DIRECTORY_SEPARATOR . 'uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        return $dir;
    }

    public static function handleSingle(string $fieldName, string $prefix = ''): ?array {
        if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $file = $_FILES[$fieldName];
        $origName = $file['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $timestamp = (int)(microtime(true) * 1000);
        $random = rand(100000000, 999999999);
        
        $filename = ($prefix ? "{$prefix}-" : "") . "{$timestamp}-{$random}" . ($ext ? ".{$ext}" : "");
        $destPath = self::getUploadDir() . DIRECTORY_SEPARATOR . $filename;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            return [
                'filename' => $filename,
                'originalname' => $origName,
                'extension' => $ext,
                'url' => "/uploads/{$filename}",
                'size' => $file['size'],
                'mime' => $file['type']
            ];
        }

        return null;
    }

    public static function handleMultiple(string $fieldName): array {
        if (!isset($_FILES[$fieldName])) {
            return [];
        }

        $results = [];
        $files = $_FILES[$fieldName];

        if (is_array($files['name'])) {
            $count = count($files['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                    continue;
                }

                $origName = $files['name'][$i];
                $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                $timestamp = (int)(microtime(true) * 1000);
                $random = rand(100000000, 999999999);

                $filename = "{$timestamp}-{$random}" . ($ext ? ".{$ext}" : "");
                $destPath = self::getUploadDir() . DIRECTORY_SEPARATOR . $filename;

                if (move_uploaded_file($files['tmp_name'][$i], $destPath)) {
                    $results[] = [
                        'filename' => $filename,
                        'originalname' => $origName,
                        'extension' => $ext,
                        'url' => "/uploads/{$filename}",
                        'size' => $files['size'][$i],
                        'mime' => $files['type'][$i]
                    ];
                }
            }
        }

        return $results;
    }
}
