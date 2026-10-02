/*!
 * Exponential UI (expui) dialog — modal dialogs on the native <dialog> element.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::dialog after exp::core (Exp.dialog.form also needs exp::io). The admin dialogs:
 * simple dialogs and the modal window:
 *
 *   Exp.dialog.open({ title, content | url | template, buttons: [{ label, value, primary, danger }], size: 'm',
 *                     onClose })                                    -> Promise<value>   (dismissed: null)
 *   Exp.dialog.confirm(text, { okLabel, cancelLabel, danger })      -> Promise<boolean>
 *   Exp.dialog.alert(text)                                          -> Promise<undefined>
 *   Exp.dialog.form(url, { title })                                 -> Promise<the server's answer>  (dismissed: null)
 *   Exp.dialog.create(options)                                      -> a Dialog, opened with .open()
 *
 * The page behind is inert while a dialog is open (showModal), Tab and Shift+Tab stay inside it, Escape and the
 * close button dismiss it (unless dismissible: false), a click on the backdrop only with closeOnBackdrop: true, and
 * the focus goes back to where it was. aria-labelledby names the title (or the text, without a title).
 * Events, on the dialog element (bubbling) and page-wide (Exp.on): exp:dialog:open { dialog },
 * exp:dialog:close { dialog, value }. Started from markup with data-exp-dialog (see doc/modules/dialog.md).
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var SIZES = ['s', 'm', 'l', 'xl'];
    var FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
                    'textarea:not([disabled]), iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), ' +
                    'summary, [tabindex]:not([tabindex="-1"])';
    var counter = 0;
    var openDialogs = [];

    function t(text, params) { return Exp.i18n(text, params); }

    function visible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && window.getComputedStyle(el).visibility !== 'hidden';
    }

    /** The elements Tab reaches inside root, in order. */
    function focusables(root) {
        return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
            return el.tabIndex >= 0 && visible(el) && !el.closest('[inert]');
        });
    }

    /**
     * A dialog. Created closed; open() shows it as a modal and returns a Promise of the value it is closed with.
     * Options: see the header and doc/modules/dialog.md.
     */
    function Dialog(options) {
        var self = this;
        counter += 1;
        this.id = 'exp-dialog-' + counter;
        this.options = $.extend({
            title: '', content: null, url: null, template: null, buttons: [], size: 'm', width: null,
            className: '', dismissible: true, closeOnBackdrop: false, closeSelector: null, initialFocus: null,
            role: 'dialog', describedBy: null, keep: false, scripts: false, onOpen: null, onClose: null
        }, options || {});
        this.isOpen = false;
        this.value = null;
        this.returnFocus = null;
        this.promise = null;
        this.resolver = null;

        var o = this.options;
        var $el = this.$el = $('<dialog class="exp-dialog exp-scope"></dialog>')
            .attr({ id: this.id, 'aria-labelledby': this.id + '-title' })
            .addClass(SIZES.indexOf(o.size) !== -1 ? 'exp-dialog--' + o.size : 'exp-dialog--m');
        if (o.role === 'alertdialog') { $el.attr('role', 'alertdialog'); }
        if (o.className) { $el.addClass(o.className); }
        if (o.width) { $el.css('width', typeof o.width === 'number' ? 'min(' + o.width + 'px, calc(100vw - 2rem))' : o.width); }
        this.element = $el[0];

        var $frame = $('<div class="exp-dialog-frame"></div>').appendTo($el);
        this.$header = $('<header class="exp-dialog-header"></header>').appendTo($frame);
        this.$title = $('<h2 class="exp-dialog-title"></h2>').attr('id', this.id + '-title').appendTo(this.$header);
        this.$close = $('<button type="button" class="exp-dialog-close"><span aria-hidden="true">&times;</span></button>')
            .attr({ 'aria-label': t('Close'), title: t('Close') }).appendTo(this.$header);
        if (!o.dismissible) { this.$close.prop('hidden', true); }
        this.$body = this.body = $('<div class="exp-dialog-body"></div>').attr('id', this.id + '-body').appendTo($frame);
        this.$error = $('<div class="exp-dialog-error" role="alert" hidden></div>').insertBefore(this.$body);
        this.$footer = $('<footer class="exp-dialog-footer" hidden></footer>').appendTo($frame);

        this.setTitle(o.title);
        if (o.describedBy) { $el.attr('aria-describedby', o.describedBy); }
        this.setButtons(o.buttons);

        // native Escape: dismiss (the dialog closes itself only through close(), so the Promise is always settled)
        $el.on('cancel', function (e) {
            e.preventDefault();
            if (self.options.dismissible) { self.close(null); }
        });
        // closed by anything else (form method=dialog, the browser): settle as dismissed
        $el.on('close', function () {
            if (self.isOpen) { self.finish(self.element.returnValue && self.element.returnValue !== '' ? self.element.returnValue : null); }
        });
        // Tab and Shift+Tab stay inside
        $el.on('keydown', function (e) {
            if (e.key !== 'Tab') { return; }
            var list = focusables(self.element);
            if (!list.length) { e.preventDefault(); self.element.focus(); return; }
            var first = list[0], last = list[list.length - 1], active = document.activeElement;
            if (e.shiftKey && (active === first || !self.element.contains(active))) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && (active === last || !self.element.contains(active))) { e.preventDefault(); first.focus(); }
        });
        // the close button, [data-exp-dialog-close] and closeSelector inside; the backdrop (a click on <dialog> itself)
        $el.on('click', function (e) {
            if (e.target === self.element) {
                if (self.options.closeOnBackdrop && self.options.dismissible) { self.close(null); }
                return;
            }
            var closer = $(e.target).closest('.exp-dialog-close, [data-exp-dialog-close]' + (self.options.closeSelector ? ', ' + self.options.closeSelector : ''), self.element);
            if (closer.length && closer.closest('dialog')[0] === self.element) {
                e.preventDefault();
                var v = closer.attr('data-exp-dialog-close');
                self.close(v === undefined || v === '' ? null : v);
            }
        });

        // in the page from the start (a closed <dialog> is not shown), so content that runs scripts (scripts: true) runs them
        document.body.appendChild(this.element);
        if (o.content !== null && o.content !== undefined) { this.setContent(o.content); }
        else if (o.template) {
            // a <template> (its content cloned) or any element (its children cloned)
            var tpl = $(o.template)[0];
            if (tpl) { this.setContent(tpl.content ? document.importNode(tpl.content, true) : $(tpl).clone().contents()); }
        }
        $el.data('expDialog', this);
    }

    /** The title, as text. Without a title the header keeps only the close button, and the body names the dialog. */
    Dialog.prototype.setTitle = function (title) {
        this.$title.text(title === null || title === undefined ? '' : String(title));
        var has = this.$title.text() !== '';
        this.$title.prop('hidden', !has);
        this.$el.attr('aria-labelledby', has ? this.id + '-title' : (this.options.labelledBy || this.id + '-body'));
        return this;
    };

    /** The content: an HTML string (from the server or a template), an element, jQuery, a fragment, or a function returning one. */
    Dialog.prototype.setContent = function (content) {
        if (typeof content === 'function') { content = content.call(this, this); }
        this.$body.empty();
        if (content === null || content === undefined || content === '') { return this; }
        if (typeof content === 'string') {
            // HTML is inserted, its <script> elements are not run (no eval; options.scripts: true runs them, as jQuery's html())
            if (this.options.scripts) { this.$body.html(content); } else { this.$body[0].innerHTML = content; }
        } else { this.$body.append(content); }
        Exp.start(this.$body[0]);
        return this;
    };

    /** The footer buttons: [{ label, value, primary, danger, close (default true), action(dialog) -> false keeps it open }]. */
    Dialog.prototype.setButtons = function (buttons) {
        var self = this;
        this.$footer.empty();
        (buttons || []).forEach(function (b) {
            var $b = $('<button type="button" class="exp-dialog-button"></button>').text(b.label === undefined ? String(b.value) : b.label);
            if (b.primary) { $b.addClass('is-primary'); }
            if (b.danger) { $b.addClass('is-danger'); }
            if (b.name) { $b.attr('name', b.name); }
            $b.on('click', function (e) {
                e.preventDefault();
                var keep = typeof b.action === 'function' ? b.action.call(self, self, e) === false : false;
                if (!keep && b.close !== false) { self.close(b.value === undefined ? null : b.value); }
            });
            $b.data('expDialogButton', b);
            self.$footer.append($b);
        });
        this.$footer.prop('hidden', !this.$footer.children().length);
        return this;
    };

    /** Shows a translated error above the body (role alert); empty or no text hides it. */
    Dialog.prototype.error = function (text) {
        this.$error.text(text || '').prop('hidden', !text);
        return this;
    };

    /** While busy: aria-busy, the body dimmed and not clickable, "Loading..." for screen readers. */
    Dialog.prototype.busy = function (on) {
        this.$el.toggleClass('exp-dialog--busy', !!on).attr('aria-busy', on ? 'true' : 'false');
        if (on && !this.$el.find('.exp-dialog-spinner').length) {
            $('<div class="exp-dialog-spinner" role="status"></div>').append($('<span class="exp-visually-hidden"></span>').text(t('Loading...')))
                .insertBefore(this.$body);
        } else if (!on) {
            this.$el.find('.exp-dialog-spinner').remove();
        }
        return this;
    };

    /** Loads HTML into the body (GET, or opts.method/opts.data), busy meanwhile; a Promise of the HTML. */
    Dialog.prototype.load = function (url, opts) {
        var self = this;
        opts = opts || {};
        this.busy(true).error('');
        return new Promise(function (resolve, reject) {
            $.ajax({ url: url, method: (opts.method || 'GET').toUpperCase(), data: opts.data, dataType: 'html', headers: { Accept: 'text/html,*/*' } })
                .then(function (html) {
                    self.busy(false).setContent(html);
                    resolve(html);
                }, function (xhr) {
                    var status = xhr ? xhr.status : 0;
                    self.busy(false).error(status ? t('The server answered with an error (HTTP %status).', { '%status': status }) : t('No answer from the server.'));
                    reject(Exp.io && Exp.io.Error ? new Exp.io.Error(status ? 'server' : 'network', status, self.$error.text(), xhr) : new Error(self.$error.text()));
                });
        });
    };

    /** Where the focus goes on open: initialFocus, [autofocus], the first field of the body, the primary button, close. */
    Dialog.prototype.focusTarget = function () {
        var o = this.options, el = this.element;
        var pick = o.initialFocus ? $(o.initialFocus, el)[0] || $(o.initialFocus)[0] : null;
        if (pick && el.contains(pick)) { return pick; }
        var auto = el.querySelector('[autofocus]');
        if (auto) { return auto; }
        var inBody = focusables(this.$body[0]);
        if (inBody.length) { return inBody[0]; }
        var primary = this.$footer.find('.is-primary')[0] || this.$footer.find('button')[0];
        if (primary) { return primary; }
        return visible(this.$close[0]) ? this.$close[0] : el;
    };

    /** Shows it as a modal; a Promise of the value it is closed with (null when dismissed). */
    Dialog.prototype.open = function () {
        var self = this, o = this.options;
        if (this.isOpen) { return this.promise; }
        this.promise = new Promise(function (resolve) { self.resolver = resolve; });
        this.returnFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        if (!this.element.isConnected) { document.body.appendChild(this.element); }
        if (!this.element.hasAttribute('tabindex')) { this.element.setAttribute('tabindex', '-1'); }
        this.isOpen = true;
        this.value = null;
        this.element.returnValue = '';
        if (typeof this.element.showModal === 'function') { this.element.showModal(); } else { this.element.setAttribute('open', 'open'); }
        openDialogs.push(this);
        var loading = o.url ? this.load(o.url, { method: o.method, data: o.data }) : null;
        var focus = function () { if (self.isOpen) { var f = self.focusTarget(); if (f && f.focus) { f.focus(); } } };
        focus();
        if (loading) { loading.then(focus, focus); }
        if (typeof o.onOpen === 'function') { o.onOpen.call(this, this); }
        this.$el.trigger('exp:dialog:open', [{ dialog: this }]);
        Exp.emit('exp:dialog:open', { dialog: this });
        return this.promise;
    };

    /** Closes it with a value (null: dismissed): onClose, the event, the focus back, the Promise resolved. */
    Dialog.prototype.close = function (value) {
        if (!this.isOpen) { return this; }
        this.isOpen = false;
        if (this.element.open && typeof this.element.close === 'function') { this.element.close(); } else { this.element.removeAttribute('open'); }
        this.finish(value === undefined ? null : value, true);
        return this;
    };

    Dialog.prototype.finish = function (value, already) {
        if (!already) { this.isOpen = false; }
        if (this.settled === this.promise) { return; }
        this.settled = this.promise;
        this.value = value;
        var i = openDialogs.indexOf(this);
        if (i !== -1) { openDialogs.splice(i, 1); }
        if (typeof this.options.onClose === 'function') {
            try { this.options.onClose.call(this, value, this); } catch (e) { if (window.console) { window.console.error('Exp.dialog: onClose failed', e); } }
        }
        this.$el.trigger('exp:dialog:close', [{ dialog: this, value: value }]);
        Exp.emit('exp:dialog:close', { dialog: this, value: value });
        var back = this.returnFocus;
        if (back && document.contains(back) && typeof back.focus === 'function') { back.focus(); }
        if (!this.options.keep) { this.$el.remove(); }
        if (this.resolver) { this.resolver(value); }
    };

    /** Closes it and removes it from the page. */
    Dialog.prototype.destroy = function () {
        this.close(null);
        this.$el.remove();
    };

    // ---- the shortcuts ----------------------------------------------------------------------------------------

    function open(options) {
        var d = new Dialog(options);
        var p = d.open();
        p.dialog = d;
        return p;
    }

    /** A paragraph with the text (as text), the dialog's description and, without a title, its name. */
    function textBody(id, text) {
        return $('<p class="exp-dialog-text"></p>').attr('id', id).text(String(text === undefined || text === null ? '' : text));
    }

    function confirm(text, opts) {
        opts = opts || {};
        counter += 1;
        var textId = 'exp-dialog-text-' + counter;
        var cancel = { label: opts.cancelLabel || t('Cancel'), value: false, name: 'cancel' };
        var ok = { label: opts.okLabel || t('OK'), value: true, primary: true, danger: !!opts.danger, name: 'ok' };
        var d = new Dialog({
            title: opts.title || '', content: textBody(textId, text), buttons: [cancel, ok], size: opts.size || 's',
            role: 'alertdialog', describedBy: textId, labelledBy: textId, className: 'exp-dialog--confirm' + (opts.danger ? ' exp-dialog--danger' : ''),
            initialFocus: opts.danger ? 'button[name="cancel"]' : 'button[name="ok"]', onClose: opts.onClose
        });
        var p = d.open().then(function (v) { return v === true; });
        p.dialog = d;
        return p;
    }

    function alert(text, opts) {
        opts = opts || {};
        counter += 1;
        var textId = 'exp-dialog-text-' + counter;
        var d = new Dialog({
            title: opts.title || '', content: textBody(textId, text), buttons: [{ label: opts.okLabel || t('OK'), value: true, primary: true, name: 'ok' }],
            size: opts.size || 's', role: 'alertdialog', describedBy: textId, labelledBy: textId, className: 'exp-dialog--alert',
            initialFocus: 'button[name="ok"]', onClose: opts.onClose
        });
        var p = d.open().then(function () { return undefined; });
        p.dialog = d;
        return p;
    }

    /**
     * Loads a form (url, or opts.content) into a dialog and posts it with Exp.io.form when it is submitted; resolves
     * with the server's answer and closes. opts.onResponse(answer, dialog) returning false keeps it open (to show
     * the server's next form, say). Errors are shown in the dialog, which stays open. Dismissed: null.
     */
    function form(url, opts) {
        opts = opts || {};
        var d = new Dialog($.extend({}, opts, { url: url || null, content: opts.content === undefined ? null : opts.content,
                                                className: 'exp-dialog--form' + (opts.className ? ' ' + opts.className : '') }));
        d.$body.on('submit', 'form', function (e) {
            e.preventDefault();
            if (!Exp.io || !Exp.io.form) {
                d.error(t('The server answered with an error (HTTP %status).', { '%status': 0 }));
                if (window.console) { window.console.error('Exp.dialog.form needs exp::io'); }
                return;
            }
            var f = this, submitter = e.originalEvent && e.originalEvent.submitter ? e.originalEvent.submitter : null;
            d.busy(true).error('');
            Exp.io.form(f, { submitter: submitter, url: opts.action }).then(function (answer) {
                d.busy(false);
                if (typeof opts.onResponse === 'function' && opts.onResponse.call(d, answer, d) === false) { return; }
                d.close(answer);
            }, function (err) {
                d.busy(false).error(err && err.message ? err.message : t('No answer from the server.'));
            });
        });
        var p = d.open();
        p.dialog = d;
        return p;
    }

    /** The dialog on top, or null. */
    function current() { return openDialogs.length ? openDialogs[openDialogs.length - 1] : null; }

    function closeAll() { openDialogs.slice().reverse().forEach(function (d) { d.close(null); }); }

    Exp.dialog = {
        open: open, confirm: confirm, alert: alert, form: form,
        create: function (options) { return new Dialog(options); },
        current: current, closeAll: closeAll, Dialog: Dialog
    };

    // ---- from markup ------------------------------------------------------------------------------------------

    /**
     * data-exp-dialog on a link or button:
     *   '{"confirm": "Remove it?", "danger": true}'  asks first; OK follows the link or submits the button's form
     *   '{"title": "…", "form": true}'                opens the link's address as a form dialog
     *   '{"title": "…", "template": "#tpl"}'          opens the template's content
     *   (anything else)                                opens the link's address (or "url") in a dialog
     */
    Exp.register('dialog', function ($el, options) {
        $el.on('click.expdialog', function (e) {
            if ($el.data('expDialogConfirmed')) { $el.removeData('expDialogConfirmed'); return; }
            e.preventDefault();
            var el = this, href = options.url || $el.attr('href') || null;
            if (options.confirm) {
                confirm(options.confirm, options).then(function (ok) {
                    if (!ok) { return; }
                    if (el.form && (el.type === 'submit' || el.type === 'image')) {
                        if (typeof el.form.requestSubmit === 'function') {
                            el.form.requestSubmit(el);          // submits with this button, without a click
                        } else {
                            $el.data('expDialogConfirmed', true);   // the click below goes through once
                            el.click();
                        }
                    } else if (href) {
                        window.location.href = href;
                    }
                });
            } else if (options.form) {
                form(href, options);
            } else {
                open($.extend({}, options, { url: options.template ? null : href }));
            }
        });
    });
}(window, document));
