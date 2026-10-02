<?php
/**
 * The code of extension/expui/modules/expui/test.php, moved into a class (#207 stage 1). The file extension/expui/modules/expui/test.php is one call to it.
 * Guide: doc/bc/6.0/cli_cronjob_view_abstractions.md
 */
/*
 * The original header of extension/expui/modules/expui/test.php:
 *
 *
 * @package expUI
 * @author  7x <info@se7enx.com>
 * @date    01 Oct 2026
 *
 * expui/test: the Exp API's unit tests, run in the browser on a real admin page (the admin's own jQuery 3 next to
 * jQuery 4). expui/test/echo answers a POST with the fields it got, as JSON, for the Exp.io.form() tests.
 * No function or class is declared here, so the view can run many times in one PHP process.
 *
 */

namespace Exponential\View\Extension\Expui\Expui
{

class Test extends \Exponential\Runnable\ModuleView
{
    public function run( array $scope )
    {
        // the including function's variables ($Params, $Module, $cli, ...)
        foreach ( array_keys( $scope ) as $__name )
            if ( $__name !== 'this' && $__name !== 'scope' )
                ${$__name} = &$scope[$__name];
        unset( $__name );

        $http = \eZHTTPTool::instance();

        if ( isset( $Params['Action'] ) && $Params['Action'] === 'echo' )
        {
            $fields = array();
            foreach ( $_POST as $name => $value )
            {
                if ( $name !== 'ezxform_token' )
                {
                    $fields[$name] = is_array( $value ) ? $value : (string)$value;
                }
            }
            $files = array();
            foreach ( $_FILES as $name => $file )
            {
                $files[$name] = array( 'name' => (string)$file['name'], 'size' => (int)$file['size'] );
            }
            while ( @ob_end_clean() );
            header( 'Content-Type: application/json; charset=utf-8' );
            echo json_encode( array( 'method' => $_SERVER['REQUEST_METHOD'], 'fields' => $fields, 'files' => $files,
                                     'token' => $http->hasPostVariable( 'ezxform_token' ) ) );
            \eZExecution::cleanExit();
        }

        $tpl = \eZTemplate::factory();
        $tpl->setVariable( 'expected_siteaccess', is_array( \eZSiteAccess::current() ) ? \eZSiteAccess::current()['name'] : '' );
        $tpl->setVariable( 'expected_root', \eZSys::indexDir() . '/' );
        $tpl->setVariable( 'test_pref', (string)\eZPreferences::value( 'exp_test_pref' ) );

        $Result = array();
        $Result['content'] = $tpl->fetch( 'design:expui/test.tpl' );
        $Result['path'] = array( array( 'text' => 'Exponential UI', 'url' => false ), array( 'text' => 'Tests', 'url' => false ) );

        return $this->viewResult( isset( $Result ) ? $Result : null, null );
    }
}

}
