<?php

namespace Pterodactyl\Transformers\Api\Client;

use Pterodactyl\Models\User;

class AccountTransformer extends BaseClientTransformer
{
    /**
     * Return the resource name for the JSONAPI output.
     */
    public function getResourceName(): string
    {
        return 'user';
    }

    /**
     * Return basic information about the currently logged-in user.
     */
    public function transform(User $model): array
    {
        return [
            'id' => $model->id,
            'uuid' => $model->uuid,
            'admin' => $model->root_admin,
            'username' => $model->username,
            'email' => $model->email,
            'first_name' => $model->name_first,
            'last_name' => $model->name_last,
            'language' => $model->language,
            'two_factor_enabled' => $model->use_totp,
            // How many single-use codes are left. People generate ten, burn
            // eight, and only find out when they're locked out.
            'recovery_tokens' => $model->recoveryTokens()->count(),
            'password_changed_at' => $model->password_changed_at?->toAtomString(),
            'created_at' => $model->created_at->toAtomString(),
        ];
    }
}
