<?php

namespace Pterodactyl\Transformers\Api\Client;

use Pterodactyl\Models\ServerSubdomain;

class SubdomainTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return ServerSubdomain::RESOURCE_NAME;
    }

    public function transform(ServerSubdomain $model): array
    {
        return [
            'id' => $model->id,
            'subdomain' => $model->subdomain,
            'domain' => $model->domain,
            'fqdn' => $model->fqdn,
            'created_at' => $model->created_at->toAtomString(),
        ];
    }
}
