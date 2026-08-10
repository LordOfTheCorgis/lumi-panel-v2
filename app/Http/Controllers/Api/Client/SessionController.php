<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\Session;
use Pterodactyl\Facades\Activity;
use Illuminate\Database\Eloquent\Collection;
use Pterodactyl\Transformers\Api\Client\SessionTransformer;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class SessionController extends ClientApiController
{
    /**
     * Sessions only land in the database when the session driver is set to
     * "database". The panel ships defaulting to redis, in which case there is
     * nothing to list and we say so rather than rendering an empty table that
     * looks broken.
     */
    protected function supported(): bool
    {
        return config('session.driver') === 'database';
    }

    public function index(ClientApiRequest $request): array
    {
        $sessions = $this->supported()
            ? Session::query()
                ->where('user_id', $request->user()->id)
                ->orderByDesc('last_activity')
                ->get()
            : new Collection();

        return $this->fractal->collection($sessions)
            ->transformWith($this->getTransformer(SessionTransformer::class))
            ->addMeta(['supported' => $this->supported()])
            ->toArray();
    }

    /**
     * Revoke a single session. The client only ever sees a hash of the session
     * ID, so match on that rather than trusting an ID off the wire.
     */
    public function delete(ClientApiRequest $request, string $hash): JsonResponse
    {
        if ($this->supported()) {
            $session = Session::query()
                ->where('user_id', $request->user()->id)
                ->get()
                ->first(fn (Session $s) => hash_equals($hash, sha1($s->id)));

            if ($session !== null && !hash_equals(session()->getId(), (string) $session->id)) {
                $session->delete();

                Activity::event('user:account.session-revoked')->property('ip', $session->ip_address)->log();
            }
        }

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Sign out everywhere except the device making the request.
     */
    public function deleteOthers(ClientApiRequest $request): JsonResponse
    {
        if ($this->supported()) {
            $count = Session::query()
                ->where('user_id', $request->user()->id)
                ->where('id', '!=', session()->getId())
                ->delete();

            Activity::event('user:account.session-revoked')->property('count', $count)->log();
        }

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }
}
