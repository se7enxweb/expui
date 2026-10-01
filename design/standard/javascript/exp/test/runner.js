/*!
 * Exponential UI (expui) test runner: the unit tests of the Exp modules, in the browser, on a real page.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 *   ExpTest.test('name', async function (t) { t.ok(x); t.equal(a, b); await t.rejects(promise, 'kind'); });
 *
 * Results go into #exp-test-results and window.ExpTestResults ({done, passed, failed, tests: [...]}), which the
 * Playwright check reads. Tests run one after another, in the order they were added.
 */
(function (window, document) {
    'use strict';

    var queue = [];
    var results = window.ExpTestResults = { done: false, passed: 0, failed: 0, tests: [] };

    function Assert(name) { this.name = name; this.count = 0; }
    Assert.prototype.ok = function (value, message) {
        this.count++;
        if (!value) { throw new Error(message || 'expected a true value'); }
    };
    Assert.prototype.equal = function (actual, expected, message) {
        this.count++;
        if (actual !== expected) { throw new Error((message ? message + ': ' : '') + 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
    };
    Assert.prototype.deepEqual = function (actual, expected, message) {
        this.count++;
        var a = JSON.stringify(actual), e = JSON.stringify(expected);
        if (a !== e) { throw new Error((message ? message + ': ' : '') + 'expected ' + e + ', got ' + a); }
    };
    Assert.prototype.throws = function (fn, message) {
        this.count++;
        try { fn(); } catch (e) { return e; }
        throw new Error(message || 'expected an exception');
    };
    /** Awaits a Promise that must reject; kind: the Exp.io.Error kind it must have. */
    Assert.prototype.rejects = function (promise, kind, message) {
        this.count++;
        return promise.then(function () { throw new Error(message || 'expected a rejection'); },
                            function (e) { if (kind && (!e || e.kind !== kind)) { throw new Error((message ? message + ': ' : '') + 'expected kind ' + kind + ', got ' + (e && e.kind) + ' (' + (e && e.message) + ')'); } return e; });
    };

    function row(test) {
        var list = document.getElementById('exp-test-results');
        if (!list) { return; }
        var li = document.createElement('li');
        li.className = test.passed ? 'is-pass' : 'is-fail';
        li.textContent = (test.passed ? 'PASS ' : 'FAIL ') + test.name + (test.passed ? ' (' + test.assertions + ')' : ': ' + test.error) + ' ' + test.ms + ' ms';
        list.appendChild(li);
    }

    function run() {
        var i = 0;
        (function next() {
            if (i >= queue.length) {
                results.done = true;
                var sum = document.getElementById('exp-test-summary');
                if (sum) { sum.textContent = results.passed + ' passed, ' + results.failed + ' failed'; sum.className = results.failed ? 'is-fail' : 'is-pass'; }
                return;
            }
            var item = queue[i++], t = new Assert(item.name), start = Date.now();
            var done = function (error) {
                var test = { name: item.name, passed: !error, error: error ? String(error.message || error) : '', assertions: t.count, ms: Date.now() - start };
                results.tests.push(test);
                results[test.passed ? 'passed' : 'failed']++;
                row(test);
                next();
            };
            var timer = window.setTimeout(function () { done(new Error('timed out after 15 s')); done = function () {}; }, 15000);
            Promise.resolve().then(function () { return item.fn(t); }).then(function () { window.clearTimeout(timer); done(null); },
                                                                         function (e) { window.clearTimeout(timer); done(e); });
        }());
    }

    window.ExpTest = {
        test: function (name, fn) { queue.push({ name: name, fn: fn }); },
        run: run
    };
}(window, document));
