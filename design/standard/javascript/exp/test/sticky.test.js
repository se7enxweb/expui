/*!
 * Exponential UI (expui) — browser tests of exp::sticky (Exp.sticky, $.fn.expSticky).
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test, $ = Exp.$;

    function sandbox(html) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = html;
        return host;
    }
    function wait(ms) { return new Promise(function (r) { window.setTimeout(r, ms); }); }

    test('sticky: does nothing on a page without its form', function (t) {
        sandbox('<div id="s-bar"></div>');
        var s = Exp.sticky.start('#s-bar', { form: '#s-no-such-form', start: '#s-bar' });
        t.equal(s.active, false);
        t.equal(Exp.sticky.admin().active, false, 'the test page has no edit form');
    });

    test('sticky: fixes the toolbar below its start and unfixes it above, as fixed_toolbar.js did', function (t) {
        sandbox('<div style="height: 1200px"></div><div id="s-bar" style="height: 40px"></div>'
            + '<form id="s-form"><input type="text" id="s-field"></form><div id="s-start"></div>'
            + '<div style="height: 3000px"></div><a href="#" id="s-top">top</a>');
        window.scrollTo(0, 0);
        var s = Exp.sticky.start('#s-bar', { form: '#s-form', start: '#s-start', toTop: '#s-top', scrollToStart: false, className: 's-fixed', fade: 0 });
        t.equal(s.active, true);
        t.ok(s.formY > 1000, 'the start is far down the page');
        s.onScroll();
        t.equal($('#s-bar').hasClass('s-fixed'), false, 'above the start: not fixed');
        window.scrollTo(0, s.formY + 100);
        s.onScroll();
        t.equal($('#s-bar').hasClass('s-fixed'), true, 'below the start: fixed');
        s.onScroll();
        return wait(30).then(function () {
            t.equal(parseFloat($('#s-top').css('opacity')), 0.6, '"go to the top" shown');
            window.scrollTo(0, 0);
            s.onScroll();
            t.equal($('#s-bar').hasClass('s-fixed'), false, 'unfixed again');
            $(window).off('scroll.expsticky');
        });
    });

    test('sticky: scrolls to the start and focuses the first text field (scrollToStart)', function (t) {
        sandbox('<div style="height: 900px"></div><div id="s-bar" style="height: 30px"></div>'
            + '<form id="s-form"><input type="text" id="s-field"></form><div id="s-start"></div><div style="height: 2000px"></div>');
        window.scrollTo(0, 0);
        var s = Exp.sticky.start('#s-bar', { form: '#s-form', start: '#s-start', toTop: '#s-none', fade: 0 });
        t.ok(Math.abs((window.scrollY || window.pageYOffset) - (s.formY + 1)) <= 1, 'scrolled to the start');
        t.equal(document.activeElement && document.activeElement.id, 's-field', 'first field focused');
        $(window).off('scroll.expsticky');
        window.scrollTo(0, 0);
    });

    test('sticky: $.fn.expSticky starts it on the element', function (t) {
        sandbox('<div id="s-bar"></div><form id="s-form"></form><div id="s-start"></div>');
        $('#s-bar').expSticky({ form: '#s-form', start: '#s-start', scrollToStart: false });
        t.ok($('#s-bar').data('expSticky') && $('#s-bar').data('expSticky').active);
        $(window).off('scroll.expsticky');
        window.scrollTo(0, 0);
    });
}(window, document));
