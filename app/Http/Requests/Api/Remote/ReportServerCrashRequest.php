<?php

namespace Pterodactyl\Http\Requests\Api\Remote;

use Illuminate\Foundation\Http\FormRequest;

/**
 * What wings sends when one of its servers dies without being asked to.
 *
 * Everything past the timestamp is optional on purpose. A container that gets
 * killed hard leaves very little behind, and a report saying "it died at 03:14
 * and we don't know why" is still worth filing - refusing it because Docker
 * didn't hand over an exit code would throw away the only record anyone has.
 */
class ReportServerCrashRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'occurred_at' => 'required|date',
            'exit_code' => 'nullable|integer',
            'oom_killed' => 'nullable|boolean',
            // Milliseconds the container had been up, matching the units wings
            // already uses for utilization.uptime.
            'uptime' => 'nullable|integer|min:0',
            'memory_bytes' => 'nullable|integer|min:0',
            'memory_limit_bytes' => 'nullable|integer|min:0',
            'cpu_absolute' => 'nullable|numeric|min:0',
            // Whether wings is bringing it back up itself, so the report can say
            // so rather than leaving someone wondering if they need to act.
            'restarted' => 'nullable|boolean',
            'log' => 'nullable|array',
            'log.*' => 'string',
        ];
    }
}
