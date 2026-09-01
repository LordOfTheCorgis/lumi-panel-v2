<?php

namespace Pterodactyl\Http\Controllers\Api\Remote\Servers;

use Pterodactyl\Models\Node;
use Webmozart\Assert\Assert;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Repositories\Eloquent\ServerRepository;
use Pterodactyl\Exceptions\Http\HttpForbiddenException;
use Pterodactyl\Services\Incidents\IncidentRecordingService;
use Pterodactyl\Http\Requests\Api\Remote\ReportServerCrashRequest;

/**
 * Wings tells us a server died without being asked to.
 *
 * The Panel has no other way of knowing. Console output goes straight from wings
 * to the browser over its own websocket and never passes through here, so
 * without this endpoint a crash at 3am with nobody watching leaves no trace
 * anywhere except a support ticket the next morning.
 */
class ServerIncidentController extends Controller
{
    public function __construct(
        private ServerRepository $repository,
        private IncidentRecordingService $service,
    ) {
    }

    /**
     * @throws \Throwable
     */
    public function __invoke(ReportServerCrashRequest $request, string $uuid): JsonResponse
    {
        $server = $this->repository->getByUuid($uuid);

        /* @var Node $node */
        Assert::isInstanceOf($node = $request->attributes->get('node'), Node::class);

        // Same check the backup and transfer endpoints make: a node may only
        // speak for the servers it actually holds.
        if ($server->node_id !== $node->id) {
            throw new HttpForbiddenException('Requesting node does not have permission to access this server.');
        }

        $incident = $this->service->handle($server, $request->validated());

        return new JsonResponse(['uuid' => $incident->uuid], JsonResponse::HTTP_ACCEPTED);
    }
}
