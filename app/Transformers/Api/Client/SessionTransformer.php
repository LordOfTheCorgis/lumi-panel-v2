<?php

namespace Pterodactyl\Transformers\Api\Client;

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Session;

class SessionTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return 'session';
    }

    public function transform(Session $model): array
    {
        return [
            // Hashed, not raw. Handing the real session identifier to the browser
            // would mean anything that can read the page can also read a valid
            // session ID for every device you own. The revoke endpoint matches on
            // this hash instead.
            'id' => sha1($model->id),
            'is_current' => hash_equals(session()->getId(), (string) $model->id),
            'ip' => $model->ip_address,
            'user_agent' => $model->user_agent,
            'last_activity' => CarbonImmutable::createFromTimestamp($model->last_activity)->toAtomString(),
        ];
    }
}
