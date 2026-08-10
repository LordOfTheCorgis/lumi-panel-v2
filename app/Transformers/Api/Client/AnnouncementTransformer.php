<?php

namespace Pterodactyl\Transformers\Api\Client;

use Pterodactyl\Models\Announcement;

class AnnouncementTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return Announcement::RESOURCE_NAME;
    }

    public function transform(Announcement $model): array
    {
        return [
            'id' => $model->id,
            'title' => $model->title,
            'content' => $model->content,
            'type' => $model->type,
            // Drives the dismissal key on the client: editing an announcement
            // bumps this, so a reworded notice surfaces again for people who
            // already dismissed the old wording.
            'updated_at' => $model->updated_at->toAtomString(),
        ];
    }
}
