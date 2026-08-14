<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $server_id
 * @property string $subdomain
 * @property string $domain
 * @property string $zone_id
 * @property string|null $record_id
 * @property string|null $record_target
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property string $fqdn
 * @property Server $server
 */
class ServerSubdomain extends Model
{
    public const RESOURCE_NAME = 'server_subdomain';

    protected $table = 'server_subdomains';

    protected $guarded = ['id'];

    protected $casts = [
        'id' => 'int',
        'server_id' => 'int',
    ];

    public static array $validationRules = [
        'server_id' => 'required|exists:servers,id',
        'subdomain' => 'required|string|max:63',
        'domain' => 'required|string',
        'zone_id' => 'required|string',
        'record_id' => 'nullable|string',
        'record_target' => 'nullable|string',
    ];

    /**
     * The name players actually type.
     */
    public function getFqdnAttribute(): string
    {
        return $this->subdomain . '.' . $this->domain;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\Pterodactyl\Models\Server, $this>
     */
    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }
}
