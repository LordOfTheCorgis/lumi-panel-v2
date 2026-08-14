<?php

namespace Pterodactyl\Events\Auth;

use Pterodactyl\Events\Event;
use Illuminate\Queue\SerializesModels;

class FailedCaptcha extends Event
{
    use SerializesModels;

    /**
     * Create a new event instance.
     */
    /**
     * $domain is nullable because most failures happen before Cloudflare tells
     * us anything: no token submitted, a network error reaching siteverify, or
     * a malformed reply. Typing it as a plain string meant those cases threw a
     * TypeError and turned an ordinary 400 into a 500.
     */
    public function __construct(public string $ip, public ?string $domain = null)
    {
    }
}
