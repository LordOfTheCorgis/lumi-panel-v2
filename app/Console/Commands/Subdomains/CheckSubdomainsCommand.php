<?php

namespace Pterodactyl\Console\Commands\Subdomains;

use Illuminate\Console\Command;
use Pterodactyl\Services\Subdomains\CloudflareClient;
use Pterodactyl\Services\Subdomains\SubdomainService;

/**
 * Validates the subdomain configuration end to end without writing anything.
 *
 * Exists because the failure that motivated it was invisible: a zone ID for the
 * wrong domain still creates records happily, Cloudflare just silently appends
 * the real zone name. Better to have one command that says so.
 */
class CheckSubdomainsCommand extends Command
{
    protected $signature = 'p:subdomains:check';

    protected $description = 'Verify the Cloudflare token, zone and base domain line up.';

    public function handle(SubdomainService $service, CloudflareClient $cloudflare): int
    {
        if (!config('subdomains.enabled')) {
            $this->components->warn('SUBDOMAINS_ENABLED is off. The feature is hidden and the endpoints refuse.');

            return self::FAILURE;
        }

        $domain = config('subdomains.domain');
        $this->components->twoColumnDetail('Base domain', $domain ?: '<fg=red>not set</>');
        $this->components->twoColumnDetail('Zone ID', config('subdomains.cloudflare.zone_id') ? 'set' : '<fg=red>not set</>');
        $this->components->twoColumnDetail('API token', config('subdomains.cloudflare.token') ? 'set' : '<fg=red>not set</>');

        if (!$cloudflare->configured()) {
            $this->components->error('Configuration is incomplete; set the values above in your .env.');

            return self::FAILURE;
        }

        try {
            $zone = $cloudflare->zoneName();
        } catch (\Exception $exception) {
            $this->components->error('Could not reach Cloudflare: ' . $exception->getMessage());

            return self::FAILURE;
        }

        $this->components->twoColumnDetail('Zone resolves to', $zone);

        if (strtolower($zone) !== strtolower((string) $domain)) {
            $this->components->error(sprintf(
                'Zone mismatch: CLOUDFLARE_ZONE_ID belongs to "%s" but SUBDOMAIN_BASE_DOMAIN is "%s".',
                $zone,
                $domain
            ));
            $this->line('  Records would be created as "<name>.' . $domain . '.' . $zone . '" and never resolve.');
            $this->line('  Fix the zone ID (and the token\'s zone scope), or set the base domain to ' . $zone . '.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->components->info('Subdomains are configured correctly.');

        return self::SUCCESS;
    }
}
