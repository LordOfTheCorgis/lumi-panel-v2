<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Pterodactyl\Models\Announcement;
use Pterodactyl\Transformers\Api\Client\AnnouncementTransformer;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class AnnouncementController extends ClientApiController
{
    /**
     * Return every announcement currently within its visibility window. Any
     * authenticated user may read these; they are broadcast notices, not
     * per-server data.
     */
    public function index(ClientApiRequest $request): array
    {
        $announcements = Announcement::query()->visible()->orderByDesc('created_at')->get();

        return $this->fractal->collection($announcements)
            ->transformWith($this->getTransformer(AnnouncementTransformer::class))
            ->toArray();
    }
}
