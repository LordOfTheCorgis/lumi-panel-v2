<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('server_subdomains', function (Blueprint $table) {
            // FiveM reads _cfx._udp SRV records, which is what lets players
            // connect without typing a port. Tracked separately from the A
            // record because they're two records with independent IDs.
            $table->string('srv_record_id')->nullable()->after('record_id');
            // The port the SRV currently advertises, so sync can spot a changed
            // primary allocation the same way record_target spots a moved node.
            $table->unsignedInteger('record_port')->nullable()->after('record_target');
        });
    }

    public function down(): void
    {
        Schema::table('server_subdomains', function (Blueprint $table) {
            $table->dropColumn(['srv_record_id', 'record_port']);
        });
    }
};
