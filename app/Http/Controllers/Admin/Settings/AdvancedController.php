<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Settings\AdvancedSettingsFormRequest;

class AdvancedController extends Controller
{
    /**
     * AdvancedController constructor.
     */
    public function __construct(
        private AlertsMessageBag $alert,
        private ConfigRepository $config,
        private Kernel $kernel,
        private SettingsRepositoryInterface $settings,
    ) {
    }

    /**
     * Render advanced Panel settings UI.
     */
    public function index(): View
    {
        // Warn when the toggle is on but the keys aren't filled in. That
        // combination silently passes every request through unverified, which
        // looks identical to working protection from the outside.
        $showCaptchaWarning = (bool) $this->config->get('turnstile.enabled')
            && (empty($this->config->get('turnstile.site_key')) || empty($this->config->get('turnstile.secret_key')));

        return view('admin.settings.advanced', [
            'showCaptchaWarning' => $showCaptchaWarning,
        ]);
    }

    /**
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(AdvancedSettingsFormRequest $request): RedirectResponse
    {
        foreach ($request->normalize() as $key => $value) {
            $this->settings->set('settings::' . $key, $value);
        }

        $this->kernel->call('queue:restart');
        $this->alert->success('Advanced settings have been updated successfully and the queue worker was restarted to apply these changes.')->flash();

        return redirect()->route('admin.settings.advanced');
    }
}
