<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\ServerIncident;
use Pterodactyl\Transformers\Api\Client\ServerIncidentTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Incidents\GetIncidentsRequest;

class IncidentController extends ClientApiController
{
    /**
     * Crash reports for this server, newest first.
     */
    public function index(GetIncidentsRequest $request, Server $server): array
    {
        $limit = min((int) ($request->query('per_page') ?? 15), 50);

        return $this->fractal->collection($server->incidents()->paginate($limit))
            ->transformWith($this->getTransformer(ServerIncidentTransformer::class))
            ->addMeta([
                // Drives the badge on the console. Cheap enough to send on every
                // page of the list rather than making the UI ask twice.
                'unacknowledged' => $server->incidents()->whereNull('acknowledged_at')->count(),
            ])
            ->toArray();
    }

    /**
     * Mark a report as read. Nothing is deleted - the history is the point.
     */
    public function acknowledge(GetIncidentsRequest $request, Server $server, string $incident): JsonResponse
    {
        /** @var ServerIncident $model */
        $model = $server->incidents()->where('uuid', $incident)->firstOrFail();

        if ($model->acknowledged_at === null) {
            $model->update(['acknowledged_at' => CarbonImmutable::now()]);
        }

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }
}
