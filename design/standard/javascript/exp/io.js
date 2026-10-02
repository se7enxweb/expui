/*!
 * Exponential UI (expui) io — server calls through ezjscore, on jQuery 4.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::io after exp::core. Talks to the same endpoint as $.ez() (ezjscore/call/),
 * with the same arguments and form token, so no server function changes:
 *
 *   Exp.io.call('ezjscnode::subtree', [2, 25, 0]).then(content => ...)
 *   Exp.io.form(formElement).then(response => ...)
 *   Exp.io.poll('ezpublishingqueue::status', [id], {until: r => r.done}).then(last => ...)
 *   Exp.io.url('content/view/full/2')
 *
 * A failed call rejects with an Exp.io.Error: {kind, status, message, response}; kind is one of
 * signedout (the session ended, status 401), refused (403), server (an HTTP error or error_text from the server
 * function), network (no answer, or aborted), timeout, invalid (bad arguments).
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    function IOError(kind, status, message, response) {
        this.name = 'ExpIOError';
        this.kind = kind;
        this.status = status || 0;
        this.message = message || kind;
        this.response = response;
    }
    IOError.prototype = Object.create(Error.prototype);
    IOError.prototype.constructor = IOError;

    function signedOut(xhr) {
        var url = xhr && xhr.responseURL ? xhr.responseURL : '';
        var text = xhr && typeof xhr.responseText === 'string' ? xhr.responseText : '';
        return /\/user\/login\b/.test(url) || /name=["']Login["']/.test(text);
    }

    function failure(xhr, textStatus) {
        var status = xhr ? xhr.status : 0;
        if (status === 401 || signedOut(xhr)) {
            return new IOError('signedout', 401, Exp.i18n('You are no longer signed in. Sign in again and repeat this.'), xhr);
        }
        if (status === 403) { return new IOError('refused', 403, Exp.i18n('The server answered with an error (HTTP %status).', { '%status': 403 }), xhr); }
        if (textStatus === 'timeout') { return new IOError('timeout', 0, Exp.i18n('No answer from the server.'), xhr); }
        if (status === 0) { return new IOError('network', 0, Exp.i18n('No answer from the server.'), xhr); }
        return new IOError('server', status, Exp.i18n('The server answered with an error (HTTP %status).', { '%status': status }), xhr);
    }

    /** 'class::function' plus arguments as the ezjscore call string: class::function::arg1::arg2 */
    function callString(fn, args) {
        if (typeof fn !== 'string' || !/^[A-Za-z0-9_]+::[A-Za-z0-9_]+$/.test(fn)) {
            throw new IOError('invalid', 0, 'Exp.io: a server function is named class::function');
        }
        var list = args === undefined || args === null ? [] : (Array.isArray(args) ? args : [args]);
        return [fn].concat(list.map(function (a) {
            var s = String(a);
            if (s.indexOf('::') !== -1 || s.indexOf(Exp.config.separator) !== -1) {
                throw new IOError('invalid', 0, 'Exp.io: an argument may not contain "::"');
            }
            return s;
        })).join('::');
    }

    /** The token the page carries (ezformtoken), for every POST. */
    function token() { return Exp.token ? Exp.token() : ''; }

    /**
     * The raw request: a jQuery 4 jqXHR resolving with the call view's JSON ({error_text, content}).
     * opts: method (POST, or GET), data (more POST fields: object, array of {name, value}, or string), timeout.
     */
    function raw(call, opts) {
        opts = opts || {};
        var method = String(opts.method || 'POST').toUpperCase();
        var url = Exp.config.call;
        var data = opts.data;
        if (method === 'POST') {
            if (Array.isArray(data)) {
                data = data.concat([{ name: 'ezjscServer_function_arguments', value: call }, { name: 'ezxform_token', value: token() }]);
            } else if (typeof data === 'string') {
                data += (data ? '&' : '') + 'ezjscServer_function_arguments=' + encodeURIComponent(call) + '&ezxform_token=' + encodeURIComponent(token());
            } else {
                data = $.extend({}, data || {}, { ezjscServer_function_arguments: call, ezxform_token: token() });
            }
        } else {
            url += encodeURIComponent(call);
            data = undefined;
        }
        return $.ajax({
            url: url, method: method, data: data, dataType: 'json', timeout: opts.timeout || 0,
            headers: { Accept: 'application/json,text/javascript,*/*' }
        });
    }

    function call(fn, args, opts) {
        var request;
        try { request = raw(callString(fn, args), opts); } catch (e) { return Promise.reject(e); }
        if (opts && opts.signal) {
            if (opts.signal.aborted) { request.abort(); }
            opts.signal.addEventListener('abort', function () { request.abort(); }, { once: true });
        }
        return new Promise(function (resolve, reject) {
            request.then(function (json) {
                if (!json || typeof json !== 'object') {
                    reject(new IOError('server', 200, Exp.i18n('The server answered with an error (HTTP %status).', { '%status': 200 }), json));
                } else if (json.error_text) {
                    reject(new IOError('server', 200, String(json.error_text), json));
                } else {
                    resolve(json.content);
                }
            }, function (xhr, textStatus) {
                reject(failure(xhr, textStatus));
            });
        });
    }

    /**
     * Posts a form (its own action, or opts.url) with its fields and files, the form token added when the form
     * has none. Resolves with the response (JSON when the server sends JSON, else text).
     */
    function form(el, opts) {
        opts = opts || {};
        var f = $(el)[0];
        if (!f || f.tagName !== 'FORM') { return Promise.reject(new IOError('invalid', 0, 'Exp.io.form: a form element is needed')); }
        var data = new FormData(f);
        if (opts.submitter && opts.submitter.name) { data.append(opts.submitter.name, opts.submitter.value || ''); }
        if (!data.has('ezxform_token') && token()) { data.append('ezxform_token', token()); }
        return new Promise(function (resolve, reject) {
            $.ajax({ url: opts.url || f.getAttribute('action') || window.location.href, method: (f.getAttribute('method') || 'POST').toUpperCase(),
                     data: data, processData: false, contentType: false, timeout: opts.timeout || 0 })
                .then(function (response) { resolve(response); }, function (xhr, textStatus) { reject(failure(xhr, textStatus)); });
        });
    }

    /**
     * Calls fn again every opts.every ms (default 2000) until opts.until(content) is true, then resolves with that
     * content; rejects after opts.max calls (default 150) or with the first failure. opts.onTick(content, n).
     */
    function poll(fn, args, opts) {
        opts = opts || {};
        var every = opts.every || 2000, max = opts.max || 150, until = opts.until || function () { return true; };
        var n = 0;
        return new Promise(function (resolve, reject) {
            (function next() {
                n++;
                call(fn, args, opts).then(function (content) {
                    if (opts.onTick) { opts.onTick(content, n); }
                    if (until(content)) { resolve(content); return; }
                    if (n >= max) { reject(new IOError('timeout', 0, Exp.i18n('No answer from the server.'), content)); return; }
                    window.setTimeout(next, every);
                }, reject);
            }());
        });
    }

    /** A site address: Exp.io.url('content/view/full/2') -> /admin/content/view/full/2 */
    function url(path) {
        return Exp.config.root + String(path || '').replace(/^\/+/, '');
    }

    Exp.io = { call: call, form: form, poll: poll, url: url, raw: raw, callString: callString, Error: IOError };
}(window, document));
