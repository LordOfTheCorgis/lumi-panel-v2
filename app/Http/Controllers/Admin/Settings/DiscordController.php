<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class DiscordController extends Controller
{
    public function __construct(
        private Encrypter $encrypter,
        private SettingsRepositoryInterface $settings,
    ) {
    }

    public function index(): View
    {
        return view('admin.settings.discord', [
            'callback' => route('discord.callback'),
        ]);
    }

    public function update(Request $request): Response
    {
        $data = $request->validate([
            'discord:enabled' => 'required|boolean',
            'discord:client_id' => 'nullable|string|max:191',
            'discord:client_secret' => 'nullable|string|max:191',
            'discord:bot_token' => 'nullable|string|max:191',
            'discord:nuke_threshold' => 'required|integer|min:1|max:10000',
        ]);

        foreach ($data as $key => $value) {
            // Secrets are stored encrypted, same as the SMTP password. The form
            // posts "!e" back when the field was left untouched so we don't
            // overwrite a real secret with the masked placeholder.
            if (in_array($key, ['discord:client_secret', 'discord:bot_token'], true)) {
                if ($value === '!e' || $value === null) {
                    continue;
                }

                $value = $this->encrypter->encrypt($value);
            }

            $this->settings->set('settings::' . $key, $value);
        }

        return response('', Response::HTTP_NO_CONTENT);
    }
}
