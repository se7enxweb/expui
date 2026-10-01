/*!
 * Exponential UI (expui) autosave — drafts saved while editing, and the draft's preview, without YUI.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::autosave after exp::core. Replaces YUI 3's ezautosubmit (Y.eZ.AutoSubmit) and ezcontentpreview
 * (Y.eZ.ContentPreview) of the ezautosave extension with the same configuration, events and markup, so its
 * templates move over by changing the constructors:
 *
 *   var as = new Exp.autosave.AutoSubmit({
 *       form: '#editform',              the form to save
 *       action: '/ezjscore/call/ezautosave::savedraft::…',   where to POST it (with its fields and files)
 *       interval: 300,                  seconds between two saves
 *       trackUserInput: true,           also save when a field loses the focus
 *       ignoreClass: 'no-autosave',     fields with this class do not count as a change
 *       enabled: function () { return true; },  asked when the page is ready
 *       beforeSerialize: function () {}  before each save reads the form; default: TinyMCE's triggerSave()
 *   });
 *   as.on('init' | 'beforesave' | 'success' | 'error' | 'abort' | 'nochange', function (e) { e.json … });
 *   as.start(); as.stop(); as.submit(extraFields);
 *   Exp.emit('autosubmit:forcesave')    saves now (the preview does this when it opens on unsaved changes)
 *
 *   var preview = new Exp.autosave.Preview({ texts: {loading, error, preview}, topPosition: '42px' });
 *   preview.init(); preview.loading(); preview.setContent(html); preview.error(text); preview.close();
 *
 * $(form).expAutosave(conf) and $(el).expPreview(conf) do the same with form / buttonPlace = that element.
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    // ---- the form's state, as ezautosubmit.js serialised it (fields with ignoreClass left out) -------------------

    function serializeForm(form, ignoreClass) {
        var data = [], enc = encodeURIComponent, searchClass = ' ' + ignoreClass + ' ', f = $(form)[0];
        if (!f) { return ''; }
        for (var i = 0; i < f.elements.length; i++) {
            var e = f.elements[i], n, v, o, j;
            if (ignoreClass && (' ' + e.className + ' ').indexOf(searchClass) > -1) { continue; }
            n = enc(e.name) + '=';
            v = enc(e.value);
            switch (e.type) {
                case 'select-one':
                    if (e.selectedIndex > -1) {
                        o = e.options[e.selectedIndex];
                        data.push(n + enc(o.attributes.value && o.attributes.value.specified ? o.value : o.text));
                    }
                    break;
                case 'select-multiple':
                    if (e.selectedIndex > -1) {
                        for (j = e.selectedIndex; j < e.options.length; ++j) {
                            o = e.options[j];
                            if (o.selected) { data.push(n + enc(o.attributes.value && o.attributes.value.specified ? o.value : o.text)); }
                        }
                    }
                    break;
                case 'radio':
                case 'checkbox':
                    if (e.checked) { data.push(n + v); }
                    break;
                case undefined:
                case 'reset':
                case 'button':
                    break;
                default:
                    data.push(n + v);
            }
        }
        return data.join('&');
    }

    // ---- AutoSubmit -----------------------------------------------------------------------------------------

    var defaultConfig = {
        interval: 300, trackUserInput: true, ignoreClass: false,
        // the rich text editors (TinyMCE) save into their textareas before the form is read
        beforeSerialize: function () { if (window.tinyMCE && typeof window.tinyMCE.triggerSave === 'function') { window.tinyMCE.triggerSave(); } }
    };
    var instances = {};

    function AutoSubmit(conf) {
        var self = this, enabledCheck = conf.enabled || function () { return true; };
        this.conf = $.extend({}, defaultConfig, conf);
        this.conf.interval = parseInt(this.conf.interval, 10) || defaultConfig.interval;
        this.timer = false;
        this.started = false;
        this.state = '';
        this.request = false;
        this.handlers = {};
        this.isEnabled = false;
        var $form = $(this.conf.form);
        $(function () {
            self.isEnabled = !!enabledCheck.call(self);
            if (self.isEnabled) { self.fire('init'); }
        });
        Exp.on('autosubmit:forcesave', function () { self.submit('AutoSubmitForced=' + new Date().getTime()); });
        if ($form[0] && $form[0].id) { instances[$form[0].id] = this; }
    }

    AutoSubmit.prototype.on = function (name, fn) {
        (this.handlers[name] = this.handlers[name] || []).push(fn);
        return this;
    };

    AutoSubmit.prototype.fire = function (name, data) {
        var self = this, e = $.extend({ type: name }, data || {});
        (this.handlers[name] || []).slice().forEach(function (fn) { fn.call(self, e); });
        Exp.emit('exp:autosave:' + name, $.extend({ form: $(this.conf.form)[0] }, data || {}));
    };

    /** Starts it: the form's state now, a save every interval, on leaving a field, and none once the form is submitted. */
    AutoSubmit.prototype.start = function () {
        var self = this;
        if (this.started) { return; }
        $(function () {
            if (!self.isEnabled || self.started) { return; }
            self.timer = window.setInterval(function () { self.submit(); }, self.conf.interval * 1000);
            self.started = true;
            self.state = serializeForm(self.conf.form, self.conf.ignoreClass);
            var $form = $(self.conf.form);
            if (self.conf.trackUserInput) {
                // YUI's delegated 'blur' (it listened in the capture phase); focusout is the bubbling one
                $form.on('focusout.expautosave', 'input, select, textarea, iframe', function (e) {
                    if (!self.conf.ignoreClass || !$(e.target).hasClass(self.conf.ignoreClass)) { self.submit(); }
                });
            }
            $form.on('submit.expautosave', function () { self.stop(); });
        });
    };

    /** Stops it, and cancels a save on its way (which fires 'abort'). */
    AutoSubmit.prototype.stop = function () {
        if (!this.started) { return; }
        window.clearInterval(this.timer);
        this.started = false;
        if (this.request) {
            var r = this.request;
            this.request = false;
            r.abort();
        }
    };

    /**
     * Saves the form when it changed since the last save: its fields and files, posted to conf.action. fields: more
     * data to send, as "name=value&name=value" (it also counts as a change, as with YUI).
     */
    AutoSubmit.prototype.submit = function (fields) {
        var self = this, formState, originalState, $form = $(this.conf.form);
        if (!this.started) { return; }
        // Rich text editors write their content back into the form first, as the form's own submit makes them do
        // (TinyMCE patches form.submit(), which YUI's upload transport called), so the draft gets what the editor
        // shows and the next comparison does not see a change that is only the editor's rewrite
        if (this.conf.beforeSerialize) { this.conf.beforeSerialize.call(this); }
        formState = originalState = serializeForm(this.conf.form, this.conf.ignoreClass);
        if (fields) { formState += '&' + fields; }
        if (this.state === formState) {
            this.fire('nochange');
            return;
        }
        if (this.request) {
            var old = this.request;
            this.request = false;
            old.expReplaced = true;
            old.abort();
        }
        this.state = originalState;
        this.fire('beforesave');
        var data = new FormData($form[0]);
        if (fields) {
            String(fields).split('&').forEach(function (pair) {
                if (!pair) { return; }
                var i = pair.indexOf('=');
                data.append(decodeURIComponent(i === -1 ? pair : pair.slice(0, i)), i === -1 ? '' : decodeURIComponent(pair.slice(i + 1)));
            });
        }
        if (!data.has('ezxform_token') && Exp.token()) { data.append('ezxform_token', Exp.token()); }
        var request = $.ajax({ url: this.conf.action, method: 'POST', data: data, processData: false, contentType: false, dataType: 'text' });
        this.request = request;
        request.then(function (text) {
            if (self.request === request) { self.request = false; }
            var json = null, error = false;
            try { json = JSON.parse(text); } catch (e) { error = true; }
            if (error || !json || json.error_text) {
                self.fire('error', { json: json });
            } else {
                self.fire('success', { json: json });
            }
        }, function (xhr, textStatus) {
            if (self.request === request) { self.request = false; }
            if (textStatus === 'abort') {
                // as YUI: an aborted save (stop(), or a newer save replacing it) reports 'abort'
                if (!request.expReplaced) { self.fire('abort'); }
                return;
            }
            var json = null;
            try { json = JSON.parse(xhr.responseText); } catch (e) { json = null; }
            self.fire('error', { json: json });
        });
    };

    // ---- Preview ----------------------------------------------------------------------------------------------

    var previewDefaults = {
        previewTemplate: '<div id="content-preview" class="unsaved"><div id="preview-iframe"></div><div class="loader">%loading</div><div class="error">%error</div></div>',
        elementTemplate: '<a id="preview-spacer"><span>%preview</span></a><a id="preview-link"><span>%preview</span></a>',
        place: '#content-preview',
        preview: '#preview-iframe',
        element: '#preview-link',
        buttonPlace: '#controlbar-top .button-right',
        texts: { loading: 'Loading...', preview: 'Preview', error: 'An error occurred' },
        topPosition: '0px'
    };

    function esc(s) { return $('<span>').text(String(s)).html(); }

    function Preview(conf) {
        this.conf = $.extend(true, {}, previewDefaults, conf);
        var c = this.conf;
        c.previewTemplate = c.previewTemplate.replace('%loading', esc(c.texts.loading)).replace('%error', esc(c.texts.error));
        c.elementTemplate = c.elementTemplate.replace(/%preview/g, esc(c.texts.preview));
    }

    Preview.prototype.init = function () {
        var self = this, $button = $(this.conf.buttonPlace);
        $button.append(this.conf.elementTemplate).append(this.conf.previewTemplate);
        this.link = $(this.conf.element);
        this.place = $(this.conf.place);
        this.preview = $(this.conf.preview);
        this.link.css('height', this.conf.topPosition);
        this.place.css('top', this.conf.topPosition);
        this.collapsible = Exp.collapse({
            link: this.conf.element,
            content: false,
            collapsed: 1,
            beforeuncollapse: function () { self.initPreview(); },
            aftercollapse: function () { self.resetPreview(); },
            beforecollapse: function () {
                // as ezcontentpreview.js: the contents fade out while the place closes
                self.place.children().stop(true).animate({ opacity: 0 }, Exp.reducedMotion ? 0 : 500);
            },
            elements: [{
                selector: this.conf.place, duration: 0.7,
                fullStyle: { height: function () { return (window.innerHeight - parseInt(self.conf.topPosition, 10)) + 'px'; } },
                collapsedStyle: { height: '0px' }
            }, {
                selector: this.conf.place + ' iframe', duration: 0.8,
                fullStyle: { height: function () { return self.getIframeHeight(); } },
                collapsedStyle: { height: '0px' }
            }]
        });
        this.loading();
    };

    Preview.prototype.close = function () { this.collapsible.collapse(); };

    Preview.prototype.loading = function () { this.place.removeClass('error').addClass('loading'); };

    /** The height that makes the iframe fill the preview place, as "300px". */
    Preview.prototype.getIframeHeight = function () {
        var offset = 0, $iframe = this.place.find('iframe').first();
        this.preview.children().each(function () {
            if (this.tagName.toLowerCase() !== 'iframe') { offset += this.offsetHeight; }
        });
        var cs = $iframe[0] ? window.getComputedStyle($iframe[0]) : { marginTop: '0', marginBottom: '0' };
        return (window.innerHeight - parseInt(this.conf.topPosition, 10) - offset
                - (parseInt(cs.marginTop, 10) || 0) - (parseInt(cs.marginBottom, 10) || 0)) + 'px';
    };

    Preview.prototype.initPreview = function () {
        this.link.addClass('previewed');
        this.place.addClass('previewed');
        this.place.children().stop(true).css('opacity', 1);
        if (this.place.hasClass('unsaved') || this.place.hasClass('error')) {
            this.place.removeClass('unsaved');
            Exp.emit('autosubmit:forcesave');
        }
    };

    Preview.prototype.resetPreview = function () {
        this.link.removeClass('previewed');
        this.place.removeClass('previewed');
        this.place.children().stop(true).css('opacity', 1);
    };

    /** The preview's content (HTML from the server: the iframe and its toolbar). */
    Preview.prototype.setContent = function (content) {
        this.place.removeClass('loading');
        this.preview.html(content);
        this.setHandlers();
        if (this.place.hasClass('previewed')) {
            this.place.find('iframe').first().stop(true).animate({ height: this.getIframeHeight() }, Exp.reducedMotion ? 0 : 400);
        }
    };

    Preview.prototype.error = function (err) {
        var msg = this.conf.texts.error;
        if (err) { msg += ': ' + err; }
        this.place.find('.error').first().text(msg);
        this.place.removeClass('loading').addClass('error');
    };

    /** In the preview: the siteaccess selector reloads the iframe; the close link closes the preview. */
    Preview.prototype.setHandlers = function () {
        var self = this;
        this.preview.find('select').first().on('change', function () {
            var sa = this.value, $iframe = self.preview.find('iframe').first(), $loader = self.preview.find('#iframe-loader');
            var url = String($iframe.attr('src') || '').split('/');
            $loader.stop(true).fadeIn(Exp.reducedMotion ? 0 : 200);
            url.pop();
            url.push(sa);
            $iframe.one('load', function () { $loader.stop(true).fadeOut(Exp.reducedMotion ? 0 : 200); });
            $iframe.attr('src', url.join('/'));
        });
        this.preview.find('a.close').first().on('click', function (e) {
            e.preventDefault();
            self.close();
        });
    };

    Exp.autosave = { AutoSubmit: AutoSubmit, Preview: Preview, instances: instances, serializeForm: serializeForm };

    $.fn.expAutosave = function (conf) {
        return this.each(function () { $(this).data('expAutosave', new AutoSubmit($.extend({}, conf, { form: this }))); });
    };
    $.fn.expPreview = function (conf) {
        return this.each(function () {
            var p = new Preview($.extend({}, conf, { buttonPlace: this }));
            p.init();
            $(this).data('expPreview', p);
        });
    };
}(window, document));
