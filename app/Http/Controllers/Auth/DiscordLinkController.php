<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Pterodactyl\Facades\Activity;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Discord\DiscordNotifier;
use Pterodactyl\Services\Discord\DiscordService;

/**
 * Web (session) routes rather than API ones, because OAuth is a browser
 * redirect round trip and needs the session to carry the CSRF state.
 */
class DiscordLinkController extends Controller
{
    public function __construct(
        private DiscordService $discord,
        private DiscordNotifier $notifier,
    ) {
    }

    public function redirect(Request $request): RedirectResponse
    {
        if (!$this->discord->enabled()) {
            return redirect('/account')->with('discord_error', 'Discord linking is not configured on this panel.');
        }

        // Random per-attempt value echoed back by Discord. Without checking this
        // an attacker can hand you a callback URL that links *their* Discord to
        // your account.
        $state = Str::random(40);
        $request->session()->put('discord_state', $state);

        return redirect()->away($this->discord->redirectUrl($state));
    }

    public function callback(Request $request): RedirectResponse
    {
        $expected = $request->session()->pull('discord_state');

        if (empty($expected) || !hash_equals($expected, (string) $request->input('state'))) {
            return redirect('/account')->with('discord_error', 'That link request expired or did not match. Try again.');
        }

        if (empty($request->input('code'))) {
            return redirect('/account')->with('discord_error', 'Discord did not return an authorisation code.');
        }

        $identity = $this->discord->identify($request->input('code'));

        if ($identity === null) {
            return redirect('/account')->with('discord_error', 'Could not reach Discord. Please try again.');
        }

        // One Discord account per panel account, or notifications get ambiguous.
        $taken = User::query()
            ->where('discord_id', $identity['id'])
            ->where('id', '!=', $request->user()->id)
            ->exists();

        if ($taken) {
            return redirect('/account')->with('discord_error', 'That Discord account is already linked to another user.');
        }

        $user = $request->user();
        $user->forceFill([
            'discord_id' => $identity['id'],
            'discord_username' => $identity['username'],
            'discord_linked_at' => now(),
        ])->saveOrFail();

        Activity::event('user:account.discord-linked')->property('username', $identity['username'])->log();

        $this->notifier->linked($user->refresh());

        return redirect('/account');
    }
}
