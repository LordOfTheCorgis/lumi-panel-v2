<?php

return [
    // All of these are normally set from the admin panel rather than the .env;
    // the env fallbacks are here so a fresh install has something sane.
    'enabled' => env('DISCORD_ENABLED', false),
    'client_id' => env('DISCORD_CLIENT_ID', ''),
    'client_secret' => env('DISCORD_CLIENT_SECRET', ''),
    'bot_token' => env('DISCORD_BOT_TOKEN', ''),

    // Brand colour for embeds, as the integer Discord expects.
    'embed_color' => 0xED5E5E,

    // How many files have to go in one delete before we treat it as suspicious.
    'nuke_threshold' => env('DISCORD_NUKE_THRESHOLD', 25),
];
