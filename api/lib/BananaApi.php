<?php
declare(strict_types=1);

final class BananaApi
{
    // Only accept puzzle images from hosts the API is known to use.
    private const IMAGE_HOSTS = ['www.sanfoh.com', 'sanfoh.com', 'marcconrad.com', 'www.marcconrad.com'];

    public function __construct(private string $endpoint, private ?string $caBundle = null, private int $timeout = 6) {}

    public function fetchPuzzle(int $attempts = 2): array
    {
        $lastError = 'unknown';
        for ($i = 0; $i < $attempts; $i++) {
            try {
                return $this->requestOnce();
            } catch (RuntimeException $e) {
                $lastError = $e->getMessage();
                usleep(250_000);
            }
        }
        throw new RuntimeException("Banana API unavailable ($lastError)");
    }

    private function requestOnce(): array
    {
        $ch = curl_init($this->endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_USERAGENT      => 'BananaCatchQuiz/1.0 (student project)',
        ]);
        if ($this->caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $this->caBundle);
        }
        $raw = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) throw new RuntimeException("network: $err");
        if ($status !== 200) throw new RuntimeException("HTTP $status");

        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['question'], $data['solution'])) {
            throw new RuntimeException('unexpected JSON shape');
        }

        $image = (string)$data['question'];
        $parts = parse_url($image);
        if (!$parts || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)
            || !in_array(strtolower($parts['host'] ?? ''), self::IMAGE_HOSTS, true)) {
            throw new RuntimeException('image URL not allowed');
        }
        $image = preg_replace('#^http://#i', 'https://', $image);

        $solution = filter_var($data['solution'], FILTER_VALIDATE_INT);
        if ($solution === false) throw new RuntimeException('solution is not an integer');

        return ['image' => $image, 'solution' => $solution];
    }
}
