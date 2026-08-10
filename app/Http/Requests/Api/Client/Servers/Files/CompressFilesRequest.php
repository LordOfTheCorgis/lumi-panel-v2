<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Files;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class CompressFilesRequest extends ClientApiRequest
{
    /**
     * Checks that the authenticated user is allowed to create archives for this server.
     */
    public function permission(): string
    {
        return Permission::ACTION_FILE_ARCHIVE;
    }

    public function rules(): array
    {
        return [
            'root' => 'sometimes|nullable|string',
            'files' => 'required|array',
            'files.*' => 'string',
            // Optional; Wings falls back to tar.gz when this is absent, which
            // is what every pre-existing client sends.
            'format' => 'sometimes|nullable|string|in:zip,tar_gz',
        ];
    }
}
