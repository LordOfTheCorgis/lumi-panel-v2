<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Services\Subdomains\SubdomainService;
use Pterodactyl\Transformers\Api\Client\SubdomainTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain\GetSubdomainRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain\CreateSubdomainRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Subdomain\DeleteSubdomainRequest;

class SubdomainController extends ClientApiController
{
    public function __construct(private SubdomainService $service)
    {
        parent::__construct();
    }

    /**
     * The current subdomain for this server, plus the bits the UI needs to
     * render the claim form (whether the feature is on, and what it suffixes).
     */
    public function index(GetSubdomainRequest $request, Server $server): array
    {
        $subdomain = $server->subdomain;

        // PterodactylSerializer returns ['object' => ..., 'attributes' => ...]
        // for an item - no JSON:API "data" wrapper - so pull attributes off the
        // top level. Hand-built rather than returned straight through because
        // this endpoint answers "is there one" and "what are the rules" too.
        $transformed = $subdomain === null ? null : $this->fractal->item($subdomain)
            ->transformWith($this->getTransformer(SubdomainTransformer::class))
            ->toArray();

        return [
            'object' => 'server_subdomain',
            'attributes' => $transformed['attributes'] ?? null,
            'meta' => [
                'enabled' => $this->service->enabled(),
                'domain' => $this->service->baseDomain(),
                'min_length' => (int) config('subdomains.min_length', 3),
                'max_length' => (int) config('subdomains.max_length', 32),
            ],
        ];
    }

    /**
     * Claim a subdomain for this server.
     *
     * @throws \Pterodactyl\Exceptions\DisplayException
     */
    public function store(CreateSubdomainRequest $request, Server $server): array
    {
        $subdomain = $this->service->create($server, $request->input('subdomain'));

        Activity::event('server:subdomain.create')
            ->subject($subdomain)
            ->property('fqdn', $subdomain->fqdn)
            ->log();

        return $this->fractal->item($subdomain)
            ->transformWith($this->getTransformer(SubdomainTransformer::class))
            ->toArray();
    }

    /**
     * Release this server's subdomain and delete the DNS record behind it.
     */
    public function delete(DeleteSubdomainRequest $request, Server $server): JsonResponse
    {
        $subdomain = $server->subdomain;

        if ($subdomain !== null) {
            $fqdn = $subdomain->fqdn;

            $this->service->delete($subdomain);

            Activity::event('server:subdomain.delete')
                ->subject($server)
                ->property('fqdn', $fqdn)
                ->log();
        }

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }
}
