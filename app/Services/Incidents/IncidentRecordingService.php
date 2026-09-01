<?php

namespace Pterodactyl\Services\Incidents;

use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Pterodactyl\Models\Server;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\ServerIncident;
use Pterodactyl\Services\Discord\DiscordNotifier;

/**
 * Files a crash report against a server and tells the owner about it.
 *
 * The one thing this has to get right is a server stuck in a boot loop. Left
 * alone that produces a report and a Discord DM every twenty seconds, which is
 * worse than useless - people mute the bot and then miss the one that mattered.
 * So repeats inside the cooldown fold into the existing report and stay quiet.
 */
class IncidentRecordingService
{
    /**
     * Crashes closer together than this are the same crash happening again.
     */
    private const REPEAT_COOLDOWN_MINUTES = 15;

    /**
     * Trimmed hard on the way in. The tail is there to show someone what the
     * server said last, not to be a second copy of the log file, and this column
     * is read on every page load of the incident list.
     */
    private const MAX_LOG_LINES = 150;
    private const MAX_LOG_BYTES = 32768;

    public function __construct(
        private CrashAnalyser $analyser,
        private DiscordNotifier $notifier,
    ) {
    }

    /**
     * @param array{occurred_at: string, exit_code?: int|null, oom_killed?: bool|null, uptime?: int|null, memory_bytes?: int|null, memory_limit_bytes?: int|null, cpu_absolute?: float|null, restarted?: bool|null, log?: array<int, string>|null} $report
     */
    public function handle(Server $server, array $report): ServerIncident
    {
        $occurredAt = CarbonImmutable::parse($report['occurred_at']);
        $logTail = $this->tail($report['log'] ?? []);

        $context = [
            'exit_code' => $report['exit_code'] ?? null,
            'oom_killed' => $report['oom_killed'] ?? null,
            'memory_bytes' => $report['memory_bytes'] ?? null,
            'memory_limit_bytes' => $report['memory_limit_bytes'] ?? null,
            'cpu_absolute' => $report['cpu_absolute'] ?? null,
            'uptime_seconds' => isset($report['uptime']) ? (int) round($report['uptime'] / 1000) : null,
            'restarted' => $report['restarted'] ?? null,
        ];

        $existing = $this->recentIncident($server, $occurredAt);
        if ($existing !== null) {
            $existing->increment('occurrences');

            // Keep the newest evidence rather than the first: whatever it printed
            // on the most recent attempt is the more useful thing to look at.
            $existing->update([
                'log_tail' => $logTail ?: $existing->log_tail,
                'context' => $context,
            ]);

            return $existing->refresh();
        }

        $analysis = $this->analyser->analyse($logTail, $context);

        /** @var ServerIncident $incident */
        $incident = ServerIncident::query()->create([
            'uuid' => Str::uuid()->toString(),
            'server_id' => $server->id,
            'occurred_at' => $occurredAt,
            'detected_at' => CarbonImmutable::now(),
            'cause' => $analysis->cause,
            'summary' => $analysis->summary,
            'log_tail' => $logTail ?: null,
            'context' => $context,
            'occurrences' => 1,
        ]);

        Activity::event('server:crashed')
            ->subject($incident, $server)
            ->property(['cause' => $incident->cause, 'summary' => $incident->summary])
            ->log();

        // Safe to call bare - DiscordService swallows its own failures so a dead
        // webhook can't take the report down with it.
        $this->notifier->serverCrashed($server, $incident);

        return $incident;
    }

    private function recentIncident(Server $server, CarbonImmutable $occurredAt): ?ServerIncident
    {
        /** @var ServerIncident|null $incident */
        $incident = ServerIncident::query()
            ->where('server_id', $server->id)
            ->where('occurred_at', '>=', $occurredAt->subMinutes(self::REPEAT_COOLDOWN_MINUTES))
            ->orderByDesc('occurred_at')
            ->first();

        return $incident;
    }

    /**
     * @param array<int, string> $lines
     */
    private function tail(array $lines): string
    {
        $tail = implode("\n", array_slice($lines, -self::MAX_LOG_LINES));

        if (strlen($tail) > self::MAX_LOG_BYTES) {
            // Keep the end. The interesting part of a crash log is always the
            // last thing it managed to say.
            $tail = '...' . substr($tail, -self::MAX_LOG_BYTES);
        }

        return $tail;
    }
}
