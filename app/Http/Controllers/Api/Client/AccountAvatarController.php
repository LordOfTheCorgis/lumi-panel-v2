<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\Storage;

class AccountAvatarController extends ClientApiController
{
    private const DISK = 'public';

    /**
     * Upload a new avatar.
     *
     * No resizing here on purpose: that would need GD or Imagick and neither is
     * a hard requirement of the panel. The dimension and size limits below keep
     * the files small enough that it doesn't matter.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048|dimensions:max_width=1024,max_height=1024',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');

        // Keyed on the UUID plus a random suffix. The suffix is what busts
        // browser and CDN caches - reusing the same filename means people stare
        // at their old picture and assume the upload failed.
        $name = sprintf('%s-%s.%s', $user->uuid, str_random(8), $file->getClientOriginalExtension());

        $this->removeExisting($user->avatar);

        $file->storeAs('avatars', $name, self::DISK);

        $user->forceFill(['avatar' => $name])->saveOrFail();

        Activity::event('user:account.avatar-updated')->log();

        return new JsonResponse(['url' => $user->refresh()->avatar_url]);
    }

    /**
     * Drop the uploaded avatar and go back to the generated one.
     */
    public function delete(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->removeExisting($user->avatar);

        $user->forceFill(['avatar' => null])->saveOrFail();

        Activity::event('user:account.avatar-removed')->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    private function removeExisting(?string $avatar): void
    {
        if (!empty($avatar)) {
            Storage::disk(self::DISK)->delete('avatars/' . $avatar);
        }
    }
}
