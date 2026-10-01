<?php
/**
 * expUIServerFunctions: the files exp::core stands for, the cache times the packer needs, the inline snippets, and
 * the page configuration exp_config() writes.
 */

use PHPUnit\Framework\TestCase;

final class ServerFunctionsTest extends TestCase
{
    private function ini( array $values )
    {
        $ini = eZINI::instance( 'expui.ini' );
        foreach ( $values as $name => $value )
        {
            $ini->setVariable( 'ExpUI', $name, $value );
        }
        return $ini;
    }

    protected function tearDown(): void
    {
        eZINI::resetInstance( 'expui.ini' );
    }

    public function testCoreFilesLocalWithMigrate()
    {
        $files = expUIServerFunctions::coreFiles( $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'enabled' ) ) );
        $this->assertSame( array( 'exp::before', '/lib/jquery/jquery-4.0.0.min.js', '/lib/jquery/jquery-migrate-4.0.2.js', 'exp::boot', 'exp/core.js' ), $files );
    }

    public function testCoreFilesWithoutMigrate()
    {
        $files = expUIServerFunctions::coreFiles( $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'disabled' ) ) );
        $this->assertSame( array( 'exp::before', '/lib/jquery/jquery-4.0.0.min.js', 'exp::boot', 'exp/core.js' ), $files );
    }

    public function testCoreFilesFromTheCdn()
    {
        $files = expUIServerFunctions::coreFiles( $this->ini( array( 'JQuery' => 'cdn', 'Migrate' => 'enabled' ) ) );
        $this->assertSame( 'https://code.jquery.com/jquery-4.0.0.min.js', $files[1] );
        $this->assertSame( 'https://code.jquery.com/jquery-migrate-4.0.2.min.js', $files[2] );
    }

    public function testCorePutsItsFilesInFrontOfThePack()
    {
        $pack = array( 'mine.js' );
        $this->assertSame( '', expUIServerFunctions::core( array(), $pack ) );
        $this->assertSame( 'exp::before', $pack[0] );
        $this->assertSame( 'mine.js', end( $pack ) );
    }

    public function testIoAndCompatPutTheirFileInFront()
    {
        $pack = array( 'mine.js' );
        expUIServerFunctions::io( array(), $pack );
        $this->assertSame( array( 'exp/io.js', 'mine.js' ), $pack );
        $pack = array( 'mine.js' );
        expUIServerFunctions::compat( array(), $pack );
        $this->assertSame( array( 'exp/compat.js', 'mine.js' ), $pack );
    }

    private function ezjscore( $jquery, $cdn = false )
    {
        $ini = eZINI::instance( 'ezjscore.ini' );
        $ini->setVariable( 'eZJSCore', 'LoadFromCDN', $cdn ? 'enabled' : 'disabled' );
        $ini->setVariable( 'eZJSCore', $cdn ? 'ExternalScripts' : 'LocalScripts', array( 'jquery' => $jquery ) );
        return $ini;
    }

    public function testCoreSharedLeavesJqueryOutWhenEzjscJqueryLoadsTheSameRelease()
    {
        $expui = $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'enabled' ) );
        // expui's own copy (expui before ezjscore) and ezjscore's own copy of the same release both count
        foreach ( array( '/lib/jquery/jquery-4.0.0.min.js', 'jquery-4.0.0.min.js' ) as $pageJquery )
        {
            $files = expUIServerFunctions::coreFiles( $expui, true, $this->ezjscore( $pageJquery ) );
            $this->assertSame( array( 'exp::before', 'exp::boot', 'exp/core.js' ), $files, $pageJquery );
        }
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    public function testCoreSharedKeepsJqueryWhenThePageHasAnotherOne()
    {
        $expui = $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'enabled' ) );
        $files = expUIServerFunctions::coreFiles( $expui, true, $this->ezjscore( 'jquery-3.7.1.min.js' ) );
        $this->assertContains( '/lib/jquery/jquery-4.0.0.min.js', $files, 'a jQuery 3 page: jQuery 4 is loaded next to it' );
        $this->assertContains( '/lib/jquery/jquery-migrate-4.0.2.js', $files );
        $files = expUIServerFunctions::coreFiles( $expui, true, $this->ezjscore( '' ) );
        $this->assertContains( '/lib/jquery/jquery-4.0.0.min.js', $files, 'no jQuery named at all' );
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    public function testCoreSharedComparesTheCdnFileWhenEzjscoreLoadsFromTheCdn()
    {
        $expui = $this->ini( array( 'JQuery' => 'cdn', 'Migrate' => 'enabled' ) );
        $files = expUIServerFunctions::coreFiles( $expui, true, $this->ezjscore( 'https://code.jquery.com/jquery-4.0.0.min.js', true ) );
        $this->assertSame( array( 'exp::before', 'exp::boot', 'exp/core.js' ), $files );
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    public function testCoreWithoutSharedAlwaysLoadsJquery()
    {
        $expui = $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'enabled' ) );
        $files = expUIServerFunctions::coreFiles( $expui, false, $this->ezjscore( '/lib/jquery/jquery-4.0.0.min.js' ) );
        $this->assertContains( '/lib/jquery/jquery-4.0.0.min.js', $files );
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    public function testCoreReadsSharedFromItsArguments()
    {
        $this->ini( array( 'JQuery' => 'local', 'Migrate' => 'enabled' ) );
        $this->ezjscore( '/lib/jquery/jquery-4.0.0.min.js' );
        $pack = array();
        expUIServerFunctions::core( array( 'shared' ), $pack );
        $this->assertNotContains( '/lib/jquery/jquery-4.0.0.min.js', $pack, 'exp::core::shared' );
        $pack = array();
        expUIServerFunctions::core( array(), $pack );
        $this->assertContains( '/lib/jquery/jquery-4.0.0.min.js', $pack, 'exp::core' );
        eZINI::resetInstance( 'ezjscore.ini' );
    }

    public function testCollapseAndStickyPutTheirFileInFront()
    {
        $pack = array( 'mine.js' );
        expUIServerFunctions::collapse( array(), $pack );
        $this->assertSame( array( 'exp/collapse.js', 'mine.js' ), $pack );
        $pack = array( 'mine.js' );
        expUIServerFunctions::sticky( array(), $pack );
        $this->assertSame( array( 'exp/sticky.js', 'mine.js' ), $pack );
    }

    public function testCacheTimes()
    {
        foreach ( array( 'core', 'io', 'compat', 'collapse', 'sticky' ) as $fn )
        {
            $this->assertSame( -1, expUIServerFunctions::getCacheTime( $fn ), $fn . ' adds files, so it must run at once' );
        }
        $this->assertGreaterThan( 0, expUIServerFunctions::getCacheTime( 'boot' ) );
        $this->assertGreaterThan( 0, expUIServerFunctions::getCacheTime( 'before' ) );
    }

    public function testBeforeRemembersThePagesJquery()
    {
        $this->assertStringContainsString( 'window.ExpPrevious = { jQuery: window.jQuery, dollar: window.$ }', expUIServerFunctions::before( array() ) );
    }

    public function testBootKeepsJquery4AndGivesThePageItsOwnBack()
    {
        $js = expUIServerFunctions::boot( array() );
        $this->assertStringContainsString( "split('.')[0] !== '4'", $js, 'refuses another major version' );
        $this->assertStringContainsString( 'Exp.$ = jq', $js );
        $this->assertStringContainsString( 'jq.noConflict(true)', $js );
        $this->assertStringContainsString( 'Exp.jQueryShared', $js );
    }

    public function testConfigShape()
    {
        $data = expUIServerFunctions::config();
        $this->assertSame( array( 'config', 'strings', 'prefs' ), array_keys( $data ) );
        $c = $data['config'];
        foreach ( array( 'version', 'root', 'www', 'siteaccess', 'call', 'prefsUrl', 'tokenElement', 'separator', 'locale' ) as $key )
        {
            $this->assertArrayHasKey( $key, $c );
        }
        $this->assertSame( expUIServerFunctions::VERSION, $c['version'] );
        $this->assertStringEndsWith( 'ezjscore/call/', $c['call'] );
        $this->assertStringEndsWith( 'user/preferences', $c['prefsUrl'] );
        $this->assertSame( '@SEPARATOR$', $c['separator'] );
        $this->assertContains( $c['locale']['firstDay'], array( 0, 1 ) );
    }

    public function testConfigTranslatesTheStringsOfTheSettings()
    {
        $data = expUIServerFunctions::config( array(), array( 'One more text' ) );
        $this->assertArrayHasKey( 'Close', $data['strings'] );
        $this->assertArrayHasKey( 'One more text', $data['strings'] );
    }

    public function testConfigDropsBadPreferenceNames()
    {
        $data = expUIServerFunctions::config( array( 'no spaces', str_repeat( 'x', 65 ), '<script>', array( 'x' ) ) );
        $this->assertSame( array(), $data['prefs'] );
    }

    public function testConfigScriptCannotBeClosedByAValue()
    {
        $html = expUIServerFunctions::configScript( array(), array( '</script><script>alert(1)</script>' ) );
        $this->assertStringStartsWith( '<script type="application/json" id="exp-config">', $html );
        $this->assertSame( 1, substr_count( $html, '</script>' ), 'only the closing tag of the block itself' );
        $json = substr( $html, strlen( '<script type="application/json" id="exp-config">' ), -strlen( '</script>' ) );
        $data = json_decode( $json, true );
        $this->assertIsArray( $data );
        $this->assertArrayHasKey( '</script><script>alert(1)</script>', $data['strings'] );
    }
}
