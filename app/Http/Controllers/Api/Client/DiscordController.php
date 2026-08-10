<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Services\Discord\DiscordService;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class DiscordController extends ClientApiController
{
    public function __construct(private DiscordService $discord)
    {
        parent::__construct();
    }

    /**
     * Whether linking is available at all, and the current link if there is one.
     */
    public function index(ClientApiRequest $request): JsonResponse
    {
        $user = $request->user();

        return new JsonResponse([
            'enabled' => $this->discord->enabled(),
            'linked' => !empty($user->discord_id),
            'username' => $user->discord_username,
            'linked_at' => $user->discord_linked_at?->toAtomString(),
        ]);
    }

    public function delete(ClientApiRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!empty($user->discord_id)) {
            $user->forceFill([
                'discord_id' => null,
                'discord_username' => null,
                'discord_linked_at' => null,
            ])->saveOrFail();

            Activity::event('user:account.discord-unlinked')->log();
        }

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }
}
