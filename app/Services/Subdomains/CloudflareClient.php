<?php

namespace Pterodactyl\Services\Subdomains;

use GuzzleHttp\Client;
use Psr\Log\LoggerInterface;
use Illuminate\Support\Facades\Cache;
use GuzzleHttp\Exception\GuzzleException;
use Pterodactyl\Exceptions\DisplayException;

/**
 * Thin wrapper over the slice of the Cloudflare v4 API we use: creating,
 * repointing and deleting DNS records in a single zone.
 *
 * Cloudflare will happily return HTTP 200 with {"success": false} in the body,
 * so every response goes through the same unwrap before anyone sees it.
 */
class CloudflareClient
{
    private const API = 'https://api.cloudflare.com/client/v4';

    public function __construct(private LoggerInterface $log)
    {
    }

    public function configured(): bool
    {
        return !empty(config('subdomains.cloudflare.token'))
            && !empty(config('subdomains.cloudflare.zone_id'))
            && !empty(config('subdomains.domain'));
    }

    /**
     * Point a name at an IPv4 address, returning Cloudflare's record ID.
     *
     * @throws DisplayException
     */
    public function createARecord(string $fqdn, string $ip, string $comment = ''): string
    {
        $response = $this->request('POST', "/zones/{$this->zone()}/dns_records", [
            'type' => 'A',
            'name' => $fqdn,
            'content' => $ip,
            'ttl' => (int) config('subdomains.ttl', 120),
            // Game traffic is not HTTP. Behind the orange cloud it silently
            // stops working, so this must never be true.
            'proxied' => false,
            'comment' => $comment,
        ]);

        return $response['id'];
    }

    /**
     * @throws DisplayException
     */
    public function updateARecord(string $recordId, string $fqdn, string $ip, string $comment = ''): void
    {
        $this->request('PUT', "/zones/{$this->zone()}/dns_records/{$recordId}", [
            'type' => 'A',
            'name' => $fqdn,
            'content' => $ip,
            'ttl' => (int) config('subdomains.ttl', 120),
            'proxied' => false,
            'comment' => $comment,
        ]);
    }

    /**
     * Best-effort delete. A record that is already gone is a success as far as
     * callers are concerned - the desired end state is "no such record".
     */
    public function deleteRecord(string $recordId): void
    {
        try {
            $this->request('DELETE', "/zones/{$this->zone()}/dns_records/{$recordId}");
        } catch (DisplayException $exception) {
            $this->log->warning('Failed to delete Cloudflare record; it may be orphaned in the zone.', [
                'record_id' => $recordId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Look for an existing record with this exact name. Used to catch names
     * that exist in the zone but not in our database, which would otherwise
     * fail confusingly at create time.
     *
     * @throws DisplayException
     */
    public function findRecordByName(string $fqdn): ?array
    {
        $response = $this->request('GET', "/zones/{$this->zone()}/dns_records?" . http_build_query([
            'name' => $fqdn,
            'per_page' => 1,
        ]));

        return $response[0] ?? null;
    }

    /**
     * The domain the configured zone ID actually belongs to.
     *
     * Worth an API call because Cloudflare does not reject a record whose name
     * falls outside the zone - it treats it as a relative label and appends the
     * zone name, so pointing at the wrong zone silently produces records like
     * "myserver.playlumix.gg.playlumix.us" instead of failing. Cached because
     * a zone's name effectively never changes.
     *
     * @throws DisplayException
     */
    public function zoneName(): string
    {
        return Cache::remember('subdomains.zone_name.' . $this->zone(), now()->addHour(), function () {
            $response = $this->request('GET', "/zones/{$this->zone()}");

            return strtolower($response['name'] ?? '');
        });
    }

    private function zone(): string
    {
        return (string) config('subdomains.cloudflare.zone_id');
    }

    /**
     * Issue a request and unwrap Cloudflare's envelope, turning anything that
     * isn't a success into a DisplayException carrying their error text.
     *
     * @throws DisplayException
     */
    private function request(string $method, string $path, array $payload = null): array
    {
        $client = new Client([
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . config('subdomains.cloudflare.token'),
                'Content-Type' => 'application/json',
            ],
        ]);

        try {
            // Full URL rather than base_uri + relative path on purpose: Guzzle
            // resolves per RFC 3986, so a path starting with "/" replaces the
            // base path and silently drops the /client/v4 prefix.
            $response = $client->request($method, self::API . $path, $payload === null ? [] : ['json' => $payload]);
            $body = json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $exception) {
            // Try to surface Cloudflare's message rather than a bare 400.
            $message = $exception->getMessage();
            if (method_exists($exception, 'getResponse') && $exception->getResponse()) {
                $decoded = json_decode($exception->getResponse()->getBody()->getContents(), true);
                if (!empty($decoded['errors'])) {
                    $message = $this->flattenErrors($decoded['errors']);
                }
            }

            $this->log->error('Cloudflare API request failed.', [
                'method' => $method,
                'path' => $path,
                'error' => $message,
            ]);

            throw new DisplayException('Could not reach Cloudflare to update DNS: ' . $message);
        }

        if (!is_array($body) || ($body['success'] ?? false) !== true) {
            $message = $this->flattenErrors($body['errors'] ?? []);

            $this->log->error('Cloudflare API returned an unsuccessful response.', [
                'method' => $method,
                'path' => $path,
                'error' => $message,
            ]);

            throw new DisplayException('Cloudflare rejected the DNS change: ' . $message);
        }

        return $body['result'] ?? [];
    }

    private function flattenErrors(array $errors): string
    {
        if (empty($errors)) {
            return 'unknown error';
        }

        return implode('; ', array_map(
            fn ($error) => trim(sprintf('%s %s', $error['code'] ?? '', $error['message'] ?? '')),
            $errors
        ));
    }
}
