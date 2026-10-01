/*!
 * Exponential UI (expui) upload — files uploaded with progress per file, cancel, several files and drop zones.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::upload after exp::core (and exp::io, for its error type). Replaces YUI 3's ezajaxuploader upload
 * step (io-upload-iframe) and ezmultiupload's YUI uploader:
 *
 *   $(el).expUpload({
 *       url: '/admin/ezmultiupload/upload/327',   where each file is POSTed (one request per file)
 *       name: 'file',                             the file's field name (default: the input's name, else 'file')
 *       multiple: false, accept: 'image/*,.pdf',  what can be chosen (accept also takes ['*.jpg', ...])
 *       drop: false,                              true: el is a drop zone too; or a selector of the zone
 *       maxSize: 0,                               bytes, 0: no limit (larger files are refused, not sent)
 *       data: {} | function (file) {},            more POST fields per file; the form token is added
 *       form: null,                               a form whose fields are posted with each file, in order
 *       auto: true,                               upload as soon as files are chosen; false: call .start()
 *       parallel: 1, responseType: 'auto',        uploads at the same time; 'json', 'text' or 'auto'
 *       onDone(response, file), onFail(error, file), onProgress(file), onAdd(file), onComplete(summary)
 *   });
 *
 * el is a container (a chooser, a drop zone and the file list are built in it) or an <input type="file"> (used as
 * the chooser, the list goes after it). The instance: $(el).data('expUpload') or $(el).expUpload('instance'):
 * add(files), start(), cancel(file|id) (no argument: all), files(), progress(), clear(), enable(), disable(),
 * destroy(). Events on el (bubbling) and page-wide (Exp.on), each with { upload, file, ... }:
 *   exp:upload:add, exp:upload:refuse { reason }, exp:upload:start, exp:upload:progress { loaded, total, percent },
 *   exp:upload:done { response }, exp:upload:fail { error }, exp:upload:cancel, exp:upload:complete { files, done,
 *   failed, canceled }.
 * Started from markup with data-exp-upload='{"url": "…", "multiple": true}'.
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var nextId = 0;

    function t(text, params) { return Exp.i18n(text, params); }

    /** 1536 -> "1.5 kB"; in the page's language (the decimal separator). */
    function size(bytes) {
        var units = ['B', 'kB', 'MB', 'GB'], i = 0, n = Number(bytes) || 0;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        var decimals = i === 0 || n >= 10 ? 0 : 1, text = n.toFixed(decimals);
        try {
            text = new Intl.NumberFormat((Exp.config.locale && Exp.config.locale.http) || undefined,
                                         { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(Number(text));
        } catch (e) { /* the plain number */ }
        return text + ' ' + units[i];
    }

    /** The accept option as a list of tests: '.jpg', '*.jpg', 'image/*', 'image/png', '*.*' (anything). */
    function acceptList(accept) {
        if (!accept) { return []; }
        var list = Array.isArray(accept) ? accept : String(accept).split(/[,;]/);
        return list.map(function (a) { return String(a).trim().toLowerCase(); }).filter(Boolean);
    }
    function acceptAttr(list) {
        if (!list.length || list.indexOf('*.*') !== -1 || list.indexOf('*') !== -1) { return ''; }
        return list.map(function (a) { return a.indexOf('*.') === 0 ? a.slice(1) : a; }).join(',');
    }
    function accepted(file, list) {
        if (!list.length) { return true; }
        var name = String(file.name || '').toLowerCase(), type = String(file.type || '').toLowerCase();
        return list.some(function (a) {
            if (a === '*' || a === '*.*') { return true; }
            if (a.indexOf('*.') === 0) { a = a.slice(1); }
            if (a.charAt(0) === '.') { return name.length > a.length && name.slice(-a.length) === a; }
            if (/\/\*$/.test(a)) { return type.indexOf(a.slice(0, -1)) === 0; }
            return type === a;
        });
    }

    function ioError(kind, status, message, response) {
        if (Exp.io && Exp.io.Error) { return new Exp.io.Error(kind, status, message, response); }
        var e = new Error(message);
        e.kind = kind; e.status = status; e.response = response;
        return e;
    }

    function signedOut(xhr) {
        return xhr.status === 401 || /\/user\/login\b/.test(xhr.responseURL || '');
    }

    function Upload($el, options) {
        var self = this;
        var o = this.options = $.extend({
            url: null, name: null, multiple: false, accept: null, drop: false, maxSize: 0, data: null, form: null,
            auto: true, parallel: 1, responseType: 'auto', headers: {}, token: true, list: true, input: null,
            texts: {}, onAdd: null, onRefuse: null, onStart: null, onProgress: null, onDone: null, onFail: null,
            onCancel: null, onComplete: null
        }, options || {});
        this.$el = $el;
        this.entries = [];
        this.enabled = true;
        this.accepts = acceptList(o.accept);
        this.texts = $.extend({
            select: o.multiple ? t('Select files') : t('Select a file'),
            drop: o.multiple ? t('or drop them here') : t('or drop it here'),
            cancel: t('Cancel'),
            cancelFile: t('Cancel the upload of %name'),
            waiting: t('Waiting'),
            uploading: t('Uploading'),
            done: t('Done'),
            failed: t('Failed'),
            canceled: t('Canceled'),
            tooLarge: t('The file is too large (%size, at most %max).'),
            wrongType: t('This type of file is not accepted.')
        }, o.texts || {});

        var isInput = $el.is('input[type="file"]');
        this.$input = o.input ? $(o.input) : (isInput ? $el : $());
        if (isInput) {
            this.$root = $('<div class="exp-upload exp-upload--input exp-scope"></div>').insertAfter($el);
        } else {
            this.$root = $el.addClass('exp-upload exp-scope');
            if (!this.$input.length) {
                this.$zone = $('<div class="exp-upload-zone"></div>').appendTo($el);
                var $label = $('<label class="exp-upload-select"></label>').appendTo(this.$zone);
                this.$input = $('<input type="file" class="exp-upload-input">').appendTo($label);
                $('<span class="exp-upload-select-label"></span>').text(this.texts.select).appendTo($label);
                if (o.drop) { $('<span class="exp-upload-hint"></span>').text(this.texts.drop).appendTo(this.$zone); }
            }
        }
        if (!o.name) { o.name = this.$input.attr('name') || 'file'; }
        if (o.multiple) { this.$input.prop('multiple', true); }
        var acc = acceptAttr(this.accepts);
        if (acc) { this.$input.attr('accept', acc); }
        this.$list = $('<ul class="exp-upload-list" aria-live="polite"></ul>').prop('hidden', true).appendTo(this.$root);
        if (!o.list) { this.$list.addClass('exp-visually-hidden'); }

        this.$input.on('change.expupload', function () {
            if (!this.files || !this.files.length) { return; }
            self.add(this.files);
        });

        var $drop = o.drop === true ? (isInput ? this.$root : $el) : (o.drop ? $(o.drop) : $());
        this.$drop = $drop;
        if ($drop.length) {
            $drop.addClass('exp-upload-drop');
            var depth = 0;
            $drop.on('dragenter.expupload', function (e) {
                if (!self.enabled || !hasFiles(e)) { return; }
                e.preventDefault(); depth++; $drop.addClass('is-over');
            }).on('dragover.expupload', function (e) {
                if (!self.enabled || !hasFiles(e)) { return; }
                e.preventDefault();
                e.originalEvent.dataTransfer.dropEffect = 'copy';
            }).on('dragleave.expupload', function () {
                depth = Math.max(0, depth - 1);
                if (!depth) { $drop.removeClass('is-over'); }
            }).on('drop.expupload', function (e) {
                if (!hasFiles(e)) { return; }
                e.preventDefault(); depth = 0; $drop.removeClass('is-over');
                if (!self.enabled) { return; }
                var files = e.originalEvent.dataTransfer.files;
                self.add(o.multiple ? files : Array.prototype.slice.call(files, 0, 1));
            });
        }
        $el.data('expUpload', this);
    }

    function hasFiles(e) {
        var dt = e.originalEvent && e.originalEvent.dataTransfer;
        return !!dt && Array.prototype.indexOf.call(dt.types || [], 'Files') !== -1;
    }

    Upload.prototype.emit = function (name, data, callback) {
        data = $.extend({ upload: this }, data);
        var o = this.options, cb = o[callback];
        if (typeof cb === 'function') {
            try {
                if (name === 'done') { cb.call(this, data.response, data.file); }
                else if (name === 'fail') { cb.call(this, data.error, data.file); }
                else if (name === 'complete') { cb.call(this, data); }
                else { cb.call(this, data.file, data); }
            } catch (e) {
                if (window.console) { window.console.error('Exp.upload: ' + callback + ' failed', e); }
            }
        }
        this.$el.trigger('exp:upload:' + name, [data]);
        Exp.emit('exp:upload:' + name, data);
    };

    /** Adds files (a FileList, an array of File); refused ones (size, type) are listed with the reason. Starts them when auto. */
    Upload.prototype.add = function (files) {
        var self = this, o = this.options, added = [];
        var list = Array.prototype.slice.call(files || []);
        if (!o.multiple) {
            // one file at a time: a new choice replaces what has not been sent yet
            list = list.slice(0, 1);
            this.entries.filter(function (f) { return f.status === 'queued' || f.status === 'refused'; }).forEach(function (f) { self.drop(f); });
        }
        list.forEach(function (file) {
            nextId += 1;
            var entry = { id: 'exp-upload-' + nextId, file: file, name: file.name, size: file.size, type: file.type,
                          status: 'queued', loaded: 0, total: file.size, percent: 0, response: null, error: null, xhr: null };
            if (o.maxSize && file.size > o.maxSize) {
                entry.status = 'refused';
                entry.reason = self.texts.tooLarge.split('%size').join(size(file.size)).split('%max').join(size(o.maxSize));
            } else if (!accepted(file, self.accepts)) {
                entry.status = 'refused';
                entry.reason = self.texts.wrongType;
            }
            self.entries.push(entry);
            self.row(entry);
            if (entry.status === 'refused') {
                self.emit('refuse', { file: entry, reason: entry.reason }, 'onRefuse');
            } else {
                added.push(entry);
                self.emit('add', { file: entry }, 'onAdd');
            }
        });
        if (o.auto && added.length) { this.start(); }
        return added;
    };

    /** The file's row in the list: name, size, progress, status, cancel. */
    Upload.prototype.row = function (f) {
        var self = this;
        this.$list.prop('hidden', false);
        if (!f.$row) {
            f.$row = $('<li class="exp-upload-file"></li>').attr('id', f.id);
            $('<span class="exp-upload-name"></span>').text(f.name).appendTo(f.$row);
            $('<span class="exp-upload-size"></span>').text(size(f.size)).appendTo(f.$row);
            f.$bar = $('<progress class="exp-upload-progress" max="100" value="0"></progress>').attr('aria-label', f.name).appendTo(f.$row);
            f.$status = $('<span class="exp-upload-status"></span>').appendTo(f.$row);
            f.$cancel = $('<button type="button" class="exp-upload-cancel"></button>').text(this.texts.cancel)
                .attr('aria-label', this.texts.cancelFile.split('%name').join(f.name))
                .on('click', function (e) { e.preventDefault(); self.cancel(f); }).appendTo(f.$row);
            this.$list.append(f.$row);
        }
        f.$row.attr('class', 'exp-upload-file is-' + f.status);
        f.$bar.val(f.percent).text(f.percent + '%').prop('hidden', f.status === 'refused');
        var text = { queued: this.texts.waiting, uploading: this.texts.uploading + ' ' + f.percent + '%', done: this.texts.done,
                     failed: this.texts.failed + (f.error && f.error.message ? ': ' + f.error.message : ''), canceled: this.texts.canceled,
                     refused: f.reason }[f.status];
        f.$status.text(text || '');
        f.$cancel.prop('hidden', f.status !== 'queued' && f.status !== 'uploading');
    };

    /** Removes a file that is not uploading from the list. */
    Upload.prototype.drop = function (f) {
        if (f.status === 'uploading') { return; }
        var i = this.entries.indexOf(f);
        if (i !== -1) { this.entries.splice(i, 1); }
        if (f.$row) { f.$row.remove(); }
        if (!this.entries.length) { this.$list.prop('hidden', true); }
    };

    /** The POST body of one file: the form's fields (the file put in its place), data, the form token. */
    Upload.prototype.body = function (f) {
        var o = this.options, fd;
        if (o.form) {
            fd = new FormData($(o.form)[0]);
            fd.set(o.name, f.file, f.name);
        } else {
            fd = new FormData();
        }
        var data = typeof o.data === 'function' ? o.data.call(this, f) : o.data;
        if (Array.isArray(data)) {
            data.forEach(function (d) { fd.append(d.name, d.value === undefined || d.value === null ? '' : d.value); });
        } else if (data) {
            Object.keys(data).forEach(function (k) { fd.append(k, data[k] === undefined || data[k] === null ? '' : data[k]); });
        }
        if (o.token && !fd.has('ezxform_token') && Exp.token && Exp.token()) { fd.append('ezxform_token', Exp.token()); }
        if (!o.form) { fd.append(o.name, f.file, f.name); }
        return fd;
    };

    /** Uploads the files waiting, o.parallel at a time; a Promise of the summary when all are finished. */
    Upload.prototype.start = function () {
        var self = this;
        if (!this.options.url) { throw new Error('Exp.upload: a url is needed'); }
        if (!this.running) {
            this.running = new Promise(function (resolve) { self.finished = resolve; });
        }
        var running = this.entries.filter(function (f) { return f.status === 'uploading'; }).length;
        var waiting = this.entries.filter(function (f) { return f.status === 'queued'; });
        while (running < Math.max(1, this.options.parallel) && waiting.length) {
            this.send(waiting.shift());
            running++;
        }
        this.check();
        return this.running;
    };

    Upload.prototype.check = function () {
        if (!this.running) { return; }
        var busy = this.entries.some(function (f) { return f.status === 'queued' || f.status === 'uploading'; });
        if (busy) { return; }
        var count = function (s) { return this.entries.filter(function (f) { return f.status === s && !f.reported; }).length; }.bind(this);
        var summary = { files: this.entries.filter(function (f) { return !f.reported && f.status !== 'refused'; }),
                        done: count('done'), failed: count('failed'), canceled: count('canceled') };
        summary.files.forEach(function (f) { f.reported = true; });
        var resolve = this.finished;
        this.running = null; this.finished = null;
        this.emit('complete', summary, 'onComplete');
        resolve(summary);
    };

    Upload.prototype.send = function (f) {
        var self = this, o = this.options;
        var xhr = f.xhr = new XMLHttpRequest();
        f.status = 'uploading';
        this.row(f);
        this.emit('start', { file: f }, 'onStart');
        xhr.open('POST', o.url, true);
        xhr.setRequestHeader('Accept', o.responseType === 'json' ? 'application/json, text/javascript, */*' : '*/*');
        Object.keys(o.headers || {}).forEach(function (h) { xhr.setRequestHeader(h, o.headers[h]); });
        xhr.upload.addEventListener('progress', function (e) {
            if (!e.lengthComputable || f.status !== 'uploading') { return; }
            f.loaded = e.loaded; f.total = e.total;
            f.percent = Math.min(99, Math.floor(100 * e.loaded / Math.max(1, e.total)));
            self.row(f);
            self.emit('progress', { file: f, loaded: e.loaded, total: e.total, percent: f.percent, overall: self.progress() }, 'onProgress');
        });
        xhr.addEventListener('load', function () {
            if (f.status !== 'uploading') { return; }
            if (signedOut(xhr)) { return self.fail(f, ioError('signedout', 401, t('You are no longer signed in. Sign in again and repeat this.'), xhr)); }
            if (xhr.status === 403) { return self.fail(f, ioError('refused', 403, t('The server answered with an error (HTTP %status).', { '%status': 403 }), xhr)); }
            if (xhr.status < 200 || xhr.status >= 300) { return self.fail(f, ioError('server', xhr.status, t('The server answered with an error (HTTP %status).', { '%status': xhr.status }), xhr)); }
            var text = xhr.responseText, response = text;
            var type = (xhr.getResponseHeader('Content-Type') || '').toLowerCase();
            if (o.responseType === 'json' || (o.responseType === 'auto' && (type.indexOf('json') !== -1 || /^\s*[\[{]/.test(text)))) {
                try { response = JSON.parse(text); } catch (e) {
                    if (o.responseType === 'json') { return self.fail(f, ioError('invalid', xhr.status, t('The server answered with an error (HTTP %status).', { '%status': xhr.status }), text)); }
                }
            }
            f.status = 'done'; f.percent = 100; f.loaded = f.total; f.response = response; f.xhr = null;
            self.row(f);
            self.emit('done', { file: f, response: response }, 'onDone');
            self.next();
        });
        xhr.addEventListener('error', function () {
            if (f.status === 'uploading') { self.fail(f, ioError('network', 0, t('No answer from the server.'), xhr)); }
        });
        xhr.addEventListener('timeout', function () {
            if (f.status === 'uploading') { self.fail(f, ioError('timeout', 0, t('No answer from the server.'), xhr)); }
        });
        xhr.send(this.body(f));
    };

    Upload.prototype.fail = function (f, error) {
        f.status = 'failed'; f.error = error; f.xhr = null;
        this.row(f);
        this.emit('fail', { file: f, error: error }, 'onFail');
        this.next();
    };

    Upload.prototype.next = function () {
        if (this.entries.some(function (f) { return f.status === 'queued'; })) { this.start(); } else { this.check(); }
    };

    function find(self, f) {
        if (f && typeof f === 'object' && self.entries.indexOf(f) !== -1) { return f; }
        return self.entries.filter(function (e) { return e.id === f || (f && f.id === e.id); })[0] || null;
    }

    /** Cancels one file (an entry or its id) or, with no argument, every file waiting or uploading. */
    Upload.prototype.cancel = function (which) {
        var self = this;
        var list = which === undefined ? this.entries.slice() : [find(this, which)];
        list.forEach(function (f) {
            if (!f || (f.status !== 'queued' && f.status !== 'uploading')) { return; }
            var xhr = f.xhr;
            f.status = 'canceled'; f.xhr = null;
            if (xhr) { try { xhr.abort(); } catch (e) { /* gone already */ } }
            self.row(f);
            self.emit('cancel', { file: f }, 'onCancel');
        });
        this.next();
        return this;
    };

    /** The files, in the order they were added. */
    Upload.prototype.files = function () { return this.entries.slice(); };

    /** Bytes sent of the files uploading or done in this round: { loaded, total, percent, count, done }. */
    Upload.prototype.progress = function () {
        var round = this.entries.filter(function (f) { return !f.reported && (f.status === 'uploading' || f.status === 'done' || f.status === 'queued'); });
        var loaded = 0, total = 0;
        round.forEach(function (f) { total += f.total || 0; loaded += f.status === 'done' ? (f.total || 0) : (f.loaded || 0); });
        return { loaded: loaded, total: total, percent: total ? Math.min(100, Math.floor(100 * loaded / total)) : 0, count: round.length,
                 done: round.filter(function (f) { return f.status === 'done'; }).length };
    };

    /** Empties the list of the files that are finished (done, failed, canceled, refused). */
    Upload.prototype.clear = function () {
        var self = this;
        this.entries.slice().forEach(function (f) { if (f.status !== 'uploading' && f.status !== 'queued') { self.drop(f); } });
        return this;
    };

    Upload.prototype.enable = function () { this.enabled = true; this.$input.prop('disabled', false); this.$root.removeClass('is-disabled'); return this; };
    Upload.prototype.disable = function () { this.enabled = false; this.$input.prop('disabled', true); this.$root.addClass('is-disabled'); return this; };

    /** Cancels what is running and takes the list, the chooser it built and its handlers away. */
    Upload.prototype.destroy = function () {
        this.cancel();
        this.$input.off('.expupload');
        this.$drop.off('.expupload').removeClass('exp-upload-drop is-over');
        this.$list.remove();
        if (this.$zone) { this.$zone.remove(); }
        if (this.$root[0] !== this.$el[0]) { this.$root.remove(); } else { this.$root.removeClass('exp-upload exp-scope is-disabled'); }
        this.$el.removeData('expUpload');
    };

    Exp.upload = { Upload: Upload, size: size, accepted: function (file, accept) { return accepted(file, acceptList(accept)); } };

    /** The instance on an element (jQuery's data() would also read a data-exp-upload attribute under the same name). */
    function instanceOf($el) { var u = $el.data('expUpload'); return u instanceof Upload ? u : null; }

    /** $(el).expUpload(options) sets it up; $(el).expUpload('start' | 'cancel' | 'clear' | 'destroy' | 'instance'). */
    $.fn.expUpload = function (options) {
        if (typeof options === 'string') {
            var inst = instanceOf(this.first());
            if (options === 'instance') { return inst || null; }
            this.each(function () { var u = instanceOf($(this)); if (u && typeof u[options] === 'function') { u[options](); } });
            return this;
        }
        return this.each(function () {
            var $el = $(this);
            if (instanceOf($el)) { return; }
            new Upload($el, options);
        });
    };

    Exp.register('upload', function ($el, options) { $el.expUpload(options); });
}(window, document));
