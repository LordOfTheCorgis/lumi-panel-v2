<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cloudflare Turnstile
    |--------------------------------------------------------------------------
    |
    | Deliberately no default keys. The reCAPTCHA config this replaces shipped
    | a working site/secret pair committed to the public repository, so every
    | install that never set its own was verifying tokens against a secret
    | thousands of people already had. A captcha anyone can forge is worse than
    | no captcha, because it looks like protection.
    |
    | With no keys set the captcha reports itself as unconfigured and is
    | skipped. Failing closed instead would lock the admin out of the login
    | form they need in order to fix it.
    |
    */
    'enabled' => env('TURNSTILE_ENABLED', false),

    'site_key' => env('TURNSTILE_SITE_KEY', ''),
    'secret_key' => env('TURNSTILE_SECRET_KEY', ''),

    /*
     * Token verification endpoint. Cloudflare kept this reCAPTCHA-compatible:
     * same "secret" and "response" form fields, same {success, hostname} reply.
     */
    'domain' => env('TURNSTILE_DOMAIN', 'https://challenges.cloudflare.com/turnstile/v0/siteverify'),

    /*
     * Compare the hostname Cloudflare says solved the challenge against the
     * host serving the request, so a token minted on another site can't be
     * replayed here.
     */
    'verify_domain' => env('TURNSTILE_VERIFY_DOMAIN', true),
];
