@extends('layouts.admin')

@section('title')
    {{ $announcement->exists ? 'Edit Announcement' : 'New Announcement' }}
@endsection

@section('content-header')
    <h1>{{ $announcement->exists ? $announcement->title : 'New Announcement' }}<small>Shown in a bar across the top of the client panel.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.announcements') }}">Announcements</a></li>
        <li class="active">{{ $announcement->exists ? 'Edit' : 'New' }}</li>
    </ol>
@endsection

@section('content')
<form action="{{ $announcement->exists ? route('admin.announcements.view', $announcement->id) : route('admin.announcements.new') }}" method="POST">
    @if ($announcement->exists)
        @method('PATCH')
    @endif
    <div class="row">
        <div class="col-sm-8">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Content</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Title</label>
                        <input type="text" name="title" class="form-control" value="{{ old('title', $announcement->title) }}" required />
                        <p class="text-muted small">Shown in bold at the start of the bar.</p>
                    </div>
                    <div class="form-group">
                        <label class="control-label">Message</label>
                        <textarea name="content" class="form-control" rows="5" required>{{ old('content', $announcement->content) }}</textarea>
                        <p class="text-muted small">Plain text. Keep it short; this renders on a single bar.</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-sm-4">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Visibility</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Type</label>
                        <select name="type" class="form-control">
                            @foreach (\Pterodactyl\Models\Announcement::TYPES as $type)
                                <option value="{{ $type }}" @if(old('type', $announcement->type) === $type) selected @endif>
                                    {{ ucfirst($type) }}
                                </option>
                            @endforeach
                        </select>
                        <p class="text-muted small">Controls the colour of the bar.</p>
                    </div>
                    <div class="form-group">
                        <label class="control-label">
                            <input type="checkbox" name="is_active" value="1" @if(old('is_active', $announcement->is_active)) checked @endif />
                            Active
                        </label>
                        <p class="text-muted small">Uncheck to hide without deleting.</p>
                    </div>
                    <div class="form-group">
                        <label class="control-label">Starts At</label>
                        <input type="datetime-local" name="starts_at" class="form-control"
                               value="{{ old('starts_at', $announcement->starts_at?->format('Y-m-d\TH:i')) }}" />
                        <p class="text-muted small">Leave blank to show immediately.</p>
                    </div>
                    <div class="form-group">
                        <label class="control-label">Ends At</label>
                        <input type="datetime-local" name="ends_at" class="form-control"
                               value="{{ old('ends_at', $announcement->ends_at?->format('Y-m-d\TH:i')) }}" />
                        <p class="text-muted small">Leave blank to show indefinitely.</p>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save</button>
                </div>
            </div>
        </div>
    </div>
</form>

@if ($announcement->exists)
    <div class="row">
        <div class="col-sm-4 col-sm-offset-8">
            <div class="box box-danger">
                <div class="box-header with-border">
                    <h3 class="box-title">Delete</h3>
                </div>
                <div class="box-body">
                    <p class="text-muted small">This cannot be undone.</p>
                </div>
                <div class="box-footer">
                    <form action="{{ route('admin.announcements.delete', $announcement->id) }}" method="POST">
                        {!! csrf_field() !!}
                        @method('DELETE')
                        <button type="submit" class="btn btn-danger pull-right">Delete Announcement</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
@endif
@endsection
