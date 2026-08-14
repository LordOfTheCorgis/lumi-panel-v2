<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class CreateSubdomainRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_SUBDOMAIN_CREATE;
    }

    public function rules(): array
    {
        // Shape only. The real rules (charset, reserved words, uniqueness) live
        // in SubdomainService so the sync command and any future admin-side
        // creation get them too.
        return [
            'subdomain' => 'required|string|max:255',
        ];
    }
}
