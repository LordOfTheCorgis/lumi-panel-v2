<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    public function up(): void
    {
        Schema::create('server_subdomains', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('server_id');

            // Label and zone are stored separately so a second base domain can
            // be added later without touching this table.
            $table->string('subdomain', 63);
            $table->string('domain');

            // Cloudflare's own IDs. Kept so updates and deletes address the
            // record directly instead of listing the zone and matching on name,
            // which is both slower and racy.
            $table->string('zone_id');
            $table->string('record_id')->nullable();

            // What the A record currently points at. Lets the reconcile command
            // spot drift without a round trip per server.
            $table->string('record_target')->nullable();

            $table->timestamps();

            $table->unique(['subdomain', 'domain']);
            // One name per server for now; drop this to allow several.
            $table->unique('server_id');

            $table->foreign('server_id')->references('id')->on('servers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_subdomains');
    }
};
