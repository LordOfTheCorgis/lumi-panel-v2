<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Snowflake, so a string - it overflows a signed 32-bit int and
            // JavaScript can't hold it as a number either.
            $table->string('discord_id')->nullable()->unique()->after('avatar');
            $table->string('discord_username')->nullable()->after('discord_id');
            $table->timestamp('discord_linked_at')->nullable()->after('discord_username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['discord_id', 'discord_username', 'discord_linked_at']);
        });
    }
};
