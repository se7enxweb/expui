/*!
 * Exponential UI (expui) sticky — a toolbar that stays in view while the page scrolls, and a "back to top" link.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::sticky after exp::core. Replaces fixed_toolbar.js (YUI 3 event, node-screen, node-style,
 * selector-css3, transition) with the same behaviour, so the admin's styles and other extensions that read the
 * toolbar's state (ezautosave's preview) keep working:
 *
 *   $('#controlbar-top').expSticky({
 *       form: '#editform, #ClassEdit',     only on pages with this form
 *       start: '#columns',                 the toolbar is fixed once this element's top scrolls under it
 *       className: 'controlbar-fixed',     the class the toolbar gets while fixed
 *       toTop: '.scroll-to-top',           faded in once the page is scrolled past the start, out above it
 *       scrollToStart: true,               on load, scroll to the start and focus the form's first text field
 *       toTopOpacity: 0.6, fade: 500       the link's opacity and its fade in ms (0 with reduced motion)
 *   });
 *
 * Exp.sticky.admin() wires the admin's edit forms with exactly those defaults; exp::sticky runs it when the page is
 * ready, and fixed_toolbar.js stands aside when it finds it (window.Exp.sticky).
 */
(function (window) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var DEFAULTS = {
        form: '#editform, #ClassEdit', start: '#columns', className: 'controlbar-fixed', toTop: '.scroll-to-top',
        scrollToStart: true, toTopOpacity: 0.6, fade: 500
    };

    function px(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

    function Sticky($toolbar, opts) {
        var o = this.opts = $.extend({}, DEFAULTS, opts);
        var $form = $(o.form).first(), $start = $(o.start).first(), $toTop = $(o.toTop).first();
        this.active = false;
        if (!$toolbar.length || !$form.length || !$start.length) { return; }
        this.active = true;
        var fade = Exp.reducedMotion ? 0 : o.fade;
        var toolbarHeight = px($toolbar.css('height')) + px($toolbar.css('top'));
        var formY = this.formY = px($start.offset().top) - toolbarHeight;
        var fixed = true, shown = false;

        function show() {
            if (shown || !$toTop.length) { return; }
            shown = true;
            $toTop.stop(true).css('display', '').animate({ opacity: o.toTopOpacity }, fade);
        }
        function hide() {
            if (!$toTop.length) { return; }
            shown = false;
            $toTop.stop(true).animate({ opacity: 0 }, fade, function () { if (!shown) { $toTop.css('display', 'none'); } });
        }

        // the same order of tests as fixed_toolbar.js, so the toolbar behaves exactly as before
        function onScroll() {
            var y = window.scrollY || window.pageYOffset || 0;
            if (!fixed && y > formY) {
                $toolbar.addClass(o.className);
                fixed = true;
            } else if (y > formY + 20 && $toTop.length) {
                show();
            } else if (fixed && y < formY) {
                $toolbar.removeClass(o.className);
                fixed = false;
                hide();
            }
        }
        this.onScroll = onScroll;

        if ($toTop.length) {
            $toTop.css('opacity', 0);
            $toTop.on('click.expsticky', function () { hide(); });
        }
        $(window).on('scroll.expsticky', onScroll);
        if (o.scrollToStart && (window.scrollY || window.pageYOffset || 0) < formY) {
            window.scrollTo(0, formY + 1);
            $form.find('input[type=text]:enabled').first().trigger('focus');
        }
        onScroll();
        $toolbar.data('expSticky', this);
    }

    Exp.sticky = {
        /** Starts it on a toolbar with options; returns the instance (active: false when the page has no form). */
        start: function (toolbar, opts) { return new Sticky($(toolbar).first(), opts); },
        /** The admin's edit forms: #controlbar-top over #editform or #ClassEdit, as fixed_toolbar.js did. */
        admin: function () { return Exp.sticky.start('#controlbar-top'); }
    };

    $.fn.expSticky = function (opts) {
        return this.each(function () { Exp.sticky.start(this, opts); });
    };

    Exp.ready(function () { Exp.sticky.admin(); });
}(window));
