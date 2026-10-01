<?php
/**
 * @package expUI
 * @author  7x <info@se7enx.com>
 * @date    01 Oct 2026
 **/

$Module = array( 'name' => 'Exponential UI', 'functions' => array() );

$ViewList = array(
    // The Exp API's tests in the browser (the unit tests of every module), and an echo for Exp.io.form()
    'test' => array(
        'script'                  => 'test.php',
        'functions'               => array( 'test' ),
        'params'                  => array( 'Action' ),
        'default_navigation_part' => 'ezsetupnavigationpart',
    ),
);

$FunctionList = array(
    // The test page (administrators; it runs every module's tests and saves a test preference)
    'test' => array(),
);
