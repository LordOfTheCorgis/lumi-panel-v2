<?php

namespace Pterodactyl\Services\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;

/**
 * Keeps a server's TXADMIN_PORT egg variable (used by txAdmin-capable eggs, e.g. FiveM)
 * in sync with the port of its additional allocation, so the value never needs to be
 * entered by hand and never goes stale after a node transfer reassigns that allocation.
 */
class TxAdminPortAssignmentService
{
    public const ENV_VARIABLE = 'TXADMIN_PORT';

    /**
     * Resolve the port that should be injected into request data for this egg's
     * TXADMIN_PORT variable ahead of validation (server creation), so that a
     * "required" rule on the variable does not reject a request that never
     * explicitly supplies it. Returns null if the egg has no such variable, no
     * allocation ID was given, or the allocation cannot be found.
     */
    public function resolvePort(?int $eggId, ?int $additionalAllocationId): ?int
    {
        if (empty($eggId) || empty($additionalAllocationId) || !$this->findVariable($eggId)) {
            return null;
        }

        return Allocation::query()->find($additionalAllocationId)?->port;
    }

    /**
     * Directly overwrite the stored TXADMIN_PORT value for an existing server. Used
     * after a node transfer, where the additional allocation (and therefore its port)
     * has changed and there is no request/validation pipeline to inject a value into.
     */
    public function syncStoredValue(Server $server, ?int $additionalAllocationId): void
    {
        if (empty($additionalAllocationId)) {
            return;
        }

        $variable = $this->findVariable($server->egg_id);
        if (!$variable) {
            return;
        }

        $allocation = Allocation::query()->find($additionalAllocationId);
        if (!$allocation) {
            return;
        }

        ServerVariable::query()->updateOrCreate(
            ['server_id' => $server->id, 'variable_id' => $variable->id],
            ['variable_value' => (string) $allocation->port]
        );
    }

    private function findVariable(int $eggId): ?EggVariable
    {
        return EggVariable::query()
            ->where('egg_id', $eggId)
            ->where('env_variable', self::ENV_VARIABLE)
            ->first();
    }
}
