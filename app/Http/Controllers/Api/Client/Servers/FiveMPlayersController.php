<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Carbon\Carbon;
use Pterodactyl\Models\Server;
use Illuminate\Cache\Repository;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class FiveMPlayersController extends ClientApiController
{
    /**
     * FiveMPlayersController constructor.
     */
    public function __construct(private Repository $cache)
    {
        parent::__construct();
    }

    /**
     * Proxies the FiveM server's built-in /players.json endpoint so the panel can show
     * who is currently connected. The response is cached briefly since every open
     * Players tab polls this endpoint independently of the others.
     */
    public function __invoke(ClientApiRequest $request, Server $server): array
    {
        $this->authorize(Permission::ACTION_CONTROL_PLAYERS, $server);

        $allocation = $server->allocation;

        return $this->cache->remember(
            "fivem-players:$server->uuid",
            Carbon::now()->addSeconds(5),
            function () use ($allocation) {
                try {
                    $response = Http::timeout(3)->get("http://{$allocation->ip}:{$allocation->port}/players.json");
                } catch (ConnectionException) {
                    return ['online' => false, 'players' => []];
                }

                if (!$response->successful() || !is_array($response->json())) {
                    return ['online' => false, 'players' => []];
                }

                $players = collect($response->json())
                    ->filter(fn ($player) => is_array($player) && isset($player['id'], $player['name']))
                    ->map(fn ($player) => [
                        'id' => (int) $player['id'],
                        'name' => (string) $player['name'],
                        'ping' => (int) ($player['ping'] ?? 0),
                    ])
                    ->values()
                    ->all();

                return ['online' => true, 'players' => $players];
            }
        );
    }
}
