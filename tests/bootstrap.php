<?php
/**
 * PHPUnit bootstrap for the expui unit tests.
 *
 * Loads the Exponential kernel classes of the root named by EXPONENTIAL_ROOT (default: the installation this
 * checkout is installed in, two levels up) and this checkout's own classes ahead of any installed copy. Nothing is
 * booted: no database, no siteaccess, no session. Settings come from the root's settings/ and this checkout's
 * settings/ only, never from settings/override or a siteaccess; the INI cache and the log files are off.
 */

$checkout = dirname( __DIR__ );
$root = getenv( 'EXPONENTIAL_ROOT' );
if ( !is_string( $root ) || $root === '' )
{
    $root = dirname( $checkout, 2 );
}
$root = rtrim( $root, '/' );
if ( !is_file( $root . '/autoload.php' ) )
{
    fwrite( STDERR, "expui tests: no Exponential root at '$root'. Set EXPONENTIAL_ROOT.\n" );
    exit( 1 );
}
define( 'EXPUI_TEST_CHECKOUT', $checkout );

$ownClasses = array( 'expuiinfo' => $checkout . '/ezinfo.php' );
foreach ( glob( $checkout . '/classes/*.php' ) as $file )
{
    if ( preg_match_all( '/^\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/m', (string)file_get_contents( $file ), $m ) )
    {
        foreach ( $m[1] as $class )
        {
            $ownClasses[strtolower( $class )] = $file;
        }
    }
}
spl_autoload_register( static function ( $class ) use ( $ownClasses )
{
    $key = strtolower( $class );
    if ( isset( $ownClasses[$key] ) )
    {
        require_once $ownClasses[$key];
    }
}, true, true );

chdir( $root );
require_once $root . '/autoload.php';

$GLOBALS['eZDebugLogFileEnabled'] = false;
$GLOBALS['eZDebugAlwaysLog'] = array( eZDebug::LEVEL_NOTICE => false, eZDebug::LEVEL_WARNING => false, eZDebug::LEVEL_ERROR => false,
                                      eZDebug::LEVEL_DEBUG => false, eZDebug::LEVEL_STRICT => false );

eZINI::setIsCacheEnabled( false );
eZINI::instance()->setOverrideDirs( array(
    'sa-extension' => array(),
    'siteaccess' => array(),
    'extension' => array( 'expui' => array( $checkout . '/settings', true ) ),
    'override' => array(),
) );
eZINI::resetAllInstances( false );
