@extends('layouts.admin')

@section('title')
    Administration
@endsection

@section('content-header')
    <h1>Overview<small>A quick glance at your system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Index</li>
    </ol>
@endsection

@section('content')
<div class="row lumi-stat-row">
    <div class="col-xs-6 col-sm-3">
        <a href="{{ route('admin.servers') }}" class="lumi-stat">
            <span class="lumi-stat-label"><i class="fa fa-server"></i> Servers</span>
            <span class="lumi-stat-value">{{ number_format($stats['servers']) }}</span>
            <span class="lumi-stat-detail">
                @if($stats['suspended'] > 0)
                    <span class="lumi-stat-warn">{{ number_format($stats['suspended']) }} suspended</span>
                @else
                    None suspended
                @endif
            </span>
        </a>
    </div>
    <div class="col-xs-6 col-sm-3">
        <a href="{{ route('admin.users') }}" class="lumi-stat">
            <span class="lumi-stat-label"><i class="fa fa-users"></i> Users</span>
            <span class="lumi-stat-value">{{ number_format($stats['users']) }}</span>
            <span class="lumi-stat-detail">Registered accounts</span>
        </a>
    </div>
    <div class="col-xs-6 col-sm-3">
        <a href="{{ route('admin.nodes') }}" class="lumi-stat">
            <span class="lumi-stat-label"><i class="fa fa-sitemap"></i> Nodes</span>
            <span class="lumi-stat-value">{{ number_format($stats['nodes']) }}</span>
            <span class="lumi-stat-detail">Across {{ number_format($stats['locations']) }} {{ $stats['locations'] === 1 ? 'location' : 'locations' }}</span>
        </a>
    </div>
    <div class="col-xs-6 col-sm-3">
        <a href="{{ route('admin.nodes') }}" class="lumi-stat">
            <span class="lumi-stat-label"><i class="fa fa-plug"></i> Allocations</span>
            <span class="lumi-stat-value">{{ number_format($stats['allocationsUsed']) }}</span>
            <span class="lumi-stat-detail">of {{ number_format($stats['allocations']) }} assigned</span>
        </a>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div class="box @if($version->isLatestPanel()) box-success @else box-danger @endif">
            <div class="box-header with-border">
                <h3 class="box-title">Panel Version</h3>
            </div>
            <div class="box-body">
                @if ($version->isLatestPanel())
                    Running version <code>{{ config('app.version') }}</code>. Up to date.
                @else
                    <strong>Not up to date.</strong> The latest release is
                    <a href="https://github.com/Pterodactyl/Panel/releases/v{{ $version->getPanel() }}" target="_blank"><code>{{ $version->getPanel() }}</code></a>
                    and this panel is running <code>{{ config('app.version') }}</code>.
                    Bear in mind this is a fork, so upstream releases may need merging rather than applying directly.
                @endif
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">Quick Links</h3>
            </div>
            <div class="box-body">
                <div class="row lumi-quick-links">
                    <div class="col-xs-6 col-sm-3">
                        <a href="{{ route('admin.announcements') }}" class="btn btn-primary btn-block">
                            <i class="fa fa-bullhorn"></i> Announcements
                        </a>
                    </div>
                    <div class="col-xs-6 col-sm-3">
                        <a href="{{ route('admin.settings.discord') }}" class="btn btn-default btn-block">
                            <i class="fa fa-comments"></i> Discord Settings
                        </a>
                    </div>
                    <div class="col-xs-6 col-sm-3">
                        <a href="https://pterodactyl.io" target="_blank" class="btn btn-default btn-block">
                            <i class="fa fa-book"></i> Documentation
                        </a>
                    </div>
                    <div class="col-xs-6 col-sm-3">
                        <a href="{{ route('index') }}" class="btn btn-default btn-block">
                            <i class="fa fa-external-link"></i> Exit Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
