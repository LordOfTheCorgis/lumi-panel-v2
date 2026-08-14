<?php

namespace Pterodactyl\Services\Subdomains;

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ServerSubdomain;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Exceptions\DisplayException;

/**
 * Owns the rules around customer-chosen subdomains and keeps the database and
 * Cloudflare in step.
 *
 * The ordering in here is deliberate: the database row is written first inside
 * a transaction, so two people racing for the same name lose on the unique
 * index rather than both getting as far as creating a DNS record.
 */
class SubdomainService
{
    public function __construct(
        private ConnectionInterface $connection,
        private CloudflareClient $cloudflare,
    ) {
    }

    public function enabled(): bool
    {
        return (bool) config('subdomains.enabled') && $this->cloudflare->configured();
    }

    public function baseDomain(): string
    {
        return (string) config('subdomains.domain');
    }

    /**
     * Claim a name for a server and publish the DNS record.
     *
     * @throws DisplayException
     */
    public function create(Server $server, string $label): ServerSubdomain
    {
        $this->assertEnabled();
        $this->assertZoneMatchesDomain();

        $label = $this->normalize($label);
        $this->assertValidLabel($label);

        if ($server->subdomain()->exists()) {
            throw new DisplayException('This server already has a subdomain. Remove the existing one first.');
        }

        $domain = $this->baseDomain();
        $fqdn = $label . '.' . $domain;
        $target = $this->resolveTarget($server);
        $port = $server->allocation?->port;

        // A name that exists in the zone but not in our table is either an
        // orphan from a failed cleanup or something an admin added by hand.
        // Either way, refusing beats clobbering it.
        if ($this->cloudflare->findRecordByName($fqdn) !== null) {
            throw new DisplayException('That subdomain is already in use. Please pick another.');
        }

        $subdomain = $this->connection->transaction(function () use ($server, $label, $domain, $target, $port) {
            return ServerSubdomain::query()->create([
                'server_id' => $server->id,
                'subdomain' => $label,
                'domain' => $domain,
                'zone_id' => (string) config('subdomains.cloudflare.zone_id'),
                'record_target' => $target,
                'record_port' => $port,
            ]);
        });

        $comment = sprintf('Lumi Panel: server %s', $server->uuidShort);
        $recordId = null;

        try {
            $recordId = $this->cloudflare->createARecord($fqdn, $target, $comment);

            // The SRV record is what removes the port from the address players
            // type. Without it the name still works, but only with ":port".
            $srvRecordId = $port ? $this->cloudflare->createSrvRecord($fqdn, $port, $comment) : null;
        } catch (DisplayException $exception) {
            // Don't leave a row claiming a name that has no record behind it,
            // or a stray A record if the SRV half failed.
            if ($recordId) {
                $this->cloudflare->deleteRecord($recordId);
            }
            $subdomain->delete();

            throw $exception;
        }

        $subdomain->forceFill(['record_id' => $recordId, 'srv_record_id' => $srvRecordId])->save();

        return $subdomain;
    }

    /**
     * Release a name and remove its record.
     */
    public function delete(ServerSubdomain $subdomain): void
    {
        if ($subdomain->record_id) {
            $this->cloudflare->deleteRecord($subdomain->record_id);
        }

        if ($subdomain->srv_record_id) {
            $this->cloudflare->deleteRecord($subdomain->srv_record_id);
        }

        $subdomain->delete();
    }

    /**
     * Repoint an existing record, e.g. after a transfer to another node. Safe
     * to call when nothing has changed - it no-ops.
     */
    public function sync(ServerSubdomain $subdomain): void
    {
        if (!$this->enabled() || !$subdomain->record_id) {
            return;
        }

        $server = $subdomain->server;
        if (!$server) {
            return;
        }

        try {
            $target = $this->resolveTarget($server);
        } catch (DisplayException $exception) {
            Log::warning('Skipping subdomain sync; could not resolve a target address.', [
                'subdomain' => $subdomain->fqdn,
                'error' => $exception->getMessage(),
            ]);

            return;
        }

        $port = $server->allocation?->port;
        $comment = sprintf('Lumi Panel: server %s', $server->uuidShort);

        if ($target !== $subdomain->record_target) {
            $this->cloudflare->updateARecord($subdomain->record_id, $subdomain->fqdn, $target, $comment);
            $subdomain->forceFill(['record_target' => $target])->save();
        }

        // The primary allocation can change independently of the node, which
        // moves the port without moving the address.
        if ($port && $port !== $subdomain->record_port) {
            if ($subdomain->srv_record_id) {
                $this->cloudflare->updateSrvRecord($subdomain->srv_record_id, $subdomain->fqdn, $port, $comment);
            } else {
                // Claimed before SRV support existed, or the SRV half failed
                // at create time. Either way, backfill it.
                $subdomain->forceFill([
                    'srv_record_id' => $this->cloudflare->createSrvRecord($subdomain->fqdn, $port, $comment),
                ])->save();
            }

            $subdomain->forceFill(['record_port' => $port])->save();
        }
    }

    /**
     * Lowercase and trim - people will paste "  MyServer.playlumix.gg " and
     * mean "myserver".
     */
    public function normalize(string $label): string
    {
        // Strip surrounding dots first, otherwise the fully-qualified form
        // "myserver.playlumix.gg." misses the suffix check below.
        $label = trim(strtolower(trim($label)), '.');

        $domain = strtolower($this->baseDomain());
        if ($domain !== '') {
            $suffix = '.' . $domain;
            if (str_ends_with($label, $suffix)) {
                $label = substr($label, 0, -strlen($suffix));
            }
        }

        return trim($label, '.');
    }

    /**
     * @throws DisplayException
     */
    public function assertValidLabel(string $label): void
    {
        $min = (int) config('subdomains.min_length', 3);
        $max = (int) config('subdomains.max_length', 32);

        if (strlen($label) < $min || strlen($label) > $max) {
            throw new DisplayException("Subdomains must be between {$min} and {$max} characters.");
        }

        // RFC 1123 label: alphanumeric with internal hyphens only.
        if (!preg_match('/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/', $label)) {
            throw new DisplayException('Subdomains may only contain letters, numbers and hyphens, and cannot start or end with a hyphen.');
        }

        // Reserved for IDN. Nothing good comes of letting people register these.
        if (str_starts_with($label, 'xn--')) {
            throw new DisplayException('That subdomain is not available.');
        }

        if (in_array($label, config('subdomains.reserved', []), true)) {
            throw new DisplayException('That subdomain is reserved. Please pick another.');
        }

        if (ServerSubdomain::query()->where('subdomain', $label)->where('domain', $this->baseDomain())->exists()) {
            throw new DisplayException('That subdomain is already in use. Please pick another.');
        }
    }

    /**
     * Work out what IP the record should point at.
     *
     * The primary allocation's IP is the address players are given today, so
     * it's the correct target. Some installs bind servers to a private address
     * and NAT them, though, in which case publishing it would be useless - fall
     * back to whatever the node's FQDN resolves to before giving up.
     *
     * @throws DisplayException
     */
    private function resolveTarget(Server $server): string
    {
        $allocation = $server->allocation;
        if (!$allocation) {
            throw new DisplayException('This server has no primary allocation, so there is nothing to point a subdomain at.');
        }

        if ($this->isPublicIpv4($allocation->ip)) {
            return $allocation->ip;
        }

        $fqdn = $server->node?->fqdn;
        if ($fqdn && filter_var($fqdn, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && $this->isPublicIpv4($fqdn)) {
            return $fqdn;
        }

        if ($fqdn) {
            $resolved = gethostbyname($fqdn);
            if ($resolved !== $fqdn && $this->isPublicIpv4($resolved)) {
                return $resolved;
            }
        }

        throw new DisplayException(
            'Could not determine a public address for this server\'s node. An administrator needs to set a public IP on the allocation or node FQDN.'
        );
    }

    private function isPublicIpv4(?string $ip): bool
    {
        if (empty($ip)) {
            return false;
        }

        return (bool) filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    /**
     * Refuse to write anything if the configured zone isn't the configured
     * domain. Getting this wrong doesn't error at Cloudflare - it appends the
     * real zone to whatever you send, so every record comes out as
     * "name.intended-domain.actual-zone" and nothing resolves.
     *
     * @throws DisplayException
     */
    public function assertZoneMatchesDomain(): void
    {
        $zone = $this->cloudflare->zoneName();
        $domain = strtolower($this->baseDomain());

        if ($zone !== $domain) {
            Log::error('Subdomain zone mismatch; refusing to write DNS records.', [
                'configured_domain' => $domain,
                'zone_actually_is' => $zone,
            ]);

            throw new DisplayException(
                'Subdomains are misconfigured on this panel: the Cloudflare zone does not match the configured domain. An administrator needs to fix this.'
            );
        }
    }

    /**
     * @throws DisplayException
     */
    private function assertEnabled(): void
    {
        if (!$this->enabled()) {
            throw new DisplayException('Subdomains are not configured on this panel.');
        }
    }
}
