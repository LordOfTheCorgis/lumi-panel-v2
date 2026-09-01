<?php

namespace Pterodactyl\Services\Discord;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\ServerIncident;

/**
 * The actual messages we send. Kept apart from DiscordService so the transport
 * and the copy aren't tangled together.
 */
class DiscordNotifier
{
    public function __construct(private DiscordService $discord)
    {
    }

    /**
     * Sent once, immediately after someone links their account. Doubles as proof
     * the bot can actually reach them - if this never arrives, their DMs are shut.
     */
    public function linked(User $user): void
    {
        $this->discord->notify($user, [
            'title' => 'Discord Account Linked',
            'description' => sprintf(
                'Your Discord account is now linked to your **%s** panel account (`%s`).',
                config('app.name', 'Lumix Solutions'),
                $user->username
            ),
            'fields' => [
                [
                    'name' => 'What you will get here',
                    'value' => "· Alerts if one of your servers is suspended\n"
                        . '· A heads-up if a large number of files are deleted at once',
                ],
                [
                    'name' => 'Did not do this?',
                    'value' => 'Unlink it from the Account page on the panel and change your password.',
                ],
            ],
        ]);
    }

    public function serverSuspended(Server $server): void
    {
        $this->discord->notify($server->user, [
            'title' => 'Server Suspended',
            'description' => sprintf('**%s** has been suspended and is no longer running.', $server->name),
            'fields' => [
                ['name' => 'Server', 'value' => $server->name, 'inline' => true],
                ['name' => 'Identifier', 'value' => '`' . $server->uuidShort . '`', 'inline' => true],
                [
                    'name' => 'What now?',
                    'value' => 'This is usually billing or a terms issue. Open a ticket if you think it is a mistake.',
                ],
            ],
        ]);
    }

    public function serverUnsuspended(Server $server): void
    {
        $this->discord->notify($server->user, [
            'title' => 'Server Unsuspended',
            'description' => sprintf('**%s** is active again and can be started.', $server->name),
        ]);
    }

    /**
     * The server fell over on its own. This is the one notification people
     * actually want, so it leads with the answer instead of the event: they
     * already know it crashed, what they don't know is why.
     */
    public function serverCrashed(Server $server, ServerIncident $incident): void
    {
        $restarted = ($incident->context['restarted'] ?? false) === true;

        $fields = [
            ['name' => 'Server', 'value' => $server->name, 'inline' => true],
            ['name' => 'Time', 'value' => $incident->occurred_at->toDayDateTimeString(), 'inline' => true],
        ];

        if ($incident->log_tail) {
            // Discord caps a field at 1024 characters and silently rejects the
            // whole message if you go over, so this gets its own hard trim.
            $lines = array_slice(explode("\n", $incident->log_tail), -8);
            $excerpt = substr(implode("\n", $lines), -900);

            $fields[] = ['name' => 'Last words', 'value' => '```' . $excerpt . '```'];
        }

        $fields[] = [
            'name' => 'What now?',
            'value' => $restarted
                ? 'It has already been started again. The full report and log are on the panel.'
                : 'It is still down. Start it from the panel, where the full report and log are waiting.',
        ];

        $this->discord->notify($server->user, [
            'title' => 'Server Crashed',
            'description' => sprintf('**%s** stopped on its own. %s', $server->name, $incident->summary),
            'fields' => $fields,
        ]);
    }

    /**
     * Fired when someone deletes a lot of files in one go. Deliberately worded as
     * a question rather than an accusation - the overwhelming majority of these
     * are someone clearing out a world folder on purpose, and crying wolf teaches
     * people to ignore the alert that actually matters.
     */
    public function possibleNuke(Server $server, int $count, string $directory): void
    {
        $this->discord->notify($server->user, [
            'title' => 'Large File Deletion',
            'description' => sprintf(
                '**%d files** were just deleted from **%s**.',
                $count,
                $server->name
            ),
            'fields' => [
                ['name' => 'Directory', 'value' => '`' . $directory . '`'],
                [
                    'name' => 'Was this you?',
                    'value' => "If you were clearing files out yourself, ignore this message - nothing is wrong.\n\n"
                        . 'If it was not you, someone may have access to your account. '
                        . 'Change your password, review your API keys, and check the activity log on the panel.',
                ],
            ],
        ]);
    }

    /* ---------------------------------------------------------------------
     * Security events.
     *
     * These all follow the same shape on purpose: state what changed, then
     * tell them what to do if it wasn't them. A security alert that doesn't
     * say what to do next is just anxiety.
     * ------------------------------------------------------------------- */

    public function passwordChanged(User $user): void
    {
        $this->security($user, 'Password Changed', 'The password on your panel account was just changed.');
    }

    public function emailChanged(User $user, string $old, string $new): void
    {
        $this->discord->notify($user, [
            'title' => 'Email Address Changed',
            'description' => 'The email address on your panel account was just changed.',
            'fields' => [
                ['name' => 'From', 'value' => '`' . $old . '`', 'inline' => true],
                ['name' => 'To', 'value' => '`' . $new . '`', 'inline' => true],
                ['name' => 'Was this you?', 'value' => self::RECOVERY_ADVICE],
            ],
        ]);
    }

    public function twoFactorDisabled(User $user): void
    {
        $this->security(
            $user,
            'Two-Step Verification Disabled',
            'Two-step verification was just turned off on your account. Your password is now the only thing protecting it.'
        );
    }

    public function apiKeyCreated(User $user, string $identifier): void
    {
        $this->security(
            $user,
            'API Key Created',
            sprintf('A new API key (`%s`) was created on your account. API keys can control your servers.', $identifier)
        );
    }

    /**
     * Sent while the link still exists - once discord_id is cleared we have
     * nowhere to send it, so the caller has to fire this before unlinking.
     */
    public function unlinked(User $user): void
    {
        $this->discord->notify($user, [
            'title' => 'Discord Account Unlinked',
            'description' => 'This Discord account is no longer linked to your panel account. This is the last message you will get here.',
            'fields' => [
                ['name' => 'Was this you?', 'value' => self::RECOVERY_ADVICE],
            ],
        ]);
    }

    /* ---------------------------------------------------------------------
     * Server lifecycle.
     * ------------------------------------------------------------------- */

    public function serverInstalled(Server $server, bool $successful, bool $reinstall): void
    {
        $verb = $reinstall ? 'Reinstall' : 'Install';

        $this->discord->notify($server->user, $successful ? [
            'title' => $verb . ' Complete',
            'description' => sprintf('**%s** has finished installing and is ready to start.', $server->name),
        ] : [
            'title' => $verb . ' Failed',
            'description' => sprintf(
                '**%s** failed to install. Check the install log on the panel, or open a ticket if it keeps happening.',
                $server->name
            ),
        ]);
    }

    public function backupFinished(Server $server, string $name, bool $successful): void
    {
        $this->discord->notify($server->user, $successful ? [
            'title' => 'Backup Complete',
            'description' => sprintf('Backup `%s` finished on **%s**.', $name, $server->name),
        ] : [
            'title' => 'Backup Failed',
            'description' => sprintf(
                'Backup `%s` failed on **%s**. Nothing was saved - do not rely on this one.',
                $name,
                $server->name
            ),
        ]);
    }

    /**
     * Sent to the server owner, not the person being added. Someone gaining
     * access to your server is your business.
     */
    public function subuserAdded(Server $server, string $email): void
    {
        $this->discord->notify($server->user, [
            'title' => 'User Added To Your Server',
            'description' => sprintf('`%s` was given access to **%s**.', $email, $server->name),
            'fields' => [
                [
                    'name' => 'Was this you?',
                    'value' => 'If not, remove them from the Users page on that server and change your password.',
                ],
            ],
        ]);
    }

    private const RECOVERY_ADVICE = "If this wasn't you, change your password immediately, "
        . 'turn on two-step verification, and review your API keys on the panel.';

    private function security(User $user, string $title, string $description): void
    {
        $this->discord->notify($user, [
            'title' => $title,
            'description' => $description,
            'fields' => [
                ['name' => 'Was this you?', 'value' => self::RECOVERY_ADVICE],
            ],
        ]);
    }
}
