<?php
// php-server/services/ai.service.php

require_once __DIR__ . '/../utils/db.php';

class AIService {
    private const OPENROUTER_API_KEY = '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';
    private const SYSTEM_PROMPT = "You are ABM TaskIQ Assistant. CRITICAL: Answer ONLY using the portal content provided below. Do NOT use outside knowledge. If the answer is not in the portal content, say \"I couldn't find that in our portal.\" Keep answers concise. Reference items as [REF:id:TYPE:Title].";

    public static function callOpenRouter(array $messages, string $model = 'meta-llama/llama-4-maverick:free'): array {
        $body = json_encode([
            'model' => $model,
            'messages' => array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], $messages)
        ]);

        $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . self::OPENROUTER_API_KEY
            ]
        ]);

        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err || $httpCode >= 400 || !$resp) {
            throw new RuntimeException($err ?: "OpenRouter error HTTP {$httpCode}");
        }

        $data = json_decode($resp, true);
        $reply = $data['choices'][0]['message']['content'] ?? '';
        return ['reply' => $reply, 'raw' => $data];
    }

    public static function searchPortalContent(string $query, ?int $departmentId = null): array {
        $term = trim($query);
        if (empty($term)) return [];
        $words = preg_split('/\s+/', strtolower($term), -1, PREG_SPLIT_NO_EMPTY);
        if (empty($words)) return [];

        $filters = $departmentId !== null ? ['departmentId' => $departmentId] : [];
        $tasks = DB::getTasks($filters);
        $knowledge = DB::getKnowledgePosts($filters);
        $videos = DB::getVideos($filters);

        $items = [];
        foreach ($tasks as $t) {
            $items[] = ['id' => $t['id'], 'type' => 'task', 'title' => $t['title'], 'description' => $t['description'] ?? '', 'tags' => $t['tags'] ?? ''];
        }
        foreach ($knowledge as $k) {
            $items[] = ['id' => $k['id'], 'type' => 'knowledge', 'title' => $k['title'], 'description' => $k['description'] ?? '', 'tags' => $k['tags'] ?? ''];
        }
        foreach ($videos as $v) {
            $items[] = ['id' => $v['id'], 'type' => 'video', 'title' => $v['title'], 'description' => $v['description'] ?? '', 'tags' => $v['tags'] ?? ''];
        }

        $scored = [];
        foreach ($items as $item) {
            $hay = strtolower("{$item['title']} {$item['description']} {$item['tags']}");
            $score = 0;
            foreach ($words as $w) {
                if (str_contains($hay, $w)) {
                    $score++;
                }
            }
            if ($score > 0) {
                $item['score'] = $score;
                $scored[] = $item;
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, 8);
    }

    public static function buildPortalAnswer(string $query, ?int $departmentId = null): array {
        $context = self::searchPortalContent($query, $departmentId);
        if (empty($context)) {
            return ['reply' => "I couldn't find that in our portal.", 'references' => []];
        }

        $lines = [];
        foreach ($context as $idx => $item) {
            $title = $item['title'] ?: 'Untitled';
            $desc = !empty($item['description']) ? ' - ' . mb_substr($item['description'], 0, 120) : '';
            $num = $idx + 1;
            $lines[] = "{$num}. [REF:{$item['id']}:{$item['type']}:{$title}]{$desc}";
        }

        $reply = "I found these items in our portal:\n\n" . implode("\n", $lines) . "\n\nClick any item above to open its details.";
        $refs = array_map(fn($item) => ['id' => $item['id'], 'type' => $item['type'], 'title' => $item['title']], $context);

        return ['reply' => $reply, 'references' => $refs];
    }
}
