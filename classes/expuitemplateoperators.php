<?php
/**
 * @package expUI
 * @author  7x <info@se7enx.com>
 * @date    01 Oct 2026
 *
 * {exp_config()} writes the page's Exp configuration (<script type="application/json" id="exp-config">), once,
 * before the exp:: scripts:
 *
 *   {exp_config( hash( 'prefs', array( 'admin_left_menu_size' ), 'strings', array( 'Saved' ) ) )}
 *   {ezscript_require( array( 'exp::core', 'exp::io' ) )}
 *
 * prefs: preference names whose values Exp.prefs.get() needs; strings: more texts for Exp.i18n() (translated in the
 * extension/expui context) on top of expui.ini [ExpUI] Strings.
 */

class expUITemplateOperators
{
    public function operatorList()
    {
        return array( 'exp_config' );
    }

    public function namedParameterPerOperator()
    {
        return true;
    }

    public function namedParameterList()
    {
        return array( 'exp_config' => array( 'options' => array( 'type' => 'array', 'required' => false, 'default' => array() ) ) );
    }

    public function modify( $tpl, $operatorName, $operatorParameters, $rootNamespace, $currentNamespace, &$operatorValue, $namedParameters )
    {
        $options = is_array( $namedParameters['options'] ) ? $namedParameters['options'] : array();
        $prefs = isset( $options['prefs'] ) && is_array( $options['prefs'] ) ? array_values( $options['prefs'] ) : array();
        $strings = isset( $options['strings'] ) && is_array( $options['strings'] ) ? array_values( $options['strings'] ) : array();
        $operatorValue = expUIServerFunctions::configScript( $prefs, $strings );
    }
}
