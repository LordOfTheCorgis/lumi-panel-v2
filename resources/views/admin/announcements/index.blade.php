@extends('layouts.admin')

@section('title')
    Announcements
@endsection

@section('content-header')
    <h1>Announcements<small>Messages shown in a bar across the top of the client panel.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Announcements</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">Announcement List</h3>
                <div class="box-tools">
                    <a href="{{ route('admin.announcements.new') }}" class="btn btn-sm btn-primary">Create New</a>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Window</th>
                            <th>Updated</th>
                        </tr>
                        @foreach ($announcements as $announcement)
                            <tr>
                                <td>
                                    <a href="{{ route('admin.announcements.view', $announcement->id) }}">{{ $announcement->title }}</a>
                                </td>
                                <td><code>{{ $announcement->type }}</code></td>
                                <td>
                                    @if ($announcement->isVisible())
                                        <span class="label label-success">Visible</span>
                                    @elseif (!$announcement->is_active)
                                        <span class="label label-default">Disabled</span>
                                    @elseif ($announcement->starts_at && $announcement->starts_at->isFuture())
                                        <span class="label label-warning">Scheduled</span>
                                    @else
                                        <span class="label label-default">Expired</span>
                                    @endif
                                </td>
                                <td>
                                    {{ $announcement->starts_at?->toDayDateTimeString() ?? 'Immediately' }}
                                    &rarr;
                                    {{ $announcement->ends_at?->toDayDateTimeString() ?? 'Never' }}
                                </td>
                                <td>{{ $announcement->updated_at->diffForHumans() }}</td>
                            </tr>
                        @endforeach
                        @if (count($announcements) === 0)
                            <tr>
                                <td colspan="5" class="text-center text-muted">
                                    No announcements have been created yet. The bar stays hidden until one is visible.
                                </td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
