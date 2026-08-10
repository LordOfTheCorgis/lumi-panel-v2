<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Builder;

/**
 * @property int $id
 * @property string $title
 * @property string $content
 * @property string $type
 * @property bool $is_active
 * @property \Carbon\Carbon|null $starts_at
 * @property \Carbon\Carbon|null $ends_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Announcement extends Model
{
    /**
     * The resource name for this model when it is transformed into an
     * API representation using fractal.
     */
    public const RESOURCE_NAME = 'announcement';

    public const TYPES = ['info', 'success', 'warning', 'danger'];

    protected $table = 'announcements';

    protected $guarded = ['id'];

    protected $casts = [
        'id' => 'int',
        'is_active' => 'bool',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public static array $validationRules = [
        'title' => 'required|string|max:191',
        'content' => 'required|string|max:5000',
        'type' => 'required|string|in:info,success,warning,danger',
        'is_active' => 'sometimes|boolean',
        'starts_at' => 'nullable|date',
        'ends_at' => 'nullable|date|after:starts_at',
    ];

    /**
     * Announcements that should be visible right now: flagged active, already
     * started (or with no start date), and not yet expired (or with no end
     * date).
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }

    /**
     * Whether this announcement would be shown to a user at this moment. Mirrors
     * the scope above so the admin list can explain why something is hidden.
     */
    public function isVisible(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->isPast()) {
            return false;
        }

        return true;
    }
}
