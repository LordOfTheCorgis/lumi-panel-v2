<?php

namespace Pterodactyl\Http\ViewComposers;

use Illuminate\View\View;
use Pterodactyl\Services\Helpers\AssetHashService;

class AssetComposer
{
    /**
     * AssetComposer constructor.
     */
    public function __construct(private AssetHashService $assetHashService)
    {
    }

    /**
     * Provide access to the asset service in the views.
     */
    public function compose(View $view): void
    {
        $view->with('asset', $this->assetHashService);
        $view->with('siteConfiguration', [
            'name' => config('app.name') ?? 'Pterodactyl',
            'locale' => config('app.locale') ?? 'en',
            // Only advertise the captcha to the frontend when it can
            // actually work. Rendering a widget against an empty site key just
            // produces a broken box on the login form.
            'turnstile' => [
                'enabled' => (bool) config('turnstile.enabled') && !empty(config('turnstile.site_key')),
                'siteKey' => config('turnstile.site_key') ?? '',
            ],
            // Lets the sidebar drop the Subdomain tab entirely when there's no
            // zone wired up, rather than routing to a page that can only
            // apologise. Safe to expose: the domain is public by definition.
            'subdomains' => [
                'enabled' => (bool) config('subdomains.enabled', false),
                'domain' => config('subdomains.domain') ?? '',
            ],
        ]);
    }
}
