<?php

namespace Pterodactyl\Services\Discord;

use Throwable;
use GuzzleHttp\Client;
use Pterodactyl\Models\User;
use Psr\Log\LoggerInterface;

/**
 * Thin wrapper over the bits of the Discord API we actually use: exchanging an
 * OAuth code, and DMing a user as the bot.
 *
 * Every send is best-effort. A user blocking the bot, having DMs closed, or
 * Discord being down must never break the panel action that triggered it - so
 * failures are logged and swallowed rather than thrown.
 */
class DiscordService
{
    private const API = 'https://discord.com/api/v10';

    public function __construct(private LoggerInterface $log)
    {
    }

    public function enabled(): bool
    {
        return (bool) config('discord.enabled')
            && !empty(config('discord.client_id'))
            && !empty(config('discord.client_secret'))
            && !empty(config('discord.bot_token'));
    }

    public function redirectUrl(string $state): string
    {
        return self::API . '/oauth2/authorize?' . http_build_query([
            'client_id' => config('discord.client_id'),
            'redirect_uri' => route('discord.callback'),
            'response_type' => 'code',
            'scope' => 'identify',
            'state' => $state,
        ]);
    }

    /**
     * Swap the OAuth code for the Discord account it belongs to.
     *
     * @return array{id: string, username: string}|null
     */
    public function identify(string $code): ?array
    {
        try {
            $client = new Client(['timeout' => 10]);

            $token = json_decode($client->post(self::API . '/oauth2/token', [
                'form_params' => [
                    'client_id' => config('discord.client_id'),
                    'client_secret' => config('discord.client_secret'),
                    'grant_type' => 'authorization_code',
                    'code' => $code,
                    'redirect_uri' => route('discord.callback'),
                ],
            ])->getBody(), true);

            $user = json_decode($client->get(self::API . '/users/@me', [
                'headers' => ['Authorization' => 'Bearer ' . $token['access_token']],
            ])->getBody(), true);

            return [
                'id' => (string) $user['id'],
                // Discord dropped discriminators for most accounts; global_name
                // is the display name, username is the @handle.
                'username' => $user['global_name'] ?? $user['username'],
            ];
        } catch (Throwable $e) {
            $this->log->warning('discord: failed to identify user from oauth code', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * DM a user an embed. No-op if they have not linked an account.
     */
    public function notify(User $user, array $embed): void
    {
        if (!$this->enabled() || empty($user->discord_id)) {
            return;
        }

        try {
            $client = new Client([
                'timeout' => 10,
                'headers' => [
                    'Authorization' => 'Bot ' . config('discord.bot_token'),
                    'Content-Type' => 'application/json',
                ],
            ]);

            // A DM needs a channel first. Discord returns the existing one if
            // there already is one, so this is safe to call every time.
            $channel = json_decode(
                $client->post(self::API . '/users/@me/channels', [
                    'json' => ['recipient_id' => $user->discord_id],
                ])->getBody(),
                true
            );

            $client->post(sprintf('%s/channels/%s/messages', self::API, $channel['id']), [
                'json' => ['embeds' => [$this->decorate($embed)]],
            ]);
        } catch (Throwable $e) {
            // Closed DMs are the common case here and are not worth shouting about.
            $this->log->notice('discord: could not deliver a direct message', [
                'user' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Apply the house style so every embed looks like it came from the same place.
     */
    private function decorate(array $embed): array
    {
        return array_merge([
            'color' => config('discord.embed_color'),
            'timestamp' => now()->toIso8601String(),
            'footer' => ['text' => config('app.name', 'Lumix Solutions')],
        ], $embed);
    }
}
