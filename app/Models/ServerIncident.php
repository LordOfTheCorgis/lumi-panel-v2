<?php

namespace Pterodactyl\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $server_id
 * @property Carbon $occurred_at
 * @property Carbon $detected_at
 * @property string $cause
 * @property string $summary
 * @property string|null $log_tail
 * @property array|null $context
 * @property Carbon|null $acknowledged_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Server $server
 */
class ServerIncident extends Model
{
    public const RESOURCE_NAME = 'server_incident';

    // Kept in sync with CrashAnalyser's signature table. Anything it can't place
    // lands on UNKNOWN, which still gets a report - "we don't know why" plus the
    // log is worth a great deal more than silence.
    public const CAUSE_UNKNOWN = 'unknown';
    public const CAUSE_OUT_OF_MEMORY = 'out_of_memory';
    public const CAUSE_PORT_CONFLICT = 'port_conflict';
    public const CAUSE_JAVA_VERSION = 'java_version';
    public const CAUSE_MISSING_JAR = 'missing_jar';
    public const CAUSE_EULA = 'eula';
    public const CAUSE_BAD_RESOURCE = 'bad_resource';
    public const CAUSE_STARTUP_FAILURE = 'startup_failure';

    protected $table = 'server_incidents';

    protected $guarded = ['id'];

    protected $casts = [
        'id' => 'int',
        'server_id' => 'int',
        'context' => 'array',
        'occurred_at' => 'datetime',
        'detected_at' => 'datetime',
        'acknowledged_at' => 'datetime',
    ];

    public static array $validationRules = [
        'server_id' => 'required|exists:servers,id',
        'occurred_at' => 'required|date',
        'detected_at' => 'required|date',
        'cause' => 'required|string|max:32',
        'summary' => 'required|string|max:191',
        'log_tail' => 'nullable|string',
        'context' => 'nullable|array',
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\Pterodactyl\Models\Server, $this>
     */
    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }
}
