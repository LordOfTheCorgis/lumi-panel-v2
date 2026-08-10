@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'discord'])

@section('title')
    Discord Settings
@endsection

@section('content-header')
    <h1>Discord<small>Let users link a Discord account and receive alerts by DM.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.settings') }}">Settings</a></li>
        <li class="active">Discord</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Discord Integration</h3>
                </div>
                <form action="{{ route('admin.settings.discord') }}" method="POST">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label class="control-label">Enabled</label>
                                <div>
                                    <select name="discord:enabled" class="form-control">
                                        <option value="0">Disabled</option>
                                        <option value="1" @if(config('discord.enabled')) selected @endif>Enabled</option>
                                    </select>
                                    <p class="text-muted"><small>When off, the linking option is hidden from the account page and no messages are sent.</small></p>
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">Client ID</label>
                                <div>
                                    <input type="text" class="form-control" name="discord:client_id" value="{{ old('discord:client_id', config('discord.client_id')) }}" />
                                    <p class="text-muted"><small>From the OAuth2 section of your Discord application.</small></p>
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">Mass Deletion Threshold</label>
                                <div>
                                    <input type="number" min="1" class="form-control" name="discord:nuke_threshold" value="{{ old('discord:nuke_threshold', config('discord.nuke_threshold')) }}" />
                                    <p class="text-muted"><small>Number of files deleted at once before the user is warned about a possible nuke.</small></p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group col-md-6">
                                <label class="control-label">Client Secret</label>
                                <div>
                                    <input type="password" class="form-control" name="discord:client_secret" value="{{ config('discord.client_secret') ? '!e' : '' }}" />
                                    <p class="text-muted"><small>Leave as-is to keep the stored value. Stored encrypted.</small></p>
                                </div>
                            </div>
                            <div class="form-group col-md-6">
                                <label class="control-label">Bot Token</label>
                                <div>
                                    <input type="password" class="form-control" name="discord:bot_token" value="{{ config('discord.bot_token') ? '!e' : '' }}" />
                                    <p class="text-muted"><small>Used to send direct messages. The bot must share a server with the user, or have DMs open to them. Stored encrypted.</small></p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-xs-12">
                                <div class="callout callout-info callout-slim">
                                    <p style="margin-bottom:0">
                                        Add this exact URL as an OAuth2 redirect in your Discord application, or linking will fail:
                                        <br><code>{{ $callback }}</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        {!! method_field('PATCH') !!}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
