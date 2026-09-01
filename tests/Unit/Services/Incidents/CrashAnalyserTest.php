<?php

namespace Pterodactyl\Tests\Unit\Services\Incidents;

use Pterodactyl\Tests\TestCase;
use Pterodactyl\Models\ServerIncident;
use Pterodactyl\Services\Incidents\CrashAnalyser;

class CrashAnalyserTest extends TestCase
{
    private CrashAnalyser $analyser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->analyser = new CrashAnalyser();
    }

    public function testItReadsAJavaHeapDeathAsMemory(): void
    {
        $result = $this->analyser->analyse(<<<'LOG'
            [12:04:11] [Server thread/INFO]: Saving worlds
            [12:04:12] [Server thread/ERROR]: Encountered an unexpected exception
            java.lang.OutOfMemoryError: Java heap space
            LOG);

        $this->assertSame(ServerIncident::CAUSE_OUT_OF_MEMORY, $result->cause);
    }

    public function testItPutsTheNumbersInTheSummaryWhenItHasThem(): void
    {
        $result = $this->analyser->analyse('java.lang.OutOfMemoryError: Java heap space', [
            'memory_bytes' => 4187593113,
            'memory_limit_bytes' => 4294967296,
        ]);

        $this->assertStringContainsString('3.9 GiB', $result->summary);
        $this->assertStringContainsString('4 GiB', $result->summary);
    }

    public function testItCallsAnOomEvenWhenTheContainerDiedTooFastToSaySo(): void
    {
        // The common case: the kernel kills the process outright and the log just
        // stops mid-sentence.
        $result = $this->analyser->analyse("[12:04:11] [Server thread/INFO]: Saving worlds\n", [
            'memory_bytes' => 4290000000,
            'memory_limit_bytes' => 4294967296,
        ]);

        $this->assertSame(ServerIncident::CAUSE_OUT_OF_MEMORY, $result->cause);
    }

    public function testItLeavesHealthyMemoryAlone(): void
    {
        $result = $this->analyser->analyse('[12:04:11] [Server thread/INFO]: Saving worlds', [
            'memory_bytes' => 1073741824,
            'memory_limit_bytes' => 4294967296,
            'uptime_seconds' => 86400,
        ]);

        $this->assertSame(ServerIncident::CAUSE_UNKNOWN, $result->cause);
    }

    public function testItSpotsAPortConflict(): void
    {
        $result = $this->analyser->analyse('[12:04:11] [Server thread/WARN]: **** FAILED TO BIND TO PORT!');

        $this->assertSame(ServerIncident::CAUSE_PORT_CONFLICT, $result->cause);
    }

    public function testItSpotsAJavaVersionMismatch(): void
    {
        $result = $this->analyser->analyse(
            'Exception in thread "main" java.lang.UnsupportedClassVersionError: net/minecraft/bundler/Main'
        );

        $this->assertSame(ServerIncident::CAUSE_JAVA_VERSION, $result->cause);
    }

    public function testItSpotsAMissingJar(): void
    {
        $result = $this->analyser->analyse('Error: Unable to access jarfile server.jar');

        $this->assertSame(ServerIncident::CAUSE_MISSING_JAR, $result->cause);
    }

    public function testItSpotsAnUnacceptedEula(): void
    {
        $result = $this->analyser->analyse('[12:04:11] [main/WARN]: You need to agree to the EULA in order to run the server.');

        $this->assertSame(ServerIncident::CAUSE_EULA, $result->cause);
    }

    public function testItSpotsAFiveMResourceTakingTheServerDown(): void
    {
        $result = $this->analyser->analyse('Could not start resource esx_ambulancejob: script error');

        $this->assertSame(ServerIncident::CAUSE_BAD_RESOURCE, $result->cause);
    }

    public function testItSeparatesNeverStartedFromFellOverLater(): void
    {
        $result = $this->analyser->analyse('some output nobody has a signature for', ['uptime_seconds' => 12]);

        $this->assertSame(ServerIncident::CAUSE_STARTUP_FAILURE, $result->cause);
        $this->assertStringContainsString('12 seconds', $result->summary);
    }

    public function testItStillFilesAReportWhenItHasNoIdea(): void
    {
        $result = $this->analyser->analyse(null);

        $this->assertSame(ServerIncident::CAUSE_UNKNOWN, $result->cause);
        $this->assertNotEmpty($result->summary);
    }

    public function testTheMemorySignatureBeatsTheResourceOne(): void
    {
        // A FiveM server that OOMs prints both; the memory problem is the one
        // worth telling someone about.
        $result = $this->analyser->analyse(<<<'LOG'
            Could not start resource esx_ambulancejob
            Out of memory: Killed process 4711 (FXServer)
            LOG);

        $this->assertSame(ServerIncident::CAUSE_OUT_OF_MEMORY, $result->cause);
    }
}
