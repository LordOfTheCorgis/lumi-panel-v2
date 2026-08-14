<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class DeleteSubdomainRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_SUBDOMAIN_DELETE;
    }
}
