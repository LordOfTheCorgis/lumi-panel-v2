<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class GetSubdomainRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_SUBDOMAIN_READ;
    }
}
