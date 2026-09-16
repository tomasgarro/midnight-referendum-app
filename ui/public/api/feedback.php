<?php
declare(strict_types=1);

// Fixed-recipient feedback only. No account/session/credential data is read.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, bool $ok): never {
    http_response_code($status);
    echo json_encode(['ok' => $ok]);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false);
}
if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', ['https://midnight.vote', 'https://www.midnight.vote'], true)) {
    respond(403, false);
}
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    respond(415, false);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 18000) respond(413, false);
$raw = file_get_contents('php://input', false, null, 0, 18001);
if ($raw === false || strlen($raw) > 18000) respond(413, false);
$input = json_decode($raw, true);
if (!is_array($input)) respond(400, false);
$message = $input['message'] ?? null;
$email = $input['email'] ?? '';
$locale = $input['locale'] ?? 'en';
$requestId = $input['requestId'] ?? '';
if (!is_string($message) || !is_string($email) || !is_string($requestId)
    || !in_array($locale, ['en', 'es', 'fr'], true)
    || !preg_match('/^[a-f0-9-]{36}$/i', $requestId)) respond(400, false);
$message = trim($message);
$email = trim($email);
if (mb_strlen($message, 'UTF-8') < 10 || mb_strlen($message, 'UTF-8') > 4000
    || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $message)
    || strlen($email) > 254 || preg_match('/[\r\n]/', $email)
    || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) respond(400, false);
if (($input['website'] ?? '') !== '') respond(400, false);

// A single locked file bounds global volume and avoids concurrent-send races.
// Counters and opaque deduplication keys only; never message bodies or raw IPs.
// Daily rotation discards identifiers, with 0600 permissions outside public_html.
$stateFile = sys_get_temp_dir() . '/midnight-feedback-' . hash('sha256', __DIR__) . '.json';
$handle = @fopen($stateFile, 'c+');
if (!$handle || !flock($handle, LOCK_EX)) respond(503, false);
@chmod($stateFile, 0600);
$state = json_decode(stream_get_contents($handle), true);
$now = time();
$day = gmdate('Y-m-d');
if (!is_array($state) || ($state['day'] ?? '') !== $day) {
    $state = ['day' => $day, 'salt' => bin2hex(random_bytes(32)), 'count' => 0, 'recent' => [], 'clients' => [], 'sent' => []];
}
$client = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $state['salt']);
$key = hash_hmac('sha256', $requestId . "\n" . $message . "\n" . $email, $state['salt']);
if (isset($state['sent'][$key])) { flock($handle, LOCK_UN); fclose($handle); respond(200, true); }
$state['recent'] = array_values(array_filter($state['recent'], fn($t) => $now - $t < 60));
$recent = array_values(array_filter($state['clients'][$client] ?? [], fn($t) => $now - $t < 900));
if ($state['count'] >= 60 || count($state['recent']) >= 6 || count($recent) >= 3) {
    flock($handle, LOCK_UN); fclose($handle); header('Retry-After: 900'); respond(429, false);
}
$headers = ['From' => 'midnight.vote feedback <contact@midnight.vote>',
    'MIME-Version' => '1.0', 'Content-Type' => 'text/plain; charset=UTF-8'];
if ($email !== '') $headers['Reply-To'] = $email;
$body = "Website feedback ($locale)\nReference: $requestId\n\n$message";
$accepted = @mail('contact@midnight.vote', 'midnight.vote website feedback', $body, $headers, '-fcontact@midnight.vote');
// Count failed attempts too: a mail outage must not allow unlimited send attempts.
$state['count']++;
$state['recent'][] = $now;
$recent[] = $now;
$state['clients'][$client] = $recent;
if ($accepted) $state['sent'][$key] = true;
rewind($handle); ftruncate($handle, 0); fwrite($handle, json_encode($state)); fflush($handle);
flock($handle, LOCK_UN); fclose($handle);
// mail() acceptance is queue acceptance, not proof of inbox delivery.
respond($accepted ? 202 : 503, $accepted);
