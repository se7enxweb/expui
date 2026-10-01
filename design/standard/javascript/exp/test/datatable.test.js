/*!
 * Exponential UI (expui) — browser tests of exp::datatable ($.fn.expDataTable).
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test, $ = Exp.$;

    function sandbox(html) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = html || '';
        return host;
    }
    function wait(ms) { return new Promise(function (r) { window.setTimeout(r, ms); }); }
    function people() {
        return [
            { id: 1, name: 'Dora', age: 41, prio: 10 }, { id: 2, name: 'adam', age: 9, prio: 20 },
            { id: 3, name: 'Cleo', age: 100, prio: 30 }, { id: 4, name: 'Bert', age: 27, prio: 40 },
            { id: 5, name: 'Emil', age: 33, prio: 50 }
        ];
    }
    var COLS = [{ key: 'id', label: 'ID', sortable: true }, { key: 'name', label: 'Name', sortable: true }, { key: 'age', label: 'Age', sortable: true }];
    function make(options, html) {
        sandbox(html || '<div id="dt"></div>');
        var $el = $('#dt');
        var loaded = new Promise(function (resolve) { $el.one('exp:datatable:load', function (e, d) { resolve(d); }); });
        $el.expDataTable($.extend({ columns: COLS, source: { rows: people() }, paging: { limit: 2 } }, options));
        return loaded.then(function () { return $el.data('expDataTable'); });
    }
    function names() { return $('#dt tbody.exp-dt-body tr td[data-key="name"]').map(function () { return $(this).text(); }).get(); }
    function onceEvent($el, name) { return new Promise(function (r) { $el.one(name, function (e, d) { r(d); }); }); }

    // ---- helpers --------------------------------------------------------------------------------------------

    test('datatable: helpers (date format, numbers, offsets, page links)', function (t) {
        var D = Exp.datatable;
        t.equal(D.formatDate(new Date(2026, 0, 5, 7, 3), '%d.%m.%Y %H:%M'), '05.01.2026 07:03', 'date');
        t.equal(D.formatDate('nonsense', '%d'), '', 'no date');
        t.equal(D.validateNumber('15'), 15); t.equal(D.validateNumber(' 7 '), 7); t.equal(D.validateNumber(''), 0, '"" is 0, as YUI');
        t.equal(D.validateNumber('abc'), undefined, 'not a number');
        t.equal(D.normalizeOffset(10, 12, 25), 0, 'a page boundary');
        t.equal(D.normalizeOffset(30, 100, 25), 25);
        t.equal(D.normalizeOffset(40, 12, 10), 10, 'never past the last page');
        t.deepEqual(D.pageRange(1, 2, 10), [1, 2]);
        t.deepEqual(D.pageRange(10, 30, 10), [5, 14], 'the current page in the middle');
        t.deepEqual(D.pageRange(0, 0, 10), [0, -1], 'no pages');
        t.equal(D.escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    });

    // ---- markup ---------------------------------------------------------------------------------------------

    test('datatable: real table markup, header cells with scope and aria-sort, hidden columns', function (t) {
        return make({ columns: COLS.concat([{ key: 'prio', label: 'Priority', hidden: true }]), sort: { key: 'name', dir: 'asc' } }).then(function (dt) {
            var $t = $('#dt table.exp-dt-table');
            t.equal($t.length, 1, 'a table');
            t.equal($t.find('thead th[scope=col]').length, 4, 'four header cells');
            t.equal($t.find('th[data-key=name]').attr('aria-sort'), 'ascending', 'sorted by name');
            t.equal($t.find('th[data-key=id]').attr('aria-sort'), 'none');
            t.ok($t.find('th[data-key=prio]').prop('hidden'), 'the hidden column\'s header');
            t.ok($t.find('tbody.exp-dt-body td[data-key=prio]').first().prop('hidden'), 'and its cells');
            t.equal($t.find('tbody.exp-dt-body tr').length, 2, 'one page of two');
            t.deepEqual(names(), ['adam', 'Bert'], 'sorted rows');
            t.equal(dt.total, 5);
            t.ok($('#dt [role=status]').length === 1, 'a status region');
        });
    });

    test('datatable: sorting by a header, the event, and the keyboard', function (t) {
        var $el;
        return make().then(function (dt) {
            $el = dt.$el;
            var sorted = onceEvent($el, 'exp:datatable:sort');
            var loaded = onceEvent($el, 'exp:datatable:load');
            $('#dt th[data-key=age] button.exp-dt-sort').trigger('click');
            return Promise.all([sorted, loaded]);
        }).then(function (r) {
            t.deepEqual([r[0].key, r[0].dir], ['age', 'asc'], 'first click: ascending');
            t.deepEqual(names(), ['adam', 'Bert']);
            t.equal($('#dt th[data-key=age]').attr('aria-sort'), 'ascending');
            t.equal($('#dt th[data-key=age] button').attr('title'), 'Click to sort descending', 'says what the next click does');
            var loaded = onceEvent($el, 'exp:datatable:load');
            $('#dt th[data-key=age] button.exp-dt-sort')[0].click();
            return loaded;
        }).then(function () {
            t.equal($('#dt th[data-key=age]').attr('aria-sort'), 'descending', 'second click: descending');
            t.deepEqual(names(), ['Cleo', 'Dora']);
            t.equal($('#dt th[data-key=age] button')[0].tagName, 'BUTTON', 'a real button: Enter and Space sort it');
        });
    });

    test('datatable: a sort goes back to the first page; numbers sort as numbers', function (t) {
        var dt;
        return make({ paging: { limit: 2 } }).then(function (d) {
            dt = d;
            return dt.setPage(3);
        }).then(function () {
            t.equal(dt.page(), 3);
            return dt.sortBy('age', 'desc');
        }).then(function () {
            t.equal(dt.state.offset, 0, 'offset 0 after sorting');
            t.deepEqual(names(), ['Cleo', 'Dora'], '100 before 41');
        });
    });

    // ---- paging ---------------------------------------------------------------------------------------------

    test('datatable: paging alwaysVisible: false hides the pagers while everything fits on one page', function (t) {
        sandbox('<div id="top"></div><div id="dt"></div><div id="bottom"></div>');
        var $el = $('#dt'), loaded = onceEvent($el, 'exp:datatable:load');
        $el.expDataTable({ columns: COLS, source: { rows: people() }, paging: { limit: 50, alwaysVisible: false, containers: ['#bottom'], compact: ['#top'] } });
        return loaded.then(function () {
            t.ok($('#bottom nav').prop('hidden') && $('#top nav').prop('hidden'), 'one page: both pagers hidden');
            t.equal($('#bottom nav').css('display'), 'none', 'and not shown');
            var l = onceEvent($el, 'exp:datatable:load');
            $el.data('expDataTable').setLimit(2);
            return l;
        }).then(function () {
            t.ok(!$('#bottom nav').prop('hidden') && !$('#top nav').prop('hidden'), 'several pages: shown again');
        });
    });

    test('datatable: pagers (full and compact), first/previous/next/last, page links, disabled ends', function (t) {
        sandbox('<div id="top"></div><div id="dt"></div><div id="bottom"></div>');
        var $el = $('#dt'), loaded = onceEvent($el, 'exp:datatable:load');
        $el.expDataTable({ columns: COLS, source: { rows: people() }, paging: { limit: 2, containers: ['#bottom'], compact: ['#top'] } });
        var dt;
        return loaded.then(function () {
            dt = $el.data('expDataTable');
            var pages = $('#bottom .exp-dt-pages > *').map(function () { return $(this).text() + ($(this).attr('aria-current') ? '*' : ''); }).get();
            t.deepEqual(pages, ['1*', '2', '3'], 'page links');
            t.ok($('#bottom .exp-dt-first').prop('disabled') && $('#bottom .exp-dt-prev').prop('disabled'), 'first and previous disabled on page 1');
            t.ok(!$('#bottom .exp-dt-next').prop('disabled'), 'next enabled');
            t.equal($('#top .exp-dt-prev, #top .exp-dt-next').length, 2, 'compact: previous and next only');
            t.equal($('#bottom nav').attr('aria-label'), 'Pages');
            var paged = onceEvent($el, 'exp:datatable:page'), l = onceEvent($el, 'exp:datatable:load');
            $('#top .exp-dt-next').trigger('click');
            return Promise.all([paged, l]);
        }).then(function (r) {
            t.equal(r[0].page, 2, 'the page event');
            t.deepEqual(names(), ['Cleo', 'Bert']);
            var l = onceEvent($el, 'exp:datatable:load');
            $('#bottom .exp-dt-last').trigger('click');
            return l;
        }).then(function () {
            t.deepEqual(names(), ['Emil'], 'the last page');
            t.ok($('#bottom .exp-dt-next').prop('disabled') && $('#bottom .exp-dt-last').prop('disabled'), 'next and last disabled at the end');
            var l = onceEvent($el, 'exp:datatable:load');
            $('#bottom .exp-dt-page[data-page="2"]').trigger('click');
            return l;
        }).then(function () {
            t.equal(dt.page(), 2, 'a page link');
            return dt.setLimit(5);
        }).then(function () {
            t.equal(dt.state.offset, 0, 'rows per page: the offset on a page boundary');
            t.equal($('#dt tbody.exp-dt-body tr').length, 5);
            t.deepEqual($('#bottom .exp-dt-pages > *').map(function () { return $(this).text(); }).get(), ['1']);
        });
    });

    test('datatable: setting the same rows per page or page loads nothing', function (t) {
        var n = 0;
        return make({ source: function (s) { n++; var r = people(); return { rows: r.slice(s.offset, s.offset + s.limit), total: r.length }; } }).then(function (dt) {
            t.equal(n, 1, 'one load');
            return dt.setLimit(2).then(function () { return dt.setPage(1); }).then(function () { t.equal(n, 1, 'still one'); });
        });
    });

    // ---- sources --------------------------------------------------------------------------------------------

    test('datatable: a function source gets the state; empty and error messages', function (t) {
        var seen = null, fail = false;
        return make({ sort: { key: 'name', dir: 'desc' }, empty: 'Nothing here', source: function (s) {
            seen = s;
            if (fail) { return Promise.reject(new Error('boom')); }
            return { rows: [], total: 0 };
        } }).then(function (dt) {
            t.deepEqual([seen.offset, seen.limit, seen.sort.key, seen.sort.dir, seen.filter], [0, 2, 'name', 'desc', ''], 'the state');
            var $m = $('#dt tbody.exp-dt-message');
            t.ok(!$m.prop('hidden'), 'the message shows');
            t.equal($m.text(), 'Nothing here', 'the empty text');
            t.equal($m.find('td').attr('colspan'), '3', 'over every visible column');
            t.equal($('#dt .exp-dt-pages > *').length, 0, 'no page links without rows');
            fail = true;
            var warn = window.console.warn;
            window.console.warn = function () {};
            var err = onceEvent(dt.$el, 'exp:datatable:error');
            dt.load();
            return err.then(function (d) {
                window.console.warn = warn;
                t.equal(d.error.message, 'boom');
                t.equal($m.text(), 'Data error.', 'the error text');
                t.ok($m.find('td').hasClass('exp-dt-error'));
            });
        });
    });

    test('datatable: a url source (GET, the address from the state), parse, and the cache', function (t) {
        var urls = [];
        var spy = function (e, xhr, opts) { if (/ezjscnode::subtree::2::/.test(opts.url)) { urls.push(opts.method + ' ' + opts.url); } };
        $(document).on('ajaxSend', spy);
        var dt;
        return make({ columns: [{ key: 'node_id', label: 'Node', sortable: true }, { key: 'name', label: 'Name', sortable: true }],
            sort: { key: 'name', dir: 'asc' }, paging: { limit: 1 },
            source: { url: function (s) { return Exp.config.call + 'ezjscnode::subtree::2::' + s.limit + '::' + s.offset + '::' + s.sort.key + '::' + (s.sort.dir === 'asc' ? 1 : 0) + '::?ContentType=json'; },
                      parse: function (json) { return { rows: json.content.list, total: json.content.total_count }; }, cache: 20 } }).then(function (d) {
            dt = d;
            t.equal(urls.length, 1, 'one request');
            t.ok(/^GET .*ezjscnode::subtree::2::1::0::name::1::\?ContentType=json$/.test(urls[0]), urls[0]);
            t.ok(dt.total >= 1, 'total from the server: ' + dt.total);
            t.equal($('#dt tbody.exp-dt-body tr').length, 1, 'one row');
            if (dt.total < 2) { return null; }
            return dt.setPage(2).then(function () { return dt.setPage(1); }).then(function () {
                t.equal(urls.length, 2, 'page 1 again came from the cache');
                dt.flushCache();
                return dt.load();
            }).then(function () { t.equal(urls.length, 3, 'after flushCache: asked again'); });
        }).then(function () { $(document).off('ajaxSend', spy); }, function (e) { $(document).off('ajaxSend', spy); throw e; });
    });

    test('datatable: a server function source (Exp.io.call)', function (t) {
        return make({ columns: [{ key: 'time', label: 'Time' }], paging: false,
            source: { fn: 'ezjsc::time', args: function () { return []; }, parse: function (content) { return { rows: [{ time: content }], total: 1 }; } } }).then(function (dt) {
            t.ok($('#dt td[data-key=time]').text().length > 0, 'the server time: ' + $('#dt td[data-key=time]').text());
            t.equal($('#dt .exp-dt-pager').length, 0, 'paging: false, no pager');
        });
    });

    test('datatable: an existing table is enhanced (its rows, client-side sorting)', function (t) {
        sandbox('<table id="dt"><thead><tr><th data-key="n" data-sortable>Name</th><th data-key="v" data-sortable>Value</th></tr></thead>' +
                '<tbody><tr><td>b</td><td data-value="2"><a href="#x">two</a></td></tr><tr><td>a</td><td data-value="10">ten</td></tr><tr><td>c</td><td data-value="1">one</td></tr></tbody></table>');
        var $el = $('#dt'), loaded = onceEvent($el, 'exp:datatable:load');
        $el.expDataTable({ paging: false });
        return loaded.then(function () {
            var dt = $el.data('expDataTable');
            t.ok($el.parent().hasClass('exp-dt-scroll') && $el.parent().parent().hasClass('exp-dt'), 'wrapped (in .exp-dt, inside its sideways scroller)');
            t.equal($el.find('th[data-key=v] button.exp-dt-sort').length, 1, 'sortable header button');
            return dt.sortBy('v', 'asc');
        }).then(function () {
            t.deepEqual($el.find('tbody.exp-dt-body tr').map(function () { return $(this.cells[0]).text(); }).get(), ['c', 'b', 'a'], 'by data-value, as numbers');
            t.equal($el.find('a[href="#x"]').length, 1, 'the cells kept their markup');
        });
    });

    // ---- selection ------------------------------------------------------------------------------------------

    test('datatable: selection checkboxes (name, value, label), select all, invert, shift ranges, the event', function (t) {
        var dt, $el;
        return make({ paging: { limit: 5 }, select: { name: 'Pick[]', value: function (r) { return r.id; }, label: function (r) { return r.name; } } }).then(function (d) {
            dt = d; $el = dt.$el;
            var $c = $('#dt tbody.exp-dt-body input[type=checkbox]');
            t.equal($c.length, 5, 'a checkbox per row');
            t.equal($c.first().attr('name'), 'Pick[]');
            t.equal($c.first().val(), '1');
            t.equal($c.first().attr('aria-label'), 'Select Dora');
            var $all = $('#dt thead input.exp-dt-check-all');
            t.equal($all.length, 1, 'select all in the header');
            var ev = onceEvent($el, 'exp:datatable:select');
            $all[0].click();
            return ev;
        }).then(function (d) {
            t.equal(d.count, 5, 'all selected');
            t.ok($('#dt tbody.exp-dt-body tr').first().hasClass('exp-dt-selected'), 'the row says it is selected');
            dt.invert();
            t.equal(dt.selected().length, 0, 'inverted: none');
            var $c = $('#dt tbody.exp-dt-body input[type=checkbox]');
            $c[1].click();
            $c[3].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
            t.deepEqual(dt.selected().map(function (r) { return r.id; }), [2, 3, 4], 'shift-click checks the range');
            t.ok($('#dt thead input.exp-dt-check-all').prop('indeterminate'), 'select all is indeterminate');
            dt.selectAll(false);
            t.equal(dt.selected().length, 0);
        });
    });

    test('datatable: selection without header box or ranges, on a column of the caller', function (t) {
        return make({ paging: { limit: 5 }, columns: [{ key: 'checkbox', label: '' }].concat(COLS),
                      select: { key: 'checkbox', name: 'DeleteIDArray[]', className: 'my-check', value: function (r) { return r.id; }, header: false, ranges: false } }).then(function (dt) {
            t.equal($('#dt thead input').length, 0, 'no header box');
            t.equal($('#dt td[data-key=checkbox] input.my-check').length, 5, 'in the caller\'s column, with its class');
            var $c = $('#dt tbody.exp-dt-body input[type=checkbox]');
            $c[0].click();
            $c[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
            t.equal(dt.selected().length, 2, 'shift-click toggles just one');
        });
    });

    // ---- column toggling ------------------------------------------------------------------------------------

    test('datatable: columnToggle hides what is not shown, showColumn/hideColumn, save', function (t) {
        var saved = null;
        return make({ columns: COLS.concat([{ key: 'prio', label: 'Priority' }]), columnToggle: { shown: ['name', 'prio'], save: function (keys) { saved = keys; } } }).then(function (dt) {
            t.deepEqual(dt.visibleColumns(), ['name', 'prio'], 'only the shown ones');
            dt.showColumn('age');
            t.ok(!$('#dt th[data-key=age]').prop('hidden') && !$('#dt td[data-key=age]').first().prop('hidden'), 'shown');
            dt.hideColumn('name');
            t.ok($('#dt td[data-key=name]').first().prop('hidden'), 'hidden');
            t.equal($('#dt tbody.exp-dt-message td').attr('colspan'), String(dt.visibleColumns().length), 'the message spans the visible columns');
            var ev = onceEvent(dt.$el, 'exp:datatable:columns');
            dt.saveColumns(['age', 'prio']);
            return ev.then(function (d) { t.deepEqual(saved, ['age', 'prio'], 'save'); t.deepEqual(d.shown, ['age', 'prio'], 'the event'); });
        });
    });

    test('datatable: columnToggle with a preference', function (t) {
        var saved = new Promise(function (resolve) {
            var h = function (e, d) { if (d.name === 'exp_test_dt_columns') { Exp.off('exp:prefs:set', h); resolve(d.value); } };
            Exp.on('exp:prefs:set', h);
        });
        return make({ columnToggle: { pref: 'exp_test_dt_columns' } }).then(function (dt) {
            dt.saveColumns(['id', 'name']);
            return saved;
        }).then(function (v) { t.equal(v, 'id,name', 'saved as a comma list'); });
    });

    // ---- Table options --------------------------------------------------------------------------------------

    test('datatable: Table options dialog: rows per page, a custom number, columns, Escape', function (t) {
        sandbox('<div id="bar"></div><div id="dt"></div><div id="opts"></div>');
        var $el = $('#dt'), loaded = onceEvent($el, 'exp:datatable:load'), limits = [], cols = null, alerts = [];
        $el.expDataTable({ columns: COLS.concat([{ key: 'prio', label: 'Priority' }]), source: { rows: people() }, paging: { limit: 2 }, actionsContainer: '#bar',
            columnToggle: { shown: ['id', 'name', 'age'], save: function (k) { cols = k; } },
            tableOptions: { button: { id: 'my-opts', label: 'Options' }, container: '#opts', title: 'Table options', close: 'Close',
                limits: { legend: 'Rows', items: [{ id: 1, count: 2 }, { id: 2, count: 4 }], onSelect: function (item) { limits.push(item.id); },
                          custom: { label: 'Custom', placeholder: 'Enter number', max: 100, invalid: 'Bad number' } },
                columns: { legend: 'Columns' } } });
        var dt, d, alert = window.alert;
        return loaded.then(function () {
            dt = $el.data('expDataTable');
            t.equal($('#my-opts-button').text(), 'Options', 'the button');
            $('#my-opts-button').trigger('click');
            d = $('#opts dialog.exp-dt-dialog')[0];
            t.ok(d && d.open, 'a native dialog, open');
            t.equal(d.getAttribute('aria-labelledby'), $(d).find('.exp-dt-dialog-title').attr('id'), 'labelled by its title');
            t.deepEqual($(d).find('legend').map(function () { return $(this).text(); }).get(), ['Rows', 'Columns']);
            t.ok($('#table-option-row-btn-1').prop('checked'), 'the current rows per page is checked');
            t.deepEqual($(d).find('input[name=TableOptionColumn]').map(function () { return this.value + (this.checked ? '+' : '-'); }).get(), ['id+', 'name+', 'age+', 'prio-']);
            var l = onceEvent($el, 'exp:datatable:load');
            $('#table-option-row-btn-2')[0].click();
            return l;
        }).then(function () {
            t.equal(dt.state.limit, 4, 'four per page');
            t.deepEqual(limits, [2], 'onSelect with the item');
            var l = onceEvent($el, 'exp:datatable:load');
            $('#table-option-custom-input').val('3').trigger($.Event('keydown', { key: 'Enter' }));
            return l;
        }).then(function () {
            t.equal(dt.state.limit, 3, 'a custom number');
            t.ok($('#table-option-custom-radio').prop('checked'), 'its radio');
            t.deepEqual(limits, [2], 'not saved');
            window.alert = function (m) { alerts.push(m); };
            $('#table-option-custom-input').val('0').trigger($.Event('keydown', { key: 'Enter' }));
            window.alert = alert;
            t.deepEqual(alerts, ['Bad number'], 'an invalid number is refused');
            t.equal($('#table-option-custom-input').val(), '', 'and cleared');
            $('#table-option-col-btn-3')[0].click();
            t.deepEqual(cols, ['id', 'name', 'age', 'prio'], 'a column shown and saved');
            t.ok(!$('#dt th[data-key=prio]').prop('hidden'));
            $(d).trigger($.Event('keydown', { key: 'Escape' }));
            t.ok(!d.open, 'Escape closes it');
            dt.openOptions();
            t.ok(d.open, 'opened again, the same dialog');
            $(d).find('.exp-dt-dialog-close').trigger('click');
            t.ok(!d.open, 'the Close button closes it');
        }, function (e) { window.alert = alert; throw e; });
    });

    // ---- action menus ---------------------------------------------------------------------------------------

    test('datatable: a menu button: ARIA, arrow keys, Escape, choosing an item, disabled items', function (t) {
        var chosen = [];
        return make({ actions: [{ id: 'm-sel', label: 'Select', menu: [
            { id: 'm-a', label: 'All', value: 1 }, { id: 'm-b', label: 'None', value: 0, disabled: true }, { id: 'm-c', label: 'Invert', value: 2 }
        ], onSelect: function (item) { chosen.push(item.value); } }] }).then(function () {
            var $b = $('#m-sel-button'), $m = $('#m-sel-menu');
            t.equal($b.attr('aria-haspopup'), 'menu');
            t.equal($b.attr('aria-expanded'), 'false');
            t.ok($m.prop('hidden'), 'closed');
            t.equal($('#dt .exp-dt-toolbar[role=toolbar]').length, 1, 'a toolbar');
            $b.trigger($.Event('keydown', { key: 'ArrowDown' }));
            t.ok(!$m.prop('hidden') && $b.attr('aria-expanded') === 'true', 'ArrowDown opens it');
            t.equal(document.activeElement, $('#m-a [role=menuitem]')[0], 'and focuses the first item');
            $m.trigger($.Event('keydown', { key: 'ArrowDown' }));
            t.equal(document.activeElement, $('#m-b [role=menuitem]')[0], 'down');
            t.equal($('#m-b [role=menuitem]').attr('aria-disabled'), 'true', 'disabled item');
            $m.trigger($.Event('keydown', { key: 'End' }));
            t.equal(document.activeElement, $('#m-c [role=menuitem]')[0], 'End');
            $m.trigger($.Event('keydown', { key: 'ArrowDown' }));
            t.equal(document.activeElement, $('#m-a [role=menuitem]')[0], 'wraps around');
            $m.trigger($.Event('keydown', { key: 'i' }));
            t.equal(document.activeElement, $('#m-c [role=menuitem]')[0], 'type-ahead');
            $m.trigger($.Event('keydown', { key: 'Escape' }));
            t.ok($m.prop('hidden'), 'Escape closes it');
            t.equal(document.activeElement, $b[0], 'and focus goes back to the button');
            $b.trigger('click');                                  // as with the mouse: the focus stays on the button
            t.ok(!$m.prop('hidden'), 'a click opens it');
            $b.trigger($.Event('keydown', { key: 'Escape' }));
            t.ok($m.prop('hidden'), 'Escape on the button closes a menu opened with the mouse');
            $b.trigger('click');
            $('#m-b [role=menuitem]').trigger('click');
            t.deepEqual(chosen, [], 'a disabled item does nothing');
            $('#m-c [role=menuitem]').trigger('click');
            t.deepEqual(chosen, [2], 'an item calls onSelect');
            t.ok($m.prop('hidden'), 'and closes the menu');
        });
    });

    test('datatable: menus built when opened, groups, plain buttons, disabled buttons, clicking outside', function (t) {
        var n = 0, clicked = 0, dt;
        return make({ actions: [
            { id: 'm-more', label: 'More', menu: function (table) { n++; return table.selected().length ? [{ label: 'Remove' }] : [{ label: 'Select first', disabled: true }]; } },
            { id: 'm-new', label: 'New', menu: [{ group: 'Content', items: [{ label: 'Article', value: 2 }, { label: '<b>Folder</b>', html: true, value: 1 }] }] },
            { id: 'm-push', label: 'Push', onClick: function () { clicked++; } },
            { id: 'm-off', label: 'Off', disabled: true, onClick: function () { clicked += 10; } }
        ], select: true }).then(function (d) {
            dt = d;
            $('#m-more-button').trigger('click');
            t.equal(n, 1, 'built when opened');
            t.equal($('#m-more-menu [role=menuitem]').text(), 'Select first');
            $('#m-more-button').trigger('click');
            dt.selectAll(true);
            $('#m-more-button').trigger('click');
            t.equal($('#m-more-menu [role=menuitem]').text(), 'Remove', 'and again with the selection');
            $(document.body).trigger('mousedown');
            t.ok($('#m-more-menu').prop('hidden'), 'a click outside closes it');
            $('#m-new-button').trigger('click');
            t.equal($('#m-new-menu .exp-dt-menu-group').text(), 'Content', 'a group title');
            t.equal($('#m-new-menu [role=group]').attr('aria-labelledby'), $('#m-new-menu .exp-dt-menu-group').attr('id'), 'labelling its group');
            t.equal($('#m-new-menu [role=menuitem] b').text(), 'Folder', 'html labels');
            $('#m-push-button').trigger('click');
            t.ok($('#m-new-menu').prop('hidden'), 'opening another closes this one');
            $('#m-off-button').trigger('click');
            t.equal(clicked, 1, 'a push button; a disabled one does nothing');
            t.ok($('#m-off-button').prop('disabled'));
            dt.action('m-off').setDisabled(false);
            $('#m-off-button').trigger('click');
            t.equal(clicked, 11, 'enabled again');
        });
    });

    // ---- inline editing -------------------------------------------------------------------------------------

    test('datatable: inline editing: click, Enter saves (at once in the cell), Escape cancels, invalid keeps it open', function (t) {
        var saves = [], dt, edits = [];
        return make({ paging: { limit: 5 }, columns: COLS.concat([{ key: 'prio', label: 'Priority', sortable: true, editable: 'number' }]),
            inlineEdit: { canEdit: function (r) { return r.id !== 5; }, save: function (row, key, value) { saves.push([row.id, key, value]); return Promise.resolve(); } } }).then(function (d) {
            dt = d;
            dt.$el.on('exp:datatable:edit', function (e, x) { edits.push([x.key, x.value, x.old]); });
            var $cell = $('#dt tbody.exp-dt-body tr').first().find('td[data-key=prio]');
            t.ok($cell.hasClass('exp-dt-editable') && $cell.attr('tabindex') === '0', 'an editable cell, reachable with Tab');
            t.ok(!$('#dt tbody.exp-dt-body tr').eq(4).find('td[data-key=prio]').hasClass('exp-dt-editable'), 'not where canEdit says no');
            $cell.trigger('click');
            var $in = $cell.find('input.exp-dt-editor');
            t.equal($in.length, 1, 'the editor');
            t.equal($in.val(), '10');
            t.equal(document.activeElement, $in[0], 'focused');
            $in.val('15').trigger($.Event('keydown', { key: 'Enter' }));
            t.equal($cell.text(), '15', 'the new value at once');
            t.deepEqual(saves, [[1, 'prio', 15]], 'saved as a number');
            t.deepEqual(edits, [['prio', 15, 10]], 'the edit event');
            $cell.trigger('click');
            $in = $cell.find('input.exp-dt-editor');
            $in.val('99').trigger($.Event('keydown', { key: 'Escape' }));
            t.equal($cell.text(), '15', 'Escape: unchanged');
            t.equal($cell.find('input').length, 0, 'closed');
            t.equal(saves.length, 1, 'nothing saved');
            $cell.trigger('click');
            $in = $cell.find('input.exp-dt-editor');
            $in.val('abc').trigger($.Event('keydown', { key: 'Enter' }));
            t.equal($cell.find('input.exp-dt-editor').val(), '15', 'invalid: the old value back');
            t.equal(saves.length, 1, 'nothing saved');
            $in.trigger($.Event('keydown', { key: 'Escape' }));
            $cell[0].focus();
            $cell.trigger($.Event('keydown', { key: 'Enter' }));
            t.equal($cell.find('input.exp-dt-editor').length, 1, 'Enter on the focused cell opens the editor');
            $cell.find('input').trigger($.Event('keydown', { key: 'Escape' }));
        });
    });

    test('datatable: inline editing: leaving the field saves; reload when sorted by it; a failure puts the value back', function (t) {
        var calls = 0, loads = 0, fail = false, dt;
        return make({ paging: { limit: 5 }, sort: { key: 'prio', dir: 'asc' }, columns: COLS.concat([{ key: 'prio', label: 'Priority', sortable: true, editable: 'number' }]),
            inlineEdit: { save: function () { calls++; return fail ? Promise.reject(new Error('no')) : Promise.resolve(); } } }).then(function (d) {
            dt = d;
            dt.$el.on('exp:datatable:load', function () { loads++; });
            var $cell = $('#dt tbody.exp-dt-body tr').first().find('td[data-key=prio]');
            $cell.trigger('click');
            $cell.find('input').val('12');
            $('#exp-test-input')[0].focus();
            return wait(50).then(function () {
                t.equal(calls, 1, 'saved when the field lost focus');
                return wait(50);
            }).then(function () {
                t.equal(loads, 1, 'reloaded: sorted by the edited column');
                fail = true;
                var warn = window.console.warn;
                window.console.warn = function () {};
                $cell = $('#dt tbody.exp-dt-body tr').first().find('td[data-key=prio]');
                var before = $cell.text(), err = onceEvent(dt.$el, 'exp:datatable:error');
                $cell.trigger('click');
                $cell.find('input').val('77').trigger($.Event('keydown', { key: 'Enter' }));
                return err.then(function () {
                    window.console.warn = warn;
                    t.equal($cell.text(), before, 'the old value back after a failure');
                });
            });
        });
    });

    test('datatable: inline editing through a server function (Exp.io.call with data)', function (t) {
        var sent = null;
        var spy = function (e, xhr, opts) { if (/ezjscore\/call/.test(opts.url) && /ezjsc%3A%3Atime/.test(String(opts.data))) { sent = String(opts.data); } };
        $(document).on('ajaxSend', spy);
        return make({ paging: { limit: 5 }, columns: COLS.concat([{ key: 'prio', label: 'Priority', editable: 'number' }]),
            inlineEdit: { fn: 'ezjsc::time', data: function (row, key, value) { return { PriorityID: [row.id], Priority: [value] }; } } }).then(function (dt) {
            var done = new Promise(function (r) { $(document).one('ajaxComplete', function () { r(); }); });
            var $cell = $('#dt tbody.exp-dt-body tr').first().find('td[data-key=prio]');
            $cell.trigger('click');
            $cell.find('input').val('5').trigger($.Event('keydown', { key: 'Enter' }));
            return done;
        }).then(function () {
            $(document).off('ajaxSend', spy);
            t.ok(sent && /PriorityID%5B%5D=1/.test(sent) && /Priority%5B%5D=5/.test(sent), 'the fields: ' + sent);
            t.ok(/ezxform_token=/.test(sent), 'with the form token');
        }, function (e) { $(document).off('ajaxSend', spy); throw e; });
    });

    // ---- filter, keyboard, plugin --------------------------------------------------------------------------

    test('datatable: filter: an input, debounced, back to the first page', function (t) {
        var dt;
        return make({ filter: { delay: 30, attrs: { id: 'dt-filter' } } }).then(function (d) {
            dt = d;
            t.equal($('#dt-filter').attr('aria-label'), 'Filter', 'a labelled input');
            return dt.setPage(2);
        }).then(function () {
            var l = onceEvent(dt.$el, 'exp:datatable:load');
            $('#dt-filter').val('E').trigger('input');
            return l;
        }).then(function () {
            t.equal(dt.state.filter, 'E');
            t.equal(dt.state.offset, 0, 'the first page');
            t.equal(dt.total, 3, 'Dora? no; Cleo, Bert, Emil match "e"');
        });
    });

    test('datatable: keyboard: arrow keys move between the rows\' controls', function (t) {
        return make({ paging: { limit: 5 }, select: true }).then(function () {
            var $c = $('#dt tbody.exp-dt-body input[type=checkbox]');
            $c[0].focus();
            $c.eq(0).trigger($.Event('keydown', { key: 'ArrowDown' }));
            t.equal(document.activeElement, $c[1], 'down');
            $c.eq(1).trigger($.Event('keydown', { key: 'ArrowUp' }));
            t.equal(document.activeElement, $c[0], 'up');
            $c.eq(0).trigger($.Event('keydown', { key: 'End', ctrlKey: true }));
            t.equal(document.activeElement, $c[4], 'ctrl+End: the last row');
        });
    });

    test('datatable: $.fn.expDataTable methods, setting up again, data-exp-datatable', function (t) {
        return make().then(function (dt) {
            t.equal($('#dt').expDataTable('page'), 1, 'a method through the plugin');
            t.equal($('#dt').data('expDataTable'), dt, 'the instance');
            var again = onceEvent($('#dt'), 'exp:datatable:load');
            $('#dt').expDataTable({ columns: COLS, source: { rows: people() }, paging: { limit: 3 } });
            return again;
        }).then(function () {
            t.equal($('#dt tbody.exp-dt-body tr').length, 3, 'set up again with new options');
            t.equal($('#dt table').length, 1, 'one table');
            sandbox('<table id="dd" data-exp-datatable=\'{"paging": false}\'><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
            Exp.start(document.getElementById('exp-test-sandbox'), ['datatable']);
            t.ok($('#dd').data('expDataTable'), 'started from data-exp-datatable');
            $('#dd').data('expDataTable').destroy();
            t.ok(!$('#dd').data('expDataTable'), 'destroyed');
        });
    });

    test('datatable: Exp.on hears the table events', function (t) {
        var seen = [];
        var h = function (e, d) { seen.push(d.table && d.table.id); };
        Exp.on('exp:datatable:load', h);
        return make().then(function () {
            Exp.off('exp:datatable:load', h);
            t.ok(seen.indexOf('dt') !== -1, 'with the table element');
            sandbox('');
        });
    });
}(window, document));
