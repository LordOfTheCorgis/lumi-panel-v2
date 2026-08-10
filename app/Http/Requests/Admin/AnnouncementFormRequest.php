<?php

namespace Pterodactyl\Http\Requests\Admin;

use Pterodactyl\Models\Announcement;

class AnnouncementFormRequest extends AdminFormRequest
{
    /**
     * Set up the validation rules to use for these requests.
     */
    public function rules(): array
    {
        return Announcement::getRules();
    }

    /**
     * Unchecked checkboxes are simply absent from the payload, which would leave
     * an existing announcement active forever. Normalise it to a real boolean
     * before validation runs.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'starts_at' => $this->input('starts_at') ?: null,
            'ends_at' => $this->input('ends_at') ?: null,
        ]);
    }
}
