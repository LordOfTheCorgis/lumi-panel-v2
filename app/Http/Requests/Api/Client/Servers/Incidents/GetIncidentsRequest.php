<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Incidents;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class GetIncidentsRequest extends ClientApiRequest
{
    /**
     * A crash report is server history, so it rides on the same permission as the
     * activity log rather than inventing a group of its own.
     */
    public function permission(): string
    {
        return Permission::ACTION_ACTIVITY_READ;
    }
}
