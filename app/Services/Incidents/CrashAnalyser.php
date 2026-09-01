<?php

namespace Pterodactyl\Services\Incidents;

use Pterodactyl\Models\ServerIncident;

/**
 * Turns a crash report from wings into a sentence a customer can act on.
 *
 * This is deliberately a pile of string matching rather than anything clever.
 * Game servers die in a small number of well-known ways and each one prints
 * something distinctive on its way out; a hand-written signature that says "out
 * of memory" correctly is worth more to someone at 3am than a model that says
 * "anomalous termination" with a confidence score.
 *
 * It lives on the Panel rather than in wings on purpose. Signatures change every
 * time a game updates its error strings, and changing one here is a deploy;
 * changing one in wings is a deploy to every node you own.
 *
 * Ordering matters, and the ordering is by how much the evidence is worth.
 * Docker's own OOM flag is ground truth. The log is inference. A memory reading
 * near the limit is a guess. They go in that order, and within the log the
 * specific signatures sit above the general ones.
 */
class CrashAnalyser
{
    /**
     * Memory this close to the limit is an OOM kill even if nothing said so.
     * The container is usually killed hard enough that it prints nothing at all.
     */
    private const MEMORY_PRESSURE_RATIO = 0.95;

    /**
     * A server that dies inside this many seconds of starting never got going,
     * which is a different problem from one that fell over after a week.
     */
    private const STARTUP_WINDOW_SECONDS = 90;

    /**
     * @return array<int, array{cause: string, summary: string, patterns: array<int, string>}>
     */
    private function signatures(): array
    {
        return [
            [
                'cause' => ServerIncident::CAUSE_OUT_OF_MEMORY,
                'summary' => 'Ran out of memory.',
                'patterns' => [
                    '/java\.lang\.OutOfMemoryError/i',
                    '/There is insufficient memory for the Java Runtime Environment/i',
                    '/Native memory allocation .* failed/i',
                    '/Out of memory: Kill(ed)? process/i',
                    '/\bkilled\b.*\bmemory\b/i',
                ],
            ],
            [
                'cause' => ServerIncident::CAUSE_PORT_CONFLICT,
                'summary' => 'The port it wanted was already taken.',
                'patterns' => [
                    '/FAILED TO BIND TO PORT/i',
                    '/Address already in use/i',
                    '/bind: address already in use/i',
                    '/could not bind to (address|port)/i',
                ],
            ],
            [
                'cause' => ServerIncident::CAUSE_JAVA_VERSION,
                'summary' => 'Built for a different version of Java than the one it was started with.',
                'patterns' => [
                    '/UnsupportedClassVersionError/i',
                    '/has been compiled by a more recent version of the Java Runtime/i',
                    '/Unsupported major\.minor version/i',
                    '/requires Java \d+ or (higher|above)/i',
                ],
            ],
            [
                'cause' => ServerIncident::CAUSE_MISSING_JAR,
                'summary' => 'Could not find the file it was told to run.',
                'patterns' => [
                    '/Unable to access jarfile/i',
                    '/Error: Could not find or load main class/i',
                ],
            ],
            [
                'cause' => ServerIncident::CAUSE_EULA,
                'summary' => 'Stopped because the EULA has not been accepted.',
                'patterns' => [
                    '/You need to agree to the EULA/i',
                    '/eula\.txt/i',
                ],
            ],
            [
                'cause' => ServerIncident::CAUSE_BAD_RESOURCE,
                'summary' => 'A resource failed to load and took the server with it.',
                'patterns' => [
                    '/Failed to load resource/i',
                    '/Could not start resource/i',
                    '/Error loading script .* in resource/i',
                    '/citizen:\/scripting.*SCRIPT ERROR/i',
                ],
            ],
        ];
    }

    /**
     * @param array{exit_code?: int|null, oom_killed?: bool|null, memory_bytes?: int|null, memory_limit_bytes?: int|null, uptime_seconds?: int|null} $context
     */
    public function analyse(?string $logTail, array $context = []): CrashAnalysis
    {
        // The kernel already told wings exactly what happened here. Nothing in
        // the log can outrank that, and an OOM kill usually leaves no log at all.
        if (($context['oom_killed'] ?? false) === true) {
            return new CrashAnalysis(
                ServerIncident::CAUSE_OUT_OF_MEMORY,
                $this->enrich(ServerIncident::CAUSE_OUT_OF_MEMORY, 'Ran out of memory and was killed.', $context)
            );
        }

        $tail = trim((string) $logTail);

        if ($tail !== '') {
            foreach ($this->signatures() as $signature) {
                foreach ($signature['patterns'] as $pattern) {
                    if (preg_match($pattern, $tail) === 1) {
                        return new CrashAnalysis(
                            $signature['cause'],
                            $this->enrich($signature['cause'], $signature['summary'], $context)
                        );
                    }
                }
            }
        }

        // 137 is SIGKILL, which on a container almost always means the memory
        // limit. Below the log signatures because a server that printed a real
        // error and then got killed on the way out should be reported as the
        // real error.
        if (($context['exit_code'] ?? null) === 137) {
            return new CrashAnalysis(
                ServerIncident::CAUSE_OUT_OF_MEMORY,
                $this->enrich(ServerIncident::CAUSE_OUT_OF_MEMORY, 'Killed by the host, almost certainly for using too much memory.', $context)
            );
        }

        // Nothing conclusive, so fall back to what it was using when it died.
        if ($this->underMemoryPressure($context)) {
            return new CrashAnalysis(
                ServerIncident::CAUSE_OUT_OF_MEMORY,
                $this->enrich(ServerIncident::CAUSE_OUT_OF_MEMORY, 'Ran out of memory.', $context)
            );
        }

        $uptime = $context['uptime_seconds'] ?? null;
        if (is_int($uptime) && $uptime > 0 && $uptime <= self::STARTUP_WINDOW_SECONDS) {
            return new CrashAnalysis(
                ServerIncident::CAUSE_STARTUP_FAILURE,
                sprintf('Stopped %s seconds after starting, so it never finished booting.', $uptime)
            );
        }

        $exitCode = $context['exit_code'] ?? null;

        return new CrashAnalysis(
            ServerIncident::CAUSE_UNKNOWN,
            is_int($exitCode) && $exitCode !== 0
                ? sprintf('Exited with code %d and did not say why. The last of the console output is below.', $exitCode)
                : 'Stopped on its own and did not say why. The last of the console output is below.'
        );
    }

    /**
     * Bolt the numbers onto the sentence where we have them. "Ran out of memory"
     * is a diagnosis; "was using 3.9 GB of its 4 GB" is something the customer
     * can act on without opening a ticket.
     *
     * @param array<string, mixed> $context
     */
    private function enrich(string $cause, string $summary, array $context): string
    {
        if ($cause !== ServerIncident::CAUSE_OUT_OF_MEMORY) {
            return $summary;
        }

        $used = $context['memory_bytes'] ?? null;
        $limit = $context['memory_limit_bytes'] ?? null;

        if (!is_int($used) || !is_int($limit) || $limit <= 0) {
            return $summary;
        }

        return sprintf(
            '%s It was using %s of its %s limit when it went down.',
            $summary,
            $this->humanBytes($used),
            $this->humanBytes($limit)
        );
    }

    /**
     * @param array<string, mixed> $context
     */
    private function underMemoryPressure(array $context): bool
    {
        $used = $context['memory_bytes'] ?? null;
        $limit = $context['memory_limit_bytes'] ?? null;

        if (!is_int($used) || !is_int($limit) || $limit <= 0) {
            return false;
        }

        return ($used / $limit) >= self::MEMORY_PRESSURE_RATIO;
    }

    private function humanBytes(int $bytes): string
    {
        $units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        $value = (float) $bytes;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            ++$unit;
        }

        return sprintf($value >= 10 || $unit === 0 ? '%.0f %s' : '%.1f %s', $value, $units[$unit]);
    }
}
