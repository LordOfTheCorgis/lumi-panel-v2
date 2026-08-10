#!/usr/bin/env bash
#
# Lumi Panel deploy. Pulls the branch, installs dependencies, builds the
# frontend on the box and runs migrations.
#
#   bash deploy.sh              # deploy the default branch (1.0-develop)
#   bash deploy.sh 1.0-develop  # deploy a specific branch
#
set -euo pipefail

BRANCH="${1:-1.0-develop}"
PANEL_DIR="${PANEL_DIR:-/var/www/pterodactyl}"

cd "$PANEL_DIR"

# Whatever happens after this point, take the panel back out of maintenance
# mode. A failed build should not leave the site dark.
cleanup() {
    php artisan up >/dev/null 2>&1 || true
}

step() { printf '\n\033[1;31m==>\033[0m \033[1m%s\033[0m\n' "$1"; }

# The web user differs by distro: www-data on Debian/Ubuntu, nginx on RHEL.
WEB_USER="www-data"
id -u nginx >/dev/null 2>&1 && WEB_USER="nginx"

step "Checking prerequisites"
command -v php >/dev/null || { echo "php not found"; exit 1; }
command -v composer >/dev/null || { echo "composer not found"; exit 1; }
command -v node >/dev/null || { echo "node not found - install Node 18+"; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "node ${NODE_MAJOR} is too old; this build needs 18 or newer"
    exit 1
fi

if command -v yarn >/dev/null; then
    PKG_INSTALL="yarn install --frozen-lockfile"
    PKG_BUILD="yarn build:production"
else
    # The repo ships yarn.lock, so npm resolves its own tree. It works, but
    # prefer yarn when it is available.
    echo "yarn not found, falling back to npm"
    PKG_INSTALL="npm install --no-audit --no-fund"
    PKG_BUILD="npm run build:production"
fi

step "Entering maintenance mode"
php artisan down || true
trap cleanup EXIT

step "Pulling ${BRANCH}"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/${BRANCH}"

step "Installing PHP dependencies"
composer install --no-dev --optimize-autoloader --no-interaction

step "Installing JS dependencies"
$PKG_INSTALL

step "Building the frontend"
# Old hashed chunks are never overwritten (the filenames change every build),
# so clear them out or public/assets grows without bound.
rm -f public/assets/*.js public/assets/*.map
$PKG_BUILD

step "Running migrations"
php artisan migrate --force

step "Clearing caches"
php artisan optimize:clear

step "Fixing ownership (${WEB_USER})"
chown -R "${WEB_USER}:${WEB_USER}" "$PANEL_DIR"

step "Done - bringing the panel back up"
# The EXIT trap runs `php artisan up`.
git --no-pager log --oneline -1
