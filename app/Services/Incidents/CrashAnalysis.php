<?php

namespace Pterodactyl\Services\Incidents;

/**
 * What we think killed a server, and how we'd say it out loud.
 */
class CrashAnalysis
{
    public function __construct(
        public readonly string $cause,
        public readonly string $summary,
    ) {
    }
}
