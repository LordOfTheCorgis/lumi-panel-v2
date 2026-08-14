<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Session;
use Illuminate\Support\Facades\Auth;
use Illuminate\Auth\SessionGuard;
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
                $this->invalidateRememberTokens($request->user());

                Activity::event('user:account.session-revoked')->property('ip', $session->ip_address)->log();
            }
        }

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Deleting the session row on its own is cosmetic. Every login here calls
     * login($user, true), so each browser also holds a remember-me cookie and
     * will silently re-authenticate on its very next request, minting a fresh
     * session as if nothing happened.
     *
     * Laravel keeps a single remember_token per user, so the only way to void
     * one device's cookie is to void them all. That is the blunt part of this:
     * other devices stay signed in on their existing sessions, but lose
     * "remember me" and will need a password once those sessions lapse.
     *
     * Logging back in on the current device re-issues a recaller built from the
     * new token, so whoever is doing the revoking doesn't sign themselves out.
     * That also migrates the current session to a new ID, which drops the old
     * row and leaves exactly one live session for this browser.
     */
    private function invalidateRememberTokens(User $user): void
    {
        $user->setRememberToken(Str::random(60));
        $user->save();

        // Explicitly the web guard. Auth::guard() with no argument resolves to
        // whatever is active for the request, which on /api/client is Sanctum's
        // RequestGuard - a token guard with no login() at all. Only the session
        // guard can re-issue the recaller cookie.
        $guard = Auth::guard('web');
        if ($guard instanceof SessionGuard) {
            $guard->login($user, true);
        }
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

            $this->invalidateRememberTokens($request->user());

            Activity::event('user:account.session-revoked')->property('count', $count)->log();
        }

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }
}
