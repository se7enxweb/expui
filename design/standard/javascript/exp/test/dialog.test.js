/*!
 * Exponential UI (expui) — browser tests of exp::dialog (Exp.dialog.open, confirm, alert, form, create, data-exp-dialog).
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
    function top() { var d = document.querySelectorAll('dialog.exp-dialog[open]'); return d[d.length - 1] || null; }
    function key(el, name, shift) {
        var e = new KeyboardEvent('keydown', { key: name, shiftKey: !!shift, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
    }
    function escape(el) { var e = new Event('cancel', { cancelable: true }); el.dispatchEvent(e); return e; }

    test('dialog: open shows a native modal with the title, labelled by it, the focus inside', function (t) {
        sandbox('<button type="button" id="d-opener">open</button>');
        $('#d-opener')[0].focus();
        var p = Exp.dialog.open({ title: 'Hello', content: '<p>Body <input id="d-field" type="text"></p>', buttons: [{ label: 'Go', value: 'go', primary: true }] });
        var d = top();
        t.ok(d && d.matches(':modal'), 'open as a modal (the page behind is inert)');
        t.equal(document.getElementById(d.getAttribute('aria-labelledby')).textContent, 'Hello', 'aria-labelledby names the title');
        t.equal(document.activeElement && document.activeElement.id, 'd-field', 'the first field of the body has the focus');
        t.ok(p.dialog && p.dialog.isOpen, 'the Promise carries the dialog');
        t.equal(Exp.dialog.current(), p.dialog, 'current()');
        $(d).find('.exp-dialog-button').trigger('click');
        return p.then(function (value) {
            t.equal(value, 'go', 'resolved with the button value');
            t.ok(!document.body.contains(d), 'removed from the page');
            t.equal(document.activeElement && document.activeElement.id, 'd-opener', 'the focus is back on the opener');
            t.equal(Exp.dialog.current(), null);
        });
    });

    test('dialog: Escape and the close button dismiss it with null; the close button is labelled "Close" in the page language', function (t) {
        var p1 = Exp.dialog.open({ title: 'A', content: 'x' });
        var d1 = top();
        var label = document.getElementById('exp-test-expected').getAttribute('data-close');
        t.equal($(d1).find('.exp-dialog-close').attr('aria-label'), label, 'translated');
        var e = escape(d1);
        t.ok(e.defaultPrevented, 'the native cancel is handled by the module');
        return p1.then(function (v1) {
            t.equal(v1, null, 'Escape: null');
            var p2 = Exp.dialog.open({ title: 'B', content: 'y' });
            $(top()).find('.exp-dialog-close').trigger('click');
            return p2;
        }).then(function (v2) { t.equal(v2, null, 'close button: null'); });
    });

    test('dialog: dismissible: false keeps it open on Escape and hides the close button', function (t) {
        var p = Exp.dialog.open({ title: 'Must', content: 'choose', dismissible: false, buttons: [{ label: 'OK', value: 1 }] });
        var d = top();
        escape(d);
        t.ok(d.open && p.dialog.isOpen, 'still open');
        t.ok($(d).find('.exp-dialog-close').prop('hidden'), 'no close button');
        p.dialog.close(7);
        return p.then(function (v) { t.equal(v, 7, 'close(value) from code'); });
    });

    test('dialog: Tab and Shift+Tab stay inside', function (t) {
        var p = Exp.dialog.open({ title: 'Trap', content: '<input id="d-a"><input id="d-b">', buttons: [{ label: 'Last', value: 1 }] });
        var d = top(), last = $(d).find('.exp-dialog-button')[0];
        last.focus();
        t.ok(key(d, 'Tab').defaultPrevented, 'Tab on the last is handled');
        t.equal(document.activeElement, $(d).find('.exp-dialog-close')[0], 'Tab from the last goes to the first (the close button)');
        key(d, 'Tab', true);
        t.equal(document.activeElement, last, 'Shift+Tab from the first goes to the last');
        $('#d-a')[0].focus();
        t.ok(!key(d, 'Tab').defaultPrevented, 'Tab in the middle is left to the browser');
        p.dialog.close();
        return p;
    });

    test('dialog: the backdrop closes it only with closeOnBackdrop', function (t) {
        var p1 = Exp.dialog.open({ title: 'X', content: 'x' });
        var d1 = top();
        $(d1).trigger('click');                      // a click on <dialog> itself is a click on the backdrop
        t.ok(p1.dialog.isOpen, 'not by default');
        $(d1).find('.exp-dialog-body').trigger('click');
        t.ok(p1.dialog.isOpen, 'a click inside never');
        p1.dialog.close();
        var p2 = Exp.dialog.open({ title: 'Y', content: 'y', closeOnBackdrop: true });
        $(top()).trigger('click');
        return p2.then(function (v) { t.equal(v, null, 'closed by the backdrop'); });
    });

    test('dialog: size, width, className; data-exp-dialog-close and closeSelector inside close it', function (t) {
        var p = Exp.dialog.open({ title: 'S', size: 'l', className: 'my-dialog', content: '<a href="#" data-exp-dialog-close="yes">yes</a>' });
        var d = top();
        t.ok(d.classList.contains('exp-dialog--l') && d.classList.contains('my-dialog'), 'classes');
        $(d).find('[data-exp-dialog-close]').trigger('click');
        return p.then(function (v) {
            t.equal(v, 'yes', 'the attribute value');
            var p2 = Exp.dialog.open({ title: 'W', width: 650, content: '<a href="#" class="window-cancel">close</a>', closeSelector: '.window-cancel' });
            t.ok(/650px/.test(top().style.width), 'width in pixels');
            $(top()).find('.window-cancel').trigger('click');
            return p2;
        }).then(function (v2) { t.equal(v2, null, 'closeSelector dismisses'); });
    });

    test('dialog: confirm resolves true or false; danger focuses Cancel; alertdialog described by the text', function (t) {
        var p = Exp.dialog.confirm('Remove it?', { okLabel: 'Remove', cancelLabel: 'Keep', danger: true });
        var d = top();
        t.equal(d.getAttribute('role'), 'alertdialog');
        t.equal(document.getElementById(d.getAttribute('aria-describedby')).textContent, 'Remove it?', 'described by the text');
        t.equal(document.getElementById(d.getAttribute('aria-labelledby')).textContent, 'Remove it?', 'without a title, named by the text');
        t.equal(document.activeElement.textContent, 'Keep', 'danger: the focus on Cancel');
        t.ok($(d).find('.is-danger').text() === 'Remove', 'the OK button is marked dangerous');
        $(d).find('button[name="ok"]').trigger('click');
        return p.then(function (ok) {
            t.equal(ok, true, 'OK: true');
            var p2 = Exp.dialog.confirm('Sure?');
            t.equal(document.activeElement.textContent, Exp.i18n('OK'), 'otherwise the focus on OK');
            $(top()).find('button[name="cancel"]').trigger('click');
            return p2;
        }).then(function (no) {
            t.equal(no, false, 'Cancel: false');
            var p3 = Exp.dialog.confirm('Esc?');
            escape(top());
            return p3;
        }).then(function (esc) { t.equal(esc, false, 'Escape: false'); });
    });

    test('dialog: alert has one button and resolves undefined; the text is text, not HTML', function (t) {
        var p = Exp.dialog.alert('<b>Saved</b>', { title: 'Note' });
        var d = top();
        t.equal($(d).find('.exp-dialog-button').length, 1);
        t.equal($(d).find('.exp-dialog-text').text(), '<b>Saved</b>', 'shown as text');
        t.equal($(d).find('b').length, 0, 'no element made from it');
        t.equal(document.getElementById(d.getAttribute('aria-labelledby')).textContent, 'Note', 'named by its title');
        $(d).find('.exp-dialog-button').trigger('click');
        return p.then(function (v) { t.equal(v, undefined); });
    });

    test('dialog: url loads the content (busy meanwhile); a failed load shows the error', function (t) {
        var p = Exp.dialog.open({ title: 'Load', url: Exp.io.url('expui/test/echo') });
        var d = top();
        t.equal(d.getAttribute('aria-busy'), 'true', 'busy while loading');
        return wait(50).then(function () {
            return new Promise(function (resolve) {
                (function check(n) { if (d.getAttribute('aria-busy') !== 'true' || n > 100) { resolve(); } else { window.setTimeout(function () { check(n + 1); }, 50); } }(0));
            });
        }).then(function () {
            t.ok(/"method":"GET"/.test($(d).find('.exp-dialog-body').text()), 'the answer is in the body');
            p.dialog.close();
            var p2 = Exp.dialog.open({ title: 'Missing', url: Exp.io.url('expui/no-such-view-' + Date.now()) });
            var d2 = top();
            return wait(50).then(function () {
                return new Promise(function (resolve) {
                    (function check(n) { if (d2.getAttribute('aria-busy') !== 'true' || n > 100) { resolve(); } else { window.setTimeout(function () { check(n + 1); }, 50); } }(0));
                });
            }).then(function () {
                var err = $(d2).find('.exp-dialog-error');
                t.ok(!err.prop('hidden') && err.text().length > 0, 'the error is shown: ' + err.text());
                p2.dialog.close();
                return p2;
            });
        });
    });

    test('dialog: form posts with Exp.io.form and resolves with the answer; onResponse false keeps it open', function (t) {
        var html = '<form method="post" action="' + Exp.io.url('expui/test/echo') + '"><input name="Name" value="Ada"><button type="submit" name="SaveButton" value="1">Save</button></form>';
        var calls = 0;
        var p = Exp.dialog.form(null, { title: 'Form', content: html, onResponse: function (answer) { calls++; return calls > 1; } });
        var d = top();
        var form = $(d).find('form')[0], button = $(d).find('button[name="SaveButton"]')[0];
        form.requestSubmit(button);
        return new Promise(function (resolve) {
            (function check(n) { if (calls >= 1 || n > 100) { resolve(); } else { window.setTimeout(function () { check(n + 1); }, 50); } }(0));
        }).then(function () {
            t.ok(p.dialog.isOpen, 'still open after the first answer (onResponse returned false)');
            form.requestSubmit(button);
            return p;
        }).then(function (answer) {
            t.equal(answer.fields.Name, 'Ada', 'the field was posted');
            t.equal(answer.fields.SaveButton, '1', 'with the button that submitted it');
            t.ok(answer.token, 'and the form token');
            t.ok(!document.body.contains(d), 'closed');
        });
    });

    test('dialog: template content, button actions, events, create()', function (t) {
        sandbox('<template id="d-tpl"><p class="from-tpl">From the template</p></template>');
        var seen = [];
        var on = function (e, data) { seen.push(e.type + ':' + (data.value === undefined ? '' : data.value)); };
        Exp.on('exp:dialog:open', on); Exp.on('exp:dialog:close', on);
        var d = Exp.dialog.create({ title: 'T', template: '#d-tpl', buttons: [{ label: 'Stay', value: 's', action: function () { return false; } }, { label: 'Leave', value: 'l' }] });
        t.ok(!d.isOpen, 'created closed');
        var p = d.open();
        t.equal($(top()).find('.from-tpl').text(), 'From the template');
        $(top()).find('.exp-dialog-button').eq(0).trigger('click');
        t.ok(d.isOpen, 'an action returning false keeps it open');
        $(top()).find('.exp-dialog-button').eq(1).trigger('click');
        return p.then(function (v) {
            Exp.off('exp:dialog:open', on); Exp.off('exp:dialog:close', on);
            t.equal(v, 'l');
            t.deepEqual(seen, ['exp:dialog:open:', 'exp:dialog:close:l'], 'open and close events');
        });
    });

    test('dialog: scripts in HTML content are not run, unless scripts: true', function (t) {
        window.__expDialogScript = 0;
        var p1 = Exp.dialog.open({ title: 'S', content: '<p>x</p><script>window.__expDialogScript++;<\/script>' });
        var first = window.__expDialogScript;
        p1.dialog.close();
        var p2 = Exp.dialog.open({ title: 'S', scripts: true, content: '<p>x</p><script>window.__expDialogScript++;<\/script>' });
        var second = window.__expDialogScript;
        p2.dialog.close();                           // closed before the checks, so a failure leaves no dialog open
        t.equal(first, 0, 'not run by default');
        t.equal(second, 1, 'run with scripts: true');
        return Promise.all([p1, p2]);
    });

    test('dialog: a dialog opened from a dialog stacks on top; closeAll closes both', function (t) {
        var p1 = Exp.dialog.open({ title: 'One', content: 'a' });
        var p2 = Exp.dialog.confirm('Two?');
        t.equal(document.querySelectorAll('dialog.exp-dialog[open]').length, 2);
        t.equal(Exp.dialog.current(), p2.dialog, 'the newest is current');
        Exp.dialog.closeAll();
        return Promise.all([p1, p2]).then(function (v) {
            t.deepEqual(v, [null, false]);
            t.equal(document.querySelectorAll('dialog.exp-dialog').length, 0, 'none left');
        });
    });

    test('dialog: data-exp-dialog confirm asks first, then submits with the same button', function (t) {
        sandbox('<form id="d-form"><button type="submit" name="RemoveButton" value="1" data-exp-dialog=\'{"confirm": "Remove?", "danger": true}\'>Remove</button></form>');
        var submitted = [];
        $('#d-form').on('submit', function (e) { e.preventDefault(); submitted.push(e.originalEvent.submitter && e.originalEvent.submitter.name); });
        Exp.start(document.getElementById('exp-test-sandbox'));
        $('#d-form button')[0].click();
        t.equal(submitted.length, 0, 'not submitted before the answer');
        var d = top();
        t.ok(d && /Remove\?/.test(d.textContent), 'asked');
        $(d).find('button[name="ok"]').trigger('click');
        return wait(30).then(function () {
            t.deepEqual(submitted, ['RemoveButton'], 'submitted once, with the button');
            $('#d-form button')[0].click();
            $(top()).find('button[name="cancel"]').trigger('click');
            return wait(30);
        }).then(function () { t.equal(submitted.length, 1, 'Cancel: not submitted'); });
    });

    // the last: whatever a failed test above left open is closed, so the tests of other modules run on a free page
    test('dialog: no dialog is left open', function (t) {
        var open = document.querySelectorAll('dialog.exp-dialog[open]').length;
        Exp.dialog.closeAll();
        $('dialog.exp-dialog').remove();
        t.equal(open, 0, 'none was open');
    });
}(window, document));
