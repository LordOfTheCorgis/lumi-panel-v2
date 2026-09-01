<?php

namespace Pterodactyl\Http\Middleware;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Events\Auth\FailedCaptcha;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use GuzzleHttp\Exception\GuzzleException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Validates a Cloudflare Turnstile token against Cloudflare's siteverify
 * endpoint.
 */
class VerifyCaptcha
{
    private const FIELD = 'cf-turnstile-response';

    public function __construct(private Dispatcher $dispatcher, private Repository $config)
    {
    }

    /**
     * Whether the captcha is both switched on and actually usable. Missing keys
     * count as unconfigured rather than as a hard failure: rejecting every
     * login because someone enabled the toggle without filling in the secret
     * would lock out the only person who can fix it.
     */
    private function configured(): bool
    {
        return (bool) $this->config->get('turnstile.enabled')
            && !empty($this->config->get('turnstile.site_key'))
            && !empty($this->config->get('turnstile.secret_key'));
    }

    public function handle(Request $request, \Closure $next): mixed
    {
        if (!$this->configured()) {
            if ($this->config->get('turnstile.enabled')) {
                Log::warning('Turnstile is enabled but has no keys configured; requests are passing unverified.');
            }

            return $next($request);
        }

        $result = null;

        if ($request->filled(self::FIELD)) {
            try {
                $client = new Client(['timeout' => 10]);
                $res = $client->post($this->config->get('turnstile.domain'), [
                    'form_params' => [
                        'secret' => $this->config->get('turnstile.secret_key'),
                        'response' => $request->input(self::FIELD),
                        // Lets Cloudflare factor the client address into its
                        // decision and into per-IP abuse tracking.
                        'remoteip' => $request->ip(),
                    ],
                ]);

                if ($res->getStatusCode() === 200) {
                    $result = json_decode($res->getBody());

                    if (($result->success ?? false) && $this->hostnameMatches($result, $request)) {
                        return $next($request);
                    }

                    // Cloudflare explains itself here; without this a rejected
                    // login is indistinguishable from a wrong password.
                    Log::info('Turnstile rejected a token.', [
                        'errors' => $result->{'error-codes'} ?? [],
                        'hostname' => $result->hostname ?? null,
                    ]);
                }
            } catch (GuzzleException $exception) {
                Log::error('Could not reach Turnstile to verify a token.', ['error' => $exception->getMessage()]);
            }
        }

        // $result is null on every path that never got a 200 back from
        // siteverify (no token, network error, non-JSON body). Reading ->hostname
        // straight off it in that case is a PHP warning for no reason.
        $hostname = is_object($result) ? ($result->hostname ?? null) : null;
        $this->dispatcher->dispatch(new FailedCaptcha($request->ip(), $hostname));

        throw new HttpException(Response::HTTP_BAD_REQUEST, 'Failed to validate CAPTCHA data.');
    }

    /**
     * Cloudflare reports which hostname solved the challenge. Comparing it to
     * the host being requested stops a token minted on another site that shares
     * the site key from being replayed here.
     */
    private function hostnameMatches(\stdClass $result, Request $request): bool
    {
        if (!$this->config->get('turnstile.verify_domain')) {
            return true;
        }

        return ($result->hostname ?? null) === parse_url($request->url(), PHP_URL_HOST);
    }
}
