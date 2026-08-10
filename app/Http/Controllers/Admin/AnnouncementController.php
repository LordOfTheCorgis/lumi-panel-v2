<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Models\Announcement;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\AnnouncementFormRequest;

class AnnouncementController extends Controller
{
    public function __construct(protected AlertsMessageBag $alert)
    {
    }

    /**
     * Show every announcement, newest first.
     */
    public function index(): View
    {
        return view('admin.announcements.index', [
            'announcements' => Announcement::query()->orderByDesc('created_at')->get(),
        ]);
    }

    /**
     * Show the creation form.
     */
    public function create(): View
    {
        return view('admin.announcements.view', ['announcement' => new Announcement(['type' => 'info', 'is_active' => true])]);
    }

    /**
     * Show the edit form for an existing announcement.
     */
    public function view(Announcement $announcement): View
    {
        return view('admin.announcements.view', ['announcement' => $announcement]);
    }

    /**
     * Persist a new announcement.
     *
     * @throws \Throwable
     */
    public function store(AnnouncementFormRequest $request): RedirectResponse
    {
        $announcement = new Announcement();
        $announcement->fill($request->validated())->saveOrFail();

        $this->alert->success('Announcement has been created.')->flash();

        return redirect()->route('admin.announcements.view', $announcement->id);
    }

    /**
     * Update an existing announcement.
     *
     * @throws \Throwable
     */
    public function update(AnnouncementFormRequest $request, Announcement $announcement): RedirectResponse
    {
        $announcement->fill($request->validated())->saveOrFail();

        $this->alert->success('Announcement has been updated.')->flash();

        return redirect()->route('admin.announcements.view', $announcement->id);
    }

    /**
     * Delete an announcement outright. There is nothing referencing these, so
     * there is no soft-delete or cascade to worry about.
     */
    public function delete(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        $this->alert->success('Announcement has been deleted.')->flash();

        return redirect()->route('admin.announcements');
    }
}
