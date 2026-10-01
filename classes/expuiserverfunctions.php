<?php
/**
 * @package expUI
 * @author  7x <info@se7enx.com>
 * @date    01 Oct 2026
 *
 * The exp:: packer keys of ezjscore ([ezjscServer_exp] in ezjscore.ini), used like ezjsc::jquery:
 *
 *   {ezscript_require( array( 'exp::core', 'exp::io' ) )}
 *
 * exp::core   jQuery 4 (and jQuery Migrate 4 while [ExpUI] Migrate=enabled), then the Exp core
 * exp::core::shared
 *             the same, but without jQuery and Migrate when ezjsc::jquery already loads this jQuery 4 earlier in
 *             the same list (expui activated before ezjscore): the core then uses the page's jQuery
 * exp::io     Exp.io, the server calls (needs exp::core first)
 * exp::compat $.ez() on the page's jQuery as a wrapper over Exp.io.call() (needs exp::io)
 * exp::collapse  Exp.collapse(), $.fn.expCollapse: collapsible menus (needs exp::core)
 * exp::sticky    Exp.sticky, $.fn.expSticky: the toolbar that stays in view (needs exp::core)
 *
 * The packed files carry nothing that differs between siteaccesses or users: the packer caches them by file and
 * address. Per-page values (the siteaccess's locale, translations, preferences) are written into the page by the
 * exp_config() template operator (expUITemplateOperators) and read by the core.
 *
 * No state is kept in statics, so a persistent worker can serve every siteaccess.
 */

class expUIServerFunctions
{
    const VERSION = '1.0.0.0';

    /** The ezjscore call view's separator between calls in one request. */
    const CALL_SEPARATOR = '@SEPARATOR$';

    /**
     * The packer's question: -1 for the functions that add files to the pack (they must run at once, while the
     * pack is put together, as ezjsc::yui3 and ezjsc::jquery do); the file's time for those that return code
     * (their output is cached in the pack, in order).
     *
     * @param string $fn
     * @return int
     */
    public static function getCacheTime( $fn )
    {
        if ( in_array( $fn, array( 'core', 'io', 'compat', 'collapse', 'sticky' ), true ) )
        {
            return -1;
        }
        return (int)filemtime( __FILE__ );
    }

    /**
     * exp::core: jQuery 4, Migrate 4 when enabled, and the Exp core, in front of the rest of the pack.
     *
     * @param array $args
     * @param array $packerFiles ByRef: the files the packer still has to pack
     * @return string Empty: this function only adds files
     */
    public static function core( $args, &$packerFiles )
    {
        $shared = is_array( $args ) && in_array( 'shared', $args, true );
        $packerFiles = array_merge( self::coreFiles( null, $shared ), $packerFiles );
        return '';
    }

    /**
     * The files exp::core stands for, in order.
     *
     * @param eZINI|null $ini expui.ini (a test can pass its own)
     * @param bool $shared exp::core::shared: leave jQuery and Migrate out when ezjsc::jquery loads this same jQuery
     * @param eZINI|null $ezjscoreIni ezjscore.ini (a test can pass its own)
     * @return array
     */
    public static function coreFiles( $ini = null, $shared = false, $ezjscoreIni = null )
    {
        $ini = $ini instanceof eZINI ? $ini : eZINI::instance( 'expui.ini' );
        $fromCdn = $ini->variable( 'ExpUI', 'JQuery' ) === 'cdn';
        $scripts = $ini->variable( 'ExpUI', $fromCdn ? 'ExternalScripts' : 'LocalScripts' );
        $files = array( 'exp::before' );
        if ( !$shared || !self::pageHasThisJquery( $scripts['jquery'], $ezjscoreIni ) )
        {
            $files[] = $scripts['jquery'];
            if ( $ini->variable( 'ExpUI', 'Migrate' ) === 'enabled' )
            {
                $files[] = $scripts['migrate'];
            }
        }
        $files[] = 'exp::boot';
        $files[] = 'exp/core.js';
        return $files;
    }

    /**
     * Whether ezjsc::jquery loads the same jQuery release as the given file. Compared by file name
     * (jquery-4.0.0.min.js), so ezjscore's own copy counts as well as expui's (expui activated before ezjscore).
     * Local or CDN, as ezjscore's LoadFromCDN decides.
     *
     * @param string $jquery the jQuery file exp::core would load
     * @param eZINI|null $ezjscoreIni
     * @return bool
     */
    public static function pageHasThisJquery( $jquery, $ezjscoreIni = null )
    {
        $ezjscoreIni = $ezjscoreIni instanceof eZINI ? $ezjscoreIni : eZINI::instance( 'ezjscore.ini' );
        $group = $ezjscoreIni->variable( 'eZJSCore', 'LoadFromCDN' ) === 'enabled' ? 'ExternalScripts' : 'LocalScripts';
        $list = $ezjscoreIni->variable( 'eZJSCore', $group );
        if ( !isset( $list['jquery'] ) || !is_string( $list['jquery'] ) || $list['jquery'] === '' )
        {
            return false;
        }
        return basename( parse_url( $list['jquery'], PHP_URL_PATH ) ?: $list['jquery'] ) === basename( parse_url( $jquery, PHP_URL_PATH ) ?: $jquery );
    }

    /**
     * exp::collapse: Exp.collapse() and $.fn.expCollapse.
     */
    public static function collapse( $args, &$packerFiles )
    {
        $packerFiles = array_merge( array( 'exp/collapse.js' ), $packerFiles );
        return '';
    }

    /**
     * exp::sticky: Exp.sticky and $.fn.expSticky; wires the admin's edit forms when the page is ready.
     */
    public static function sticky( $args, &$packerFiles )
    {
        $packerFiles = array_merge( array( 'exp/sticky.js' ), $packerFiles );
        return '';
    }

    /**
     * exp::io: Exp.io.
     */
    public static function io( $args, &$packerFiles )
    {
        $packerFiles = array_merge( array( 'exp/io.js' ), $packerFiles );
        return '';
    }

    /**
     * exp::compat: $.ez() over Exp.io.call(), for code not ported yet.
     */
    public static function compat( $args, &$packerFiles )
    {
        $packerFiles = array_merge( array( 'exp/compat.js' ), $packerFiles );
        return '';
    }

    /**
     * Before jQuery 4 is loaded: remember the page's jQuery and $, if it has them.
     *
     * @return string JavaScript
     */
    public static function before( $args )
    {
        return "window.ExpPrevious = { jQuery: window.jQuery, dollar: window.\$ };\n";
    }

    /**
     * After jQuery 4 (and Migrate): keep it as Exp.$; give the page its own jQuery and $ back when it had
     * another one (jQuery.noConflict(true)), so existing code keeps the jQuery it was written for.
     *
     * @return string JavaScript
     */
    public static function boot( $args )
    {
        return <<<'JS'
(function (window) {
    'use strict';
    var jq = window.jQuery, previous = window.ExpPrevious || {}, Exp = window.Exp = window.Exp || {};
    try { delete window.ExpPrevious; } catch (e) { window.ExpPrevious = undefined; }
    if (!jq || !jq.fn || String(jq.fn.jquery).split('.')[0] !== '4') {
        if (window.console) { window.console.error('Exp: jQuery 4 was expected, found ' + (jq && jq.fn ? jq.fn.jquery : 'none')); }
        return;
    }
    var other = previous.jQuery && previous.jQuery !== jq ? previous.jQuery : null;
    if (other && other.fn && String(other.fn.jquery).split('.')[0] === '4') {
        // the page has jQuery 4 already (ezjsc::jquery): use that one, so there is one jQuery and its plugins
        // are shared; the copy just loaded gives the page its jQuery and $ back and is dropped
        jq.noConflict(true);
        Exp.$ = other;
        Exp.jQueryShared = true;
        return;
    }
    Exp.$ = jq;
    // shared: jQuery 4 is the page's jQuery as well (no other jQuery was there before it)
    Exp.jQueryShared = !other;
    if (other) { jq.noConflict(true); }
}(window));

JS;
    }

    /**
     * What exp_config() writes into the page: the addresses, the siteaccess, its locale, the translated strings of
     * [ExpUI] Strings and the values of the preferences asked for.
     *
     * @param array $preferences Preference names whose values the page needs (Exp.prefs.get())
     * @param array $strings More texts to translate (extension/expui context) on top of [ExpUI] Strings
     * @return array config, strings, prefs
     */
    public static function config( array $preferences = array(), array $strings = array() )
    {
        $root = eZSys::indexDir() . '/';
        $siteaccess = eZSiteAccess::current();
        $locale = eZLocale::instance();
        $ini = eZINI::instance( 'expui.ini' );

        $texts = array();
        $wanted = $ini->hasVariable( 'ExpUI', 'Strings' ) ? (array)$ini->variable( 'ExpUI', 'Strings' ) : array();
        foreach ( array_unique( array_merge( $wanted, $strings ) ) as $text )
        {
            if ( is_string( $text ) && $text !== '' )
            {
                $texts[$text] = ezpI18n::tr( 'extension/expui', $text );
            }
        }

        $values = array();
        foreach ( $preferences as $name )
        {
            if ( is_string( $name ) && preg_match( '/^[A-Za-z0-9_.\-]{1,64}$/', $name ) )
            {
                $value = eZPreferences::value( $name );
                $values[$name] = $value === false ? null : (string)$value;
            }
        }

        return array(
            'config' => array(
                'version'      => self::VERSION,
                'root'         => $root,
                'www'          => eZSys::wwwDir() . '/',
                'siteaccess'   => is_array( $siteaccess ) && isset( $siteaccess['name'] ) ? (string)$siteaccess['name'] : '',
                'call'         => $root . 'ezjscore/call/',
                'prefsUrl'     => $root . 'user/preferences',
                'tokenElement' => 'ezxform_token_js',
                'separator'    => self::CALL_SEPARATOR,
                'locale'       => array(
                    'code'     => $locale->localeCode(),
                    'http'     => $locale->httpLocaleCode(),
                    'firstDay' => $locale->isMondayFirst() ? 1 : 0,
                ),
            ),
            'strings' => $texts,
            'prefs'   => $values,
        );
    }

    /**
     * config() as the <script type="application/json" id="exp-config"> block the core reads. Escaped so nothing in
     * a value can end the script element.
     *
     * @return string HTML
     */
    public static function configScript( array $preferences = array(), array $strings = array() )
    {
        $json = json_encode( self::config( $preferences, $strings ),
                             JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
        return '<script type="application/json" id="exp-config">' . $json . '</script>';
    }
}
