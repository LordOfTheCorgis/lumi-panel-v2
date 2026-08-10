<?php

namespace Pterodactyl\Services\Discord;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;

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
}
