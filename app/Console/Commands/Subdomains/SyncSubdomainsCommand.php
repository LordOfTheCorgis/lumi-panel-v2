<?php

namespace Pterodactyl\Console\Commands\Subdomains;

use Illuminate\Console\Command;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Services\Subdomains\SubdomainService;

/**
 * Repoints any subdomain whose server has moved since the record was written.
 *
 * Transfers and node IP changes both invalidate an A record, and neither
 * currently calls back into the subdomain service. Running this on a schedule
 * is the cheap way to stay correct without hooking every code path that can
 * move a server.
 */
class SyncSubdomainsCommand extends Command
{
    protected $signature = 'p:subdomains:sync {--dry-run : Report what would change without touching Cloudflare.}';

    protected $description = 'Repoint server subdomains whose target address has drifted.';

    public function handle(SubdomainService $service): int
    {
        if (!$service->enabled()) {
            $this->components->warn('Subdomains are disabled or not configured; nothing to do.');

            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $changed = 0;
        $failed = 0;

        ServerSubdomain::query()->with('server.allocation', 'server.node')->chunkById(100, function ($subdomains) use ($service, $dryRun, &$changed, &$failed) {
            foreach ($subdomains as $subdomain) {
                $before = $subdomain->record_target;

                try {
                    if ($dryRun) {
                        // Cheap read-only comparison; sync() would write.
                        $this->line(sprintf('  %s currently points at %s', $subdomain->fqdn, $before ?: 'nothing'));

                        continue;
                    }

                    $service->sync($subdomain);

                    if ($subdomain->refresh()->record_target !== $before) {
                        ++$changed;
                        $this->components->info(sprintf('%s: %s -> %s', $subdomain->fqdn, $before ?: 'nothing', $subdomain->record_target));
                    }
                } catch (\Exception $exception) {
                    ++$failed;
                    $this->components->error(sprintf('%s: %s', $subdomain->fqdn, $exception->getMessage()));
                }
            }
        });

        if (!$dryRun) {
            $this->components->info(sprintf('Done. %d updated, %d failed.', $changed, $failed));
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
