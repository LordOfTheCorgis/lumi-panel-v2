<?php

namespace Pterodactyl\Extensions\Themes;

class Theme
{
    public function js($path): string
    {
        return sprintf('<script src="%s"></script>' . PHP_EOL, $this->getUrl($path));
    }

    public function css($path): string
    {
        return sprintf('<link media="all" type="text/css" rel="stylesheet" href="%s"/>' . PHP_EOL, $this->getUrl($path));
    }

    protected function getUrl($path): string
    {
        [$path, $query] = array_pad(explode('?', $path, 2), 2, null);

        $path = '/themes/pterodactyl/' . ltrim($path, '/');

        if ($query === null) {
            return $path;
        }

        return $path . '?' . str_replace('{cache-version}', $this->cacheVersion($path), $query);
    }

    /**
     * Resolves the "{cache-version}" token the theme templates append to every
     * asset. Upstream never substituted it, so the token was served literally
     * and each file sat behind a URL that could never change — a stylesheet
     * edit would not reach anyone who had already loaded the page.
     *
     * Keyed on the file's modification time so a deploy busts the cache on its
     * own, with no version bump to remember.
     */
    protected function cacheVersion(string $path): string
    {
        static $versions = [];

        if (!array_key_exists($path, $versions)) {
            $file = public_path(ltrim($path, '/'));

            $versions[$path] = is_file($file) ? (string) filemtime($file) : 'dev';
        }

        return $versions[$path];
    }
}
