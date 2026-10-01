/*!
 * Exponential UI (expui) collapse — a menu or panel that collapses and expands, remembered per user.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::collapse after exp::core. Replaces YUI 3's ezcollapsiblemenu (Y.eZ.CollapsibleMenu) with the same
 * configuration, so a template moves over by changing one line:
 *
 *   Exp.collapse({
 *       link: '#rightmenu-showhide',             the element that collapses and expands
 *       collapsed: 0,                            the state the page was made in (0 or 1, "0" or "1")
 *       content: ['Hide', 'Show'] | false,       the link's HTML when expanded / collapsed; false: left alone
 *       elements: [{ selector: '#rightmenu', duration: 0.4,          duration in seconds
 *                    fullStyle: { width: '201px' }, collapsedStyle: { width: '18px' } }],
 *       pref: { name: 'admin_right_menu_show', values: [1, 0] },   saved after each change: values[collapsed]
 *       callback: function () {},                after each change; this: the instance
 *       beforecollapse, aftercollapse, beforeuncollapse, afteruncollapse: function () {}
 *   });
 *
 * A style value may be a function, called at the moment of the change. Sizes (px, em, rem, %, or plain numbers)
 * are animated; other values (no-repeat, unset) are set at once. With reduced motion everything is set at once.
 * The link gets aria-expanded. $(link).expCollapse(conf) does the same with conf.link = this element.
 */
(function (window) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var SIZE = /^-?\d*\.?\d+(px|em|rem|%)?$/;

    function resolve(value) { return typeof value === 'function' ? value() : value; }

    /** Splits a style map into what can be animated and what is set at once. */
    function split(styles) {
        var animate = {}, set = {}, any = false;
        Object.keys(styles || {}).forEach(function (name) {
            var v = resolve(styles[name]);
            if (typeof v === 'number' || SIZE.test(String(v))) { animate[name] = v; any = true; } else { set[name] = v; }
        });
        return { animate: animate, set: set, any: any };
    }

    function Collapse(conf) {
        var self = this;
        this.conf = $.extend({ content: false, elements: [] }, conf);
        this.conf.collapsed = Number(this.conf.collapsed) ? 1 : 0;
        this.$link = $(this.conf.link);
        this.$link.attr('aria-expanded', this.conf.collapsed ? 'false' : 'true');
        this.$link.on('click.expcollapse', function (e) {
            e.preventDefault();
            self.toggle();
        });
        this.$link.data('expCollapse', this);
    }

    Collapse.prototype.run = function (type, done) {
        var key = type === 'collapse' ? 'collapsedStyle' : 'fullStyle', called = false;
        var finish = function () { if (!called) { called = true; if (done) { done.call(this); } } }.bind(this);
        this.conf.elements.forEach(function (el, i) {
            var $el = $(el.selector);
            if (!$el.length) { if (i === 0) { finish(); } return; }
            var s = split(el[key]);
            $el.css(s.set);
            var ms = Exp.reducedMotion ? 0 : Math.round((el.duration || 0) * 1000);
            if (!s.any || ms === 0) {
                $el.stop(true, true).css(s.animate);
                if (i === 0) { finish(); }
            } else {
                $el.stop(true, true).animate(s.animate, { duration: ms, complete: i === 0 ? finish : undefined });
            }
        });
        if (!this.conf.elements.length) { finish(); }
    };

    Collapse.prototype.change = function (collapsed) {
        var c = this.conf, type = collapsed ? 'collapse' : 'uncollapse';
        if (c['before' + type]) { c['before' + type].call(this); }
        this.run(collapsed ? 'collapse' : 'uncollapse', c['after' + type]);
        c.collapsed = collapsed ? 1 : 0;
        this.$link.attr('aria-expanded', collapsed ? 'false' : 'true');
        if (Array.isArray(c.content)) { this.$link.html(c.content[c.collapsed]); }
        if (c.pref && c.pref.name) {
            var values = c.pref.values || [0, 1];
            Exp.prefs.set(c.pref.name, values[c.collapsed]).catch(function (e) {
                if (window.console) { window.console.error('Exp.collapse: the state was not saved', e); }
            });
        }
        if (c.callback) { c.callback.call(this); }
        Exp.emit('exp:collapse', { link: this.$link[0], collapsed: c.collapsed });
        return this;
    };

    Collapse.prototype.collapse = function () { return this.change(true); };
    Collapse.prototype.uncollapse = function () { return this.change(false); };
    Collapse.prototype.expand = Collapse.prototype.uncollapse;
    Collapse.prototype.toggle = function () { return this.change(!this.conf.collapsed); };

    Exp.collapse = function (conf) { return new Collapse(conf); };
    Exp.collapse.Collapse = Collapse;

    $.fn.expCollapse = function (conf) {
        return this.each(function () { Exp.collapse($.extend({}, conf, { link: this })); });
    };
}(window));
