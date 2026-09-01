<?php

namespace Pterodactyl\Transformers\Api\Client;

use Illuminate\Support\Arr;
use Pterodactyl\Models\ServerIncident;

class ServerIncidentTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return ServerIncident::RESOURCE_NAME;
    }

    public function transform(ServerIncident $model): array
    {
        $context = $model->context ?? [];

        return [
            'uuid' => $model->uuid,
            'cause' => $model->cause,
            'summary' => $model->summary,
            'log_tail' => $model->log_tail,
            'occurrences' => $model->occurrences,
            'occurred_at' => $model->occurred_at->toAtomString(),
            'acknowledged_at' => $model->acknowledged_at?->toAtomString(),
            // Flattened rather than passed through whole: context is an internal
            // bag and the client shouldn't have to care what else ends up in it.
            'exit_code' => Arr::get($context, 'exit_code'),
            'restarted' => (bool) Arr::get($context, 'restarted', false),
            'uptime_seconds' => Arr::get($context, 'uptime_seconds'),
            'memory_bytes' => Arr::get($context, 'memory_bytes'),
            'memory_limit_bytes' => Arr::get($context, 'memory_limit_bytes'),
        ];
    }
}
