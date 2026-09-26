<?php
// php-server/config/database.php

class Database {
    private static ?PDO $pdo = null;

    public static function loadEnv(?string $filePath = null): void {
        if ($filePath === null) {
            $filePath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';
        }
        if (!file_exists($filePath)) {
            return;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }
            if (str_contains($line, '=')) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
                putenv("$key=$value");
            }
        }
    }

    public static function getConnection(): PDO {
        if (self::$pdo === null) {
            self::loadEnv();

            $host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
            $port = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306');
            $db   = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'knowledgeiq');
            $user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'root');
            $pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : ($_ENV['DB_PASSWORD'] ?? '');

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$pdo = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['message' => 'Database connection failed: ' . $e->getMessage()]);
                exit;
            }
        }

        return self::$pdo;
    }
}

Database::loadEnv();
