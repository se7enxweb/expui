/*!
 * Exponential UI (expui) — browser tests of exp::upload ($.fn.expUpload, Exp.upload), against expui/test/echo.
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
    function file(name, text, type) { return new File([text], name, { type: type || 'text/plain' }); }
    function big(name, bytes) { return new File([new Uint8Array(bytes)], name, { type: 'application/octet-stream' }); }
    function echo() { return Exp.io.url('expui/test/echo'); }
    /** Resolves with the summary of the next exp:upload:complete on $el. */
    function completed($el) {
        return new Promise(function (resolve) { $el.one('exp:upload:complete', function (e, d) { resolve(d); }); });
    }

    test('upload: size() and accepted()', function (t) {
        t.equal(Exp.upload.size(500), '500 B');
        t.ok(/^1[.,]5 kB$/.test(Exp.upload.size(1536)), Exp.upload.size(1536));
        t.ok(/^3 MB$/.test(Exp.upload.size(3 * 1024 * 1024)), Exp.upload.size(3 * 1024 * 1024));
        var png = file('a.PNG', 'x', 'image/png'), txt = file('b.txt', 'x');
        t.ok(Exp.upload.accepted(png, 'image/*'), 'image/*');
        t.ok(Exp.upload.accepted(png, ['*.png']), '*.png, any case');
        t.ok(Exp.upload.accepted(png, '.jpg,.png'), 'a list');
        t.ok(!Exp.upload.accepted(txt, 'image/*,.pdf'), 'refused');
        t.ok(Exp.upload.accepted(txt, ['*.*']), '*.* takes anything');
        t.ok(Exp.upload.accepted(txt, null), 'no accept takes anything');
    });

    test('upload: a container gets a chooser (label, input, multiple, accept), a drop hint and a hidden list', function (t) {
        sandbox('<div id="u-box"></div>');
        $('#u-box').expUpload({ url: echo(), multiple: true, drop: true, accept: ['*.jpg', 'image/png'] });
        var $in = $('#u-box input[type="file"]');
        t.equal($in.length, 1, 'one input');
        t.ok($in.prop('multiple'), 'multiple');
        t.equal($in.attr('accept'), '.jpg,image/png', 'accept for the browser');
        t.ok($in.closest('label').text().length > 0, 'the input has its label');
        t.ok($('#u-box').hasClass('exp-upload-drop'), 'a drop zone');
        t.ok($('#u-box .exp-upload-hint').length === 1, 'the drop hint');
        t.ok($('#u-box .exp-upload-list').prop('hidden'), 'no list before a file');
        t.equal($('#u-box').expUpload('instance'), $('#u-box').data('expUpload'), "expUpload('instance')");
        $('#u-box').expUpload('destroy');
        t.equal($('#u-box input').length, 0, 'destroy takes the chooser away');
    });

    test('upload: one POST per file, data first, the file last, the form token added; done and complete', function (t) {
        sandbox('<div id="u-box"></div>');
        var done = [];
        $('#u-box').expUpload({ url: echo(), name: 'Filedata', multiple: true, data: { UploadButton: 'Upload', Extra: 'x' },
                                onDone: function (response, f) { done.push([f.name, response]); } });
        var up = $('#u-box').data('expUpload'), seen = [];
        $('#u-box').on('exp:upload:start exp:upload:done', function (e, d) { seen.push(e.type + ' ' + d.file.name); });
        var finished = completed($('#u-box'));
        up.add([file('a.txt', 'aaa'), file('b.txt', 'bbbbb')]);
        return finished.then(function (summary) {
            t.equal(summary.done, 2, 'both done');
            t.equal(done.length, 2, 'onDone per file');
            var a = done.filter(function (d) { return d[0] === 'a.txt'; })[0][1];
            t.equal(a.method, 'POST');
            t.equal(a.fields.UploadButton, 'Upload', 'data posted');
            t.equal(a.fields.Extra, 'x');
            t.ok(a.token, 'the form token');
            t.equal(a.files.Filedata.name, 'a.txt', 'the file under its name');
            t.equal(a.files.Filedata.size, 3);
            t.ok(seen.indexOf('exp:upload:start a.txt') !== -1 && seen.indexOf('exp:upload:done b.txt') !== -1, 'events on the element');
            t.equal($('#u-box .exp-upload-file.is-done').length, 2, 'the rows say done');
            t.equal($('#u-box .exp-upload-file progress').first().val(), 100, 'the progress at 100');
        });
    });

    test('upload: form fields are posted in their order with the file in its place; token: false adds no second token', function (t) {
        sandbox('<form id="u-form"><input type="file" name="UploadFile" id="u-file"><input type="text" name="UploadName" value="N"><input type="hidden" name="H" value="1"></form>');
        $('#u-form').append($('<input type="hidden" name="ezxform_token">').val(Exp.token()));   // the form carries it (as the relation upload's does)
        var bodies = [];
        var send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (b) { if (b instanceof FormData) { bodies.push(Array.from(b.keys())); } return send.apply(this, arguments); };
        $('#u-file').expUpload({ url: echo(), form: '#u-form', auto: false, token: false, responseType: 'json' });
        var up = $('#u-file').data('expUpload');
        t.ok($('#u-file').next().hasClass('exp-upload'), 'the list goes after the input');
        var dt = new DataTransfer();
        dt.items.add(file('c.txt', 'cc'));
        $('#u-file')[0].files = dt.files;
        $('#u-file').trigger('change');
        t.equal(up.files().length, 1, 'the chosen file is listed');
        t.equal(up.files()[0].status, 'queued', 'auto: false waits');
        var finished = completed($('#u-file'));
        up.start();
        return finished.then(function () {
            XMLHttpRequest.prototype.send = send;
            var r = up.files()[0].response;
            t.deepEqual(bodies[0], ['UploadFile', 'UploadName', 'H', 'ezxform_token'], 'the order of the form, nothing added');
            t.equal(r.fields.UploadName, 'N');
            t.equal(r.files.UploadFile.name, 'c.txt');
            t.equal(r.token, true, 'the form\'s token arrived');
        }, function (e) { XMLHttpRequest.prototype.send = send; throw e; });
    });

    test('upload: too large or the wrong type is refused and not sent', function (t) {
        sandbox('<div id="u-box"></div>');
        var refused = [];
        $('#u-box').expUpload({ url: echo(), multiple: true, maxSize: 10, accept: '.txt', onRefuse: function (f) { refused.push(f.name); } });
        var up = $('#u-box').data('expUpload');
        var added = up.add([file('big.txt', '0123456789ABC'), file('pic.png', 'x', 'image/png'), file('ok.txt', 'ok')]);
        t.equal(added.length, 1, 'one added');
        t.deepEqual(refused, ['big.txt', 'pic.png'], 'two refused');
        t.ok(/10 B/.test($('#u-box .exp-upload-file.is-refused').first().text()), 'the reason names the limit');
        return completed($('#u-box')).then(function (s) { t.equal(s.done, 1, 'only the accepted one was sent'); });
    });

    test('upload: cancel stops a file while it uploads', function (t) {
        sandbox('<div id="u-box"></div>');
        var canceled = [];
        $('#u-box').expUpload({ url: echo(), onCancel: function (f) { canceled.push(f.name); } });
        var up = $('#u-box').data('expUpload');
        var finished = completed($('#u-box'));
        up.add([big('large.bin', 4 * 1024 * 1024)]);
        t.equal(up.files()[0].status, 'uploading');
        $('#u-box .exp-upload-cancel').first().trigger('click');
        return finished.then(function (s) {
            t.equal(s.canceled, 1, 'the summary counts it');
            t.equal(up.files()[0].status, 'canceled');
            t.deepEqual(canceled, ['large.bin'], 'onCancel');
            t.ok($('#u-box .exp-upload-cancel').first().prop('hidden'), 'no cancel button any more');
        });
    });

    test('upload: parallel limits the uploads at the same time; single mode replaces a waiting file', function (t) {
        sandbox('<div id="u-box"></div><div id="u-one"></div>');
        var most = 0;
        $('#u-box').expUpload({ url: echo(), multiple: true, parallel: 2 });
        var up = $('#u-box').data('expUpload');
        $('#u-box').on('exp:upload:start', function () {
            var n = up.files().filter(function (f) { return f.status === 'uploading'; }).length;
            most = Math.max(most, n);
        });
        var finished = completed($('#u-box'));
        up.add([file('1.txt', '1'), file('2.txt', '2'), file('3.txt', '3'), file('4.txt', '4')]);
        $('#u-one').expUpload({ url: echo(), auto: false });
        var one = $('#u-one').data('expUpload');
        one.add([file('x.txt', 'x')]);
        one.add([file('y.txt', 'y')]);
        t.deepEqual(one.files().map(function (f) { return f.name; }), ['y.txt'], 'the second choice replaced the first');
        return finished.then(function (s) {
            t.equal(s.done, 4);
            t.equal(most, 2, 'at most two at once');
        });
    });

    test('upload: a server error fails the file with the status; JSON answers are parsed', function (t) {
        sandbox('<div id="u-box"></div>');
        var errors = [];
        $('#u-box').expUpload({ url: Exp.io.url('expui/no-such-view-' + Date.now()), onFail: function (e) { errors.push(e); } });
        var finished = completed($('#u-box'));
        $('#u-box').data('expUpload').add([file('e.txt', 'e')]);
        return finished.then(function (s) {
            t.equal(s.failed, 1);
            t.ok(errors[0] && errors[0].status >= 400, 'the status: ' + (errors[0] && errors[0].status));
            t.ok(errors[0].message.length > 0, 'a message');
            t.ok($('#u-box .exp-upload-file.is-failed').length === 1, 'the row says so');
        });
    });

    test('upload: dropped files are added; nothing while disabled', function (t) {
        sandbox('<div id="u-box"></div>');
        $('#u-box').expUpload({ url: echo(), multiple: true, drop: true, auto: false });
        var up = $('#u-box').data('expUpload');
        function drop() {
            var dt = new DataTransfer();
            dt.items.add(file('d.txt', 'd'));
            var over = new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true });
            $('#u-box')[0].dispatchEvent(over);
            var e = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });
            $('#u-box')[0].dispatchEvent(e);
            return { over: over, drop: e };
        }
        up.disable();
        drop();
        t.equal(up.files().length, 0, 'disabled: not added');
        t.ok($('#u-box input[type="file"]').prop('disabled'), 'the input is disabled');
        up.enable();
        var ev = drop();
        t.ok(ev.drop.defaultPrevented, 'the browser does not open the file');
        t.equal(up.files().length, 1, 'added');
        t.ok(!$('#u-box').hasClass('is-over'), 'the highlight is gone after the drop');
        up.clear();
        t.equal(up.files().length, 1, 'clear() keeps a waiting file');
    });

    test('upload: data-exp-upload starts it from markup', function (t) {
        sandbox('<div id="u-auto" data-exp-upload=\'{"url": "' + echo() + '", "multiple": true}\'></div>');
        Exp.start(document.getElementById('exp-test-sandbox'));
        var up = $('#u-auto').data('expUpload');
        t.ok(up && up.options.multiple, 'started with its options');
        t.ok($('#u-auto input[type="file"]').prop('multiple'));
    });
}(window, document));
