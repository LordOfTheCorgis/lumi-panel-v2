<?php

return [
    // Master switch. With this off the API endpoints 404 and the UI never
    // renders, so a half-configured install can't hand out broken records.
    'enabled' => env('SUBDOMAINS_ENABLED', false),

    // The zone customers get a name under, e.g. "playlumix.gg" produces
    // "whatever.playlumix.gg". Must match the Cloudflare zone below.
    'domain' => env('SUBDOMAIN_BASE_DOMAIN', ''),

    'cloudflare' => [
        // Scoped API token (Zone:DNS:Edit on this zone only). Never the global
        // API key - that thing can do anything to every domain on the account.
        'token' => env('CLOUDFLARE_API_TOKEN', ''),
        'zone_id' => env('CLOUDFLARE_ZONE_ID', ''),
    ],

    // Seconds. Deliberately short: servers move between nodes and a stale
    // record points players at someone else's machine.
    'ttl' => env('SUBDOMAIN_TTL', 120),

    // Length bounds on the label itself (the bit before the dot). DNS allows
    // up to 63; the floor is ours, to stop people squatting every 1-2 char name.
    'min_length' => 3,
    'max_length' => 32,

    /*
    |--------------------------------------------------------------------------
    | Reserved Labels
    |--------------------------------------------------------------------------
    |
    | Names customers can't take. Two reasons to be greedy here: anything that
    | already exists in the zone would collide, and anything that *looks*
    | official is a phishing vector - someone grabbing "billing" and putting up
    | a payment form is a genuinely bad day.
    |
    */
    'reserved' => [
        // Infrastructure that exists or will
        'www', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'sftp', 'ns', 'ns1', 'ns2',
        'mx', 'dns', 'vpn', 'cdn', 'static', 'assets', 'img', 'images',
        // Ours
        'panel', 'billing', 'status', 'docs', 'api', 'admin', 'dashboard',
        'client', 'portal', 'node', 'nodes', 'wings', 'daemon', 'db', 'database',
        'backup', 'backups', 'git', 'ci', 'dev', 'staging', 'test', 'demo',
        'lumi', 'lumix', 'lumixsolutions',
        // Impersonation bait
        'support', 'help', 'helpdesk', 'ticket', 'tickets', 'account', 'accounts',
        'login', 'signin', 'signup', 'register', 'auth', 'sso', 'oauth',
        'pay', 'payment', 'payments', 'invoice', 'invoices', 'checkout', 'store',
        'shop', 'secure', 'security', 'verify', 'verification', 'official',
        'staff', 'team', 'mod', 'moderator', 'owner', 'root', 'system',
    ],
];
