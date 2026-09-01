<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    public function up(): void
    {
        Schema::create('server_incidents', function (Blueprint $table) {
            $table->increments('id');
            $table->char('uuid', 36)->unique();
            $table->unsignedInteger('server_id');

            // When the server actually went down, as best we can tell. The panel
            // polls, so this is the start of the window it died in rather than a
            // precise timestamp - see detected_at for when we noticed.
            $table->timestamp('occurred_at');
            $table->timestamp('detected_at');

            // Slug from CrashAnalyser. Deliberately a plain string and not an
            // enum: adding a signature shouldn't need a migration.
            $table->string('cause', 32);
            $table->string('summary');

            // Last chunk of console output before it died. Nullable because the
            // node can refuse or the log can be gone by the time we ask.
            $table->longText('log_tail')->nullable();

            // Whatever we knew about the machine at the time: memory against its
            // limit, cpu, how long it had been up.
            $table->json('context')->nullable();

            // A server stuck in a boot loop is one incident that happened forty
            // times, not forty incidents. updated_at carries the last of them.
            $table->unsignedInteger('occurrences')->default(1);

            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            // Every read is "this server's incidents, newest first".
            $table->index(['server_id', 'occurred_at']);

            $table->foreign('server_id')->references('id')->on('servers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_incidents');
    }
};
