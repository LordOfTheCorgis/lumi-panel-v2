<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

/**
 * The sessions table predates anything actually reading it - with the redis
 * driver it just sat empty. Switching to the database driver makes both of
 * these hot: user_id on every account page load, last_activity on every
 * garbage collection sweep. Neither was indexed.
 */
return new class () extends Migration {
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('last_activity');
        });
    }

    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['last_activity']);
        });
    }
};
