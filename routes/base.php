<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Auth;
use Pterodactyl\Http\Controllers\Base;
use Pterodactyl\Http\Middleware\RequireTwoFactorAuthentication;

Route::get('/', [Base\IndexController::class, 'index'])->name('index')->fallback();
Route::get('/account', [Base\IndexController::class, 'index'])
    ->withoutMiddleware(RequireTwoFactorAuthentication::class)
    ->name('account');

Route::get('/locales/locale.json', Base\LocaleController::class)
    ->withoutMiddleware(['auth', RequireTwoFactorAuthentication::class])
    ->where('namespace', '.*');

Route::get('/{react}', [Base\IndexController::class, 'index'])
    ->where('react', '^(?!(\/)?(api|auth|admin|daemon)).+');

/*
|--------------------------------------------------------------------------
| Discord Account Linking
|--------------------------------------------------------------------------
|
| Session routes rather than API ones: OAuth is a browser redirect and needs
| the session to carry the CSRF state across the round trip.
|
*/
Route::middleware(['auth'])->prefix('/auth/discord')->group(function () {
    Route::get('/redirect', [Auth\DiscordLinkController::class, 'redirect'])->name('discord.redirect');
    Route::get('/callback', [Auth\DiscordLinkController::class, 'callback'])->name('discord.callback');
});
