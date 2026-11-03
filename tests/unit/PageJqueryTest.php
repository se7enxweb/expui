<?php
/**
 * ezsjc::jquery as expui sets it: jQuery 4 with Migrate 4 (one jQuery per page), the kernel's jquery() adding
 * Migrate only when it is named, and the boot reusing a page's jQuery 4.
 */

use PHPUnit\Framework\TestCase;

final class PageJqueryTest extends TestCase
{
    protected function tearDown(): void
    {
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    private function settings()
    {
        $text = (string)file_get_contents( EXPUI_TEST_CHECKOUT . '/settings/ezjscore.ini.append.php' );
        preg_match_all( '/^(LocalScripts|ExternalScripts)\[(\w+)\]=(.*)$/m', $text, $m, PREG_SET_ORDER );
        $out = array();
        foreach ( $m as $row )
        {
            $out[$row[1]][$row[2]] = trim( $row[3] );
        }
        return $out;
    }

    /** jQuery 4 alone: Migrate is switched off, and the comment that tells how to switch it on names files that exist */
    public function testExpuiPointsEzjscJqueryAtJquery4WithMigrateSwitchedOff()
    {
        $s = $this->settings();
        $this->assertSame( '/lib/jquery/jquery-4.0.0.min.js', $s['LocalScripts']['jquery'] );
        $this->assertSame( '', $s['LocalScripts']['jqueryMigrate'] );
        $this->assertSame( 'https://code.jquery.com/jquery-4.0.0.min.js', $s['ExternalScripts']['jquery'] );
        $this->assertSame( '', $s['ExternalScripts']['jqueryMigrate'] );
        foreach ( array_filter( $s['LocalScripts'] ) as $file )
        {
            $this->assertFileExists( EXPUI_TEST_CHECKOUT . '/design/standard' . $file );
        }
        $text = (string)file_get_contents( EXPUI_TEST_CHECKOUT . '/settings/ezjscore.ini.append.php' );
        $this->assertStringContainsString( '#   LocalScripts[jqueryMigrate]=' . self::MIGRATE, $text );
        $this->assertStringContainsString( '#   ExternalScripts[jqueryMigrate]=https://code.jquery.com/jquery-migrate-4.0.2.min.js', $text );
        $this->assertFileExists( EXPUI_TEST_CHECKOUT . '/design/standard' . self::MIGRATE );
    }

    /** The reporting build of Migrate an override names to switch it back on */
    const MIGRATE = '/lib/jquery/jquery-migrate-4.0.2.js';

    public function testKernelJqueryAddsMigrateAfterJquery()
    {
        $ini = eZINI::instance( 'ezjscore.ini' );
        $ini->setVariable( 'eZJSCore', 'LoadFromCDN', 'disabled' );
        $ini->setVariable( 'eZJSCore', 'LocalScripts', array( 'jqueryMigrate' => self::MIGRATE ) + $this->settings()['LocalScripts'] );
        $pack = array( 'mine.js' );
        ezjscServerFunctionsJs::jquery( array(), $pack );
        $this->assertSame( array( '/lib/jquery/jquery-4.0.0.min.js', '/lib/jquery/jquery-migrate-4.0.2.js', 'mine.js' ), $pack );
    }

    public function testKernelJqueryFromTheCdn()
    {
        $ini = eZINI::instance( 'ezjscore.ini' );
        $ini->setVariable( 'eZJSCore', 'LoadFromCDN', 'enabled' );
        $ini->setVariable( 'eZJSCore', 'ExternalScripts', $this->settings()['ExternalScripts'] );
        $pack = array();
        ezjscServerFunctionsJs::jquery( array(), $pack );
        $this->assertSame( array( 'https://code.jquery.com/jquery-4.0.0.min.js' ), $pack, 'Migrate is switched off' );
        $ini->setVariable( 'eZJSCore', 'ExternalScripts', array( 'jqueryMigrate' => 'https://code.jquery.com/jquery-migrate-4.0.2.min.js' ) + $this->settings()['ExternalScripts'] );
        $pack = array();
        ezjscServerFunctionsJs::jquery( array(), $pack );
        $this->assertSame( array( 'https://code.jquery.com/jquery-4.0.0.min.js', 'https://code.jquery.com/jquery-migrate-4.0.2.min.js' ), $pack );
    }

    public function testKernelJqueryWithoutMigrateIsOneFileAsBefore()
    {
        $ini = eZINI::instance( 'ezjscore.ini' );
        $ini->setVariable( 'eZJSCore', 'LoadFromCDN', 'disabled' );
        $ini->setVariable( 'eZJSCore', 'LocalScripts', array( 'jquery' => 'jquery-3.7.1.min.js', 'jqueryMigrate' => '' ) );
        $pack = array();
        ezjscServerFunctionsJs::jquery( array(), $pack );
        $this->assertSame( array( 'jquery-3.7.1.min.js' ), $pack );
    }

    /**
     * The kernel's own ezjscore ships jQuery 4, Migrate 4 and jQuery UI 1.14 and names them (so pages get jQuery 4
     * with or without expui, in either order); skipped against an older kernel.
     */
    public function testTheKernelsEzjscoreShipsJquery4()
    {
        $root = getcwd();
        $file = $root . '/extension/ezjscore/settings/ezjscore.ini';
        $text = is_file( $file ) ? (string)file_get_contents( $file ) : '';
        if ( !preg_match( '/^LocalScripts\[jquery\]=(.*jquery-4\.[^\s]*)$/m', $text, $m ) )
        {
            $this->markTestSkipped( 'this kernel\'s ezjscore still ships an older jQuery' );
        }
        $dir = $root . '/extension/ezjscore/design/standard/javascript/';
        $this->assertFileExists( $dir . trim( $m[1] ) );
        // Migrate: switched off (empty) since 6.0.15, or a Migrate 4 file that exists
        $this->assertMatchesRegularExpression( '/^LocalScripts\[jqueryMigrate\]=(jquery-migrate-4\.|\s*$)/m', $text );
        $this->assertMatchesRegularExpression( '/^LocalScripts\[jqueryUI\]=jquery-ui-1\.14\./m', $text );
        preg_match( '/^LocalScripts\[jqueryMigrate\]=(.*)$/m', $text, $mm );
        if ( trim( $mm[1] ) !== '' )
        {
            $this->assertFileExists( $dir . trim( $mm[1] ) );
        }
        preg_match( '/^LocalScripts\[jqueryUI\]=(.*)$/m', $text, $mu );
        $this->assertFileExists( $dir . trim( $mu[1] ) );
        // the same release as expui's copy, byte for byte
        $this->assertFileEquals( EXPUI_TEST_CHECKOUT . '/design/standard/lib/jquery/jquery-4.0.0.min.js', $dir . 'jquery-4.0.0.min.js' );
        $this->assertDoesNotMatchRegularExpression( '/ExternalScripts\[jquery\]=.*1\.10\.2/', $text, 'the CDN no longer names jQuery 1.10.2' );
    }

    public function testBootReusesAPagesJquery4()
    {
        $js = expUIServerFunctions::boot( array() );
        $this->assertStringContainsString( "String(other.fn.jquery).split('.')[0] === '4'", $js );
        $this->assertStringContainsString( 'Exp.$ = other;', $js );
    }
}
