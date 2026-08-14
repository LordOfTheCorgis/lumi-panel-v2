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
            // What the records currently resolve to. Surfaced so the page can
            // show the customer what their name actually points at rather than
            // asking them to trust it - and so a stale record is visible
            // instead of mysterious.
            'target' => $model->record_target,
            'port' => $model->record_port,
            'ttl' => (int) config('subdomains.ttl', 120),
            'created_at' => $model->created_at->toAtomString(),
        ];
    }
}
