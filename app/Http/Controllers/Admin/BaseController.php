<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

class BaseController extends Controller
{
    /**
     * BaseController constructor.
     */
    public function __construct(private SoftwareVersionService $version)
    {
    }

    /**
     * Return the admin index view.
     */
    public function index(): View
    {
        return view('admin.index', [
            'version' => $this->version,
            // The overview was a single "you are up to date" box. These are all
            // cheap counts and turn it into something worth loading.
            'stats' => [
                'servers' => Server::query()->count(),
                'suspended' => Server::query()->where('status', Server::STATUS_SUSPENDED)->count(),
                'users' => User::query()->count(),
                'nodes' => Node::query()->count(),
                'locations' => Location::query()->count(),
                'allocations' => Allocation::query()->count(),
                'allocationsUsed' => Allocation::query()->whereNotNull('server_id')->count(),
            ],
        ]);
    }
}
