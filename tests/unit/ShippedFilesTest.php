<?php
/**
 * What the extension ships: the settings ezjscore and the kernel read, the jQuery files and their hashes, the
 * JavaScript and stylesheets the packer keys name, and the translations of every text.
 */

use PHPUnit\Framework\TestCase;

final class ShippedFilesTest extends TestCase
{
    private function path( $relative )
    {
        return EXPUI_TEST_CHECKOUT . '/' . $relative;
    }

    public function testEzjscoreKnowsTheExpServer()
    {
        $text = (string)file_get_contents( $this->path( 'settings/ezjscore.ini.append.php' ) );
        $this->assertMatchesRegularExpression( '/^\[ezjscServer_exp\]\s*\nClass=expUIServerFunctions$/m', $text );
    }

    /**
     * [eZJSCore] of the shipped ezjscore.ini.append.php, read from the file itself: the merged eZINI view depends on
     * where expui is in ActiveExtensions.
     */
    private function ezjscoreScripts( $group )
    {
        $text = (string)file_get_contents( $this->path( 'settings/ezjscore.ini.append.php' ) );
        preg_match_all( '/^' . $group . '\[(\w+)\]=(.*)$/m', $text, $m, PREG_SET_ORDER );
        $out = array();
        foreach ( $m as $row )
        {
            $out[$row[1]] = trim( $row[2] );
        }
        return $out;
    }

    public function testEzjscoreJqueryKeysPointToTheShippedFiles()
    {
        $local = $this->ezjscoreScripts( 'LocalScripts' );
        $this->assertSame( array( 'jquery', 'jqueryMigrate', 'jqueryUI' ), array_keys( $local ) );
        $heads = array(
            'jquery'        => '/^\/\*! jQuery v4\./',
            'jqueryMigrate' => '/jQuery Migrate - v4\./',
            'jqueryUI'      => '/^\/\*! jQuery UI - v1\.14\./',
        );
        foreach ( $local as $name => $file )
        {
            $path = $this->path( 'design/standard' . $file );
            $this->assertFileExists( $path, $name );
            $this->assertMatchesRegularExpression( $heads[$name], (string)file_get_contents( $path, false, null, 0, 400 ), $name );
        }
        // the same files as expui.ini's, so exp::core and ezjsc::jquery load one copy
        $expui = eZINI::instance( 'expui.ini' )->variable( 'ExpUI', 'LocalScripts' );
        $this->assertSame( $expui['jquery'], $local['jquery'] );
        $this->assertSame( $expui['migrate'], $local['jqueryMigrate'] );
    }

    public function testTheLocalJqueryUiMatchesTheCdnHash()
    {
        $local = $this->path( 'design/standard' . $this->ezjscoreScripts( 'LocalScripts' )['jqueryUI'] );
        $hash = 'sha384-' . base64_encode( hash_file( 'sha384', $local, true ) );
        $this->assertSame( eZINI::instance( 'expui.ini' )->variable( 'ExpUI', 'ExternalIntegrity' )['jqueryUI'], $hash );
        $this->assertFileExists( $this->path( 'design/standard/lib/jquery-ui/LICENSE-jquery-ui.txt' ) );
    }

    public function testModuleDesignAndTemplateSettings()
    {
        $this->assertStringContainsString( 'ModuleList[]=expui', (string)file_get_contents( $this->path( 'settings/module.ini.append.php' ) ) );
        $this->assertStringContainsString( 'DesignExtensions[]=expui', (string)file_get_contents( $this->path( 'settings/design.ini.append.php' ) ) );
        $this->assertStringContainsString( 'ExtensionAutoloadPath[]=expui', (string)file_get_contents( $this->path( 'settings/site.ini.append.php' ) ) );
    }

    public function testLocalScriptsExist()
    {
        $scripts = eZINI::instance( 'expui.ini' )->variable( 'ExpUI', 'LocalScripts' );
        foreach ( $scripts as $name => $file )
        {
            $this->assertFileExists( $this->path( 'design/standard' . $file ), $name );
        }
    }

    public function testTheLocalJqueryIsJquery4AndMatchesTheCdnHash()
    {
        $ini = eZINI::instance( 'expui.ini' );
        $local = $this->path( 'design/standard' . $ini->variable( 'ExpUI', 'LocalScripts' )['jquery'] );
        $this->assertStringStartsWith( '/*! jQuery v4.', (string)file_get_contents( $local ) );
        $hash = 'sha384-' . base64_encode( hash_file( 'sha384', $local, true ) );
        $this->assertSame( $ini->variable( 'ExpUI', 'ExternalIntegrity' )['jquery'], $hash, 'the CDN integrity hash is the local file\'s (same file)' );
    }

    public function testTheLocalMigrateReportsWarnings()
    {
        $local = $this->path( 'design/standard' . eZINI::instance( 'expui.ini' )->variable( 'ExpUI', 'LocalScripts' )['migrate'] );
        $text = (string)file_get_contents( $local );
        $this->assertMatchesRegularExpression( '/jQuery Migrate - v4\./', $text );
        $this->assertDoesNotMatchRegularExpression( '/^"undefined"==typeof jQuery\.migrateMute&&\(jQuery\.migrateMute=!0\)/m', $text, 'not the muted CDN build' );
    }

    public function testTheFilesThePackerKeysNameExist()
    {
        $pack = array();
        expUIServerFunctions::core( array(), $pack );
        expUIServerFunctions::io( array(), $pack );
        expUIServerFunctions::compat( array(), $pack );
        expUIServerFunctions::collapse( array(), $pack );
        expUIServerFunctions::sticky( array(), $pack );
        foreach ( $pack as $file )
        {
            if ( strpos( $file, '::' ) !== false || strpos( $file, '://' ) !== false )
            {
                continue;
            }
            $path = $file[0] === '/' ? $this->path( 'design/standard' . $file ) : $this->path( 'design/standard/javascript/' . $file );
            $this->assertFileExists( $path );
        }
        $this->assertFileExists( $this->path( 'design/standard/stylesheets/exp/core.css' ) );
    }

    public function testJavascriptParses()
    {
        $node = trim( (string)shell_exec( 'command -v node 2>/dev/null' ) );
        if ( $node === '' )
        {
            $this->markTestSkipped( 'node is not installed; the browser tests (expui/test) cover the JavaScript' );
        }
        $files = array_merge( glob( $this->path( 'design/standard/javascript/exp/*.js' ) ), glob( $this->path( 'design/standard/javascript/exp/test/*.js' ) ) );
        $this->assertNotEmpty( $files );
        foreach ( $files as $file )
        {
            exec( escapeshellarg( $node ) . ' --check ' . escapeshellarg( $file ) . ' 2>&1', $out, $code );
            $this->assertSame( 0, $code, basename( $file ) . ': ' . implode( "\n", $out ) );
        }
    }

    public function testEveryTextIsInEveryCatalogue()
    {
        $wanted = (array)eZINI::instance( 'expui.ini' )->variable( 'ExpUI', 'Strings' );
        $this->assertNotEmpty( $wanted );
        foreach ( array( 'eng-US', 'ger-DE', 'untranslated' ) as $locale )
        {
            $file = $this->path( 'translations/' . $locale . '/translation.ts' );
            $xml = simplexml_load_file( $file );
            $this->assertNotFalse( $xml, $locale );
            $sources = array();
            foreach ( $xml->context as $context )
            {
                if ( (string)$context->name === 'extension/expui' )
                {
                    foreach ( $context->message as $message )
                    {
                        $sources[(string)$message->source] = (string)$message->translation;
                    }
                }
            }
            foreach ( $wanted as $text )
            {
                $this->assertArrayHasKey( $text, $sources, $locale . ': ' . $text );
                if ( $locale !== 'untranslated' )
                {
                    $this->assertNotSame( '', $sources[$text], $locale . ' translates ' . $text );
                }
            }
        }
    }

    public function testVersionsAgree()
    {
        $info = expuiInfo::info();
        $xml = simplexml_load_file( $this->path( 'extension.xml' ) );
        $this->assertSame( expUIServerFunctions::VERSION, $info['Version'] );
        $this->assertSame( expUIServerFunctions::VERSION, (string)$xml->metadata->version );
        $this->assertStringContainsString( "Exp.version = '" . expUIServerFunctions::VERSION . "'", (string)file_get_contents( $this->path( 'design/standard/javascript/exp/core.js' ) ) );
    }
}
