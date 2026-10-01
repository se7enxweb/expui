/* Unit tests of exp/io.js (Exp.io). Run on expui/test; they call ezjsc::time, which anyone may call. */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test;

    test('io: callString builds the ezjscore call', function (t) {
        t.equal(Exp.io.callString('ezjscnode::subtree', [2, 25, 0]), 'ezjscnode::subtree::2::25::0');
        t.equal(Exp.io.callString('ezjsc::time'), 'ezjsc::time', 'no arguments');
        t.equal(Exp.io.callString('ezjsc::time', 'x'), 'ezjsc::time::x', 'one argument');
    });

    test('io: callString refuses bad names and arguments', function (t) {
        t.throws(function () { Exp.io.callString('nofunction'); }, 'a name without ::');
        t.throws(function () { Exp.io.callString('a::b', ['x::y']); }, 'an argument with ::');
        t.throws(function () { Exp.io.callString('a::b', ['x@SEPARATOR$y']); }, 'an argument with the separator');
    });

    test('io: call resolves with the content (POST)', function (t) {
        return Exp.io.call('ezjsc::time').then(function (content) {
            t.ok(content !== undefined && content !== null && String(content) !== '', 'content: ' + content);
        });
    });

    test('io: call with GET', function (t) {
        return Exp.io.call('ezjsc::time', [], { method: 'GET' }).then(function (content) {
            t.ok(String(content) !== '', 'content: ' + content);
        });
    });

    test('io: an unknown server function rejects (server)', function (t) {
        return t.rejects(Exp.io.call('expnosuchclass::nosuchfunction'), 'server').then(function (e) {
            t.ok(e instanceof Exp.io.Error, 'an Exp.io.Error');
            t.ok(e.message.length > 0, 'with a message: ' + e.message);
        });
    });

    test('io: invalid arguments reject (invalid) without a request', function (t) {
        return t.rejects(Exp.io.call('nofunction'), 'invalid');
    });

    test('io: an aborted call rejects (network)', function (t) {
        var c = new AbortController();
        var p = Exp.io.call('ezjsc::time', [], { signal: c.signal });
        c.abort();
        return t.rejects(p, 'network');
    });

    test('io: poll calls until the condition holds', function (t) {
        var ticks = 0;
        return Exp.io.poll('ezjsc::time', [], { every: 50, until: function () { return ticks >= 3; }, onTick: function () { ticks++; } })
            .then(function () { t.equal(ticks, 3, 'three calls'); });
    });

    test('io: poll gives up after max calls', function (t) {
        return t.rejects(Exp.io.poll('ezjsc::time', [], { every: 20, max: 2, until: function () { return false; } }), 'timeout');
    });

    test('io: form posts the fields, a submit button and the token', function (t) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = '<form id="f1" method="post" action="' + Exp.io.url('expui/test/echo') + '">' +
            '<input name="Title" value="Hello"><input type="checkbox" name="Flags[]" value="a" checked><input type="checkbox" name="Flags[]" value="b" checked>' +
            '<button type="submit" name="SaveButton" value="1">Save</button></form>';
        var f = document.getElementById('f1');
        return Exp.io.form(f, { submitter: f.querySelector('button') }).then(function (r) {
            var json = typeof r === 'string' ? JSON.parse(r) : r;
            t.equal(json.method, 'POST', 'POST');
            t.equal(json.fields.Title, 'Hello', 'a field');
            t.deepEqual(json.fields.Flags, ['a', 'b'], 'a list');
            t.equal(json.fields.SaveButton, '1', 'the submit button');
            t.ok(json.token, 'the form token was sent');
        });
    });

    test('io: form refuses something that is not a form', function (t) {
        return t.rejects(Exp.io.form(document.body), 'invalid');
    });

    test('io: url builds site addresses', function (t) {
        t.equal(Exp.io.url('content/view/full/2'), Exp.config.root + 'content/view/full/2');
        t.equal(Exp.io.url('/content/view/full/2'), Exp.config.root + 'content/view/full/2', 'a leading / is dropped');
    });
}(window, document));
