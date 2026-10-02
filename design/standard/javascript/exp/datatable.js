/*!
 * Exponential UI (expui) datatable — sortable, paged tables with selection, column toggling, inline editing and
 * action menus, on jQuery 4.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::datatable after exp::core (and exp::io for server functions). The admin tables' data table stack
 * (DataTable, Paginator, TextboxCellEditor, DataSource / XHRDataSource, Button, SimpleDialog, Cookie):
 *
 *   $(el).expDataTable({
 *       columns:  [{ key: 'name', label: 'Name', sortable: true, render: function (row) {}, editable: 'number' }],
 *       source:   { url: function (state) {}, parse: function (json) { return { rows, total }; } }
 *                 | { fn: 'class::function', args: function (state) {}, parse } | { rows: [...] } | { dom: true }
 *                 | function (state) { return Promise.resolve({ rows, total }); },
 *       paging:   { limit: 25, containers: ['#bpg'], compact: ['#tpg'] },
 *       sort:     { key: 'priority', dir: 'asc' },
 *       select:   { key: 'checkbox', name: 'DeleteIDArray[]', value: function (row) {} },
 *       columnToggle: { shown: ['name'], save: function (keys) {} } | { pref: 'my_columns' },
 *       inlineEdit:   { canEdit: function (row) {}, save: function (row, key, value) {} } | { fn: 'class::function', data },
 *       actions:  [{ id: 'my-select', label: 'Select', menu: [...] }],
 *       tableOptions: { button: { id, label }, limits: { items: [{ id: 1, count: 10 }] }, columns: {} },
 *       filter:   { container: '#filter', delay: 400 },
 *       keyboard: true, empty: 'No records found.', loading: 'Loading...'
 *   });
 *   $(el).data('expDataTable')            the instance: load(), reload(), setPage(), setLimit(), sortBy(), ...
 *   events on the element and through Exp.on(): exp:datatable:load, :sort, :page, :filter, :select, :edit, :invalid, :columns, :options, :error
 *
 * The full reference is doc/modules/datatable.md.
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var nextId = 0;
    function uid(prefix) { nextId += 1; return (prefix || 'exp-dt') + '-' + nextId; }
    function t(text, params) { return Exp.i18n(text, params); }
    function isFn(f) { return typeof f === 'function'; }
    function trim(value) { return String(value).replace(/^\s+|\s+$/g, ''); }
    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function pad(n, w) { n = String(n); while (n.length < (w || 2)) { n = '0' + n; } return n; }

    /** A Date (or a timestamp in ms) as strftime-like text: %d %m %Y %y %H %M %S %e %%. */
    function formatDate(value, format) {
        var d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) { return ''; }
        return String(format || '%Y-%m-%d %H:%M').replace(/%([dmYyHMSe%])/g, function (all, c) {
            switch (c) {
            case 'd': return pad(d.getDate());
            case 'e': return (d.getDate() < 10 ? ' ' : '') + d.getDate();
            case 'm': return pad(d.getMonth() + 1);
            case 'Y': return String(d.getFullYear());
            case 'y': return pad(d.getFullYear() % 100);
            case 'H': return pad(d.getHours());
            case 'M': return pad(d.getMinutes());
            case 'S': return pad(d.getSeconds());
            default: return '%';
            }
        });
    }

    /** The value as a number, or undefined when it is not one. */
    function validateNumber(value) {
        var n = value * 1;
        return typeof n === 'number' && isFinite(n) ? n : undefined;
    }

    /** The offset rule: a page boundary, and never past the last page. */
    function normalizeOffset(offset, total, limit) {
        if (offset <= 0 || total === 0) { return 0; }
        if (total === null || total > offset) { return offset - (offset % limit); }
        return total - (total % limit || limit);
    }

    /** The page numbers shown around the current one (the classic paginator's range). */
    function pageRange(current, pages, links) {
        if (!current || links === 0 || pages === 0) { return [0, -1]; }
        links = Math.min(links, pages);
        var start = Math.max(1, Math.ceil(current - (links / 2)));
        var end = Math.min(pages, start + links - 1);
        start = Math.max(1, start - (links - (end - start + 1)));
        return [start, end];
    }

    function compareValues(a, b) {
        var na = typeof a === 'number' ? a : (a !== null && a !== '' && !isNaN(a) ? Number(a) : NaN);
        var nb = typeof b === 'number' ? b : (b !== null && b !== '' && !isNaN(b) ? Number(b) : NaN);
        if (!isNaN(na) && !isNaN(nb)) { return na - nb; }
        if (a instanceof Date && b instanceof Date) { return a - b; }
        return String(a === null || a === undefined ? '' : a).localeCompare(String(b === null || b === undefined ? '' : b));
    }

    function editableType(column) {
        var e = column.editable;
        if (!e) { return null; }
        if (e === true) { return { type: 'text' }; }
        if (typeof e === 'string') { return { type: e }; }
        return $.extend({ type: 'text' }, e);
    }

    // ---- the menu buttons of the toolbar --------------------------------------------------------------------

    /**
     * One button with a menu (or a plain button): the admin's button markup ids, an ARIA menu, arrow keys, Home, End,
     * type-ahead, Escape and Tab close it.
     */
    function MenuButton(table, def) {
        var self = this;
        this.table = table;
        this.def = def;
        this.id = def.id || uid('exp-dt-action');
        this.$wrap = $('<span class="exp-dt-action"></span>').attr('id', this.id);
        if (def.className) { this.$wrap.addClass(def.className); }
        this.$button = $('<button type="button" class="exp-dt-button"></button>').attr('id', this.id + '-button');
        if (def.html) { this.$button.html(def.label); } else { this.$button.text(def.label || ''); }
        if (def.title) { this.$button.attr('title', def.title); }
        this.$wrap.append(this.$button);
        this.$group = $('<span class="exp-dt-action-group"></span>').append(this.$wrap);
        this.hasMenu = !!def.menu;
        if (this.hasMenu) {
            this.$wrap.addClass('exp-dt-menu-button');
            this.$menu = $('<ul class="exp-dt-menu" role="menu" hidden="hidden"></ul>').attr({ id: this.id + '-menu', 'aria-labelledby': this.id + '-button' });
            this.$button.attr({ 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': this.id + '-menu' });
            this.$group.append(this.$menu);
            this.$menu.on('click', '[role=menuitem]', function (e) { e.preventDefault(); self.choose($(this)); });
            this.$menu.on('keydown', function (e) { self.menuKey(e); });
            this.$button.on('keydown', function (e) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    self.open(e.key === 'ArrowUp' ? 'last' : 'first');
                } else if (e.key === 'Escape' && self.isOpen()) {
                    // opened with the mouse, the focus stays on the button
                    e.preventDefault(); e.stopPropagation();
                    self.close(true);
                }
            });
        }
        this.$button.on('click', function (e) {
            e.preventDefault();
            if (self.disabled()) { return; }
            if (self.hasMenu) { if (self.isOpen()) { self.close(); } else { self.open(e.detail === 0 ? 'first' : null); } }
            else { table.closeMenus(self); if (isFn(def.onClick)) { def.onClick.call(table, table, e); } }
        });
        this.setDisabled(!!def.disabled);
    }
    MenuButton.prototype.disabled = function () { return this.$button.prop('disabled'); };
    MenuButton.prototype.setDisabled = function (on) {
        this.$button.prop('disabled', !!on);
        this.$wrap.toggleClass('exp-dt-action-disabled', !!on);
        if (on) { this.close(); }
    };
    MenuButton.prototype.isOpen = function () { return this.hasMenu && !this.$menu.prop('hidden'); };
    MenuButton.prototype.items = function () {
        var m = this.def.menu;
        return (isFn(m) ? m.call(this.table, this.table) : m) || [];
    };
    MenuButton.prototype.render = function () {
        var $menu = this.$menu.empty(), self = this;
        var appendItem = function ($list, item) {
            var $li = $('<li role="none" class="exp-dt-menuitem"></li>');
            if (item.id) { $li.attr('id', item.id); }
            var $b = $('<button type="button" role="menuitem" tabindex="-1"></button>');
            if (item.html) { $b.html(item.label); } else { $b.text(item.label === undefined ? '' : item.label); }
            if (item.disabled) { $b.attr('aria-disabled', 'true'); $li.addClass('exp-dt-menuitem-disabled'); }
            $b.data('expItem', item);
            $list.append($li.append($b));
        };
        this.items().forEach(function (entry) {
            if (entry && entry.items) {
                var gid = uid(self.id + '-group');
                var $g = $('<li role="none" class="exp-dt-menu-groupwrap"></li>');
                var $list = $('<ul role="group"></ul>').attr('aria-labelledby', gid);
                $g.append($('<span class="exp-dt-menu-group"></span>').attr('id', gid).text(entry.group || ''), $list);
                entry.items.forEach(function (item) { appendItem($list, item); });
                $menu.append($g);
            } else if (entry) {
                appendItem($menu, entry);
            }
        });
    };
    MenuButton.prototype.menuItems = function () { return this.$menu.find('[role=menuitem]'); };
    MenuButton.prototype.open = function (focus) {
        if (!this.hasMenu || this.disabled()) { return; }
        this.table.closeMenus(this);
        this.render();
        this.$menu.prop('hidden', false);
        this.$button.attr('aria-expanded', 'true');
        this.$wrap.addClass('exp-dt-menu-open');
        var items = this.menuItems();
        if (items.length) {
            var target = focus === 'last' ? items.last() : items.first();
            items.attr('tabindex', '-1');
            target.attr('tabindex', '0');
            if (focus) { target[0].focus(); }
        }
        var self = this;
        $(document).off('mousedown.expdtmenu' + this.id).on('mousedown.expdtmenu' + this.id, function (e) {
            if (!self.$group[0].contains(e.target)) { self.close(); }
        });
        if (isFn(this.def.onOpen)) { this.def.onOpen.call(this.table, this.table); }
    };
    MenuButton.prototype.close = function (focusButton) {
        if (!this.hasMenu || this.$menu.prop('hidden')) { return; }
        this.$menu.prop('hidden', true);
        this.$button.attr('aria-expanded', 'false');
        this.$wrap.removeClass('exp-dt-menu-open');
        $(document).off('mousedown.expdtmenu' + this.id);
        if (focusButton) { this.$button[0].focus(); }
    };
    MenuButton.prototype.choose = function ($b) {
        var item = $b.data('expItem');
        if (!item || item.disabled) { return; }
        this.close(true);
        var handler = isFn(item.onSelect) ? item.onSelect : this.def.onSelect;
        if (isFn(handler)) { handler.call(this.table, item, this.table); }
    };
    MenuButton.prototype.menuKey = function (e) {
        var items = this.menuItems(), i = items.index(document.activeElement), next = null;
        switch (e.key) {
        case 'ArrowDown': next = items.eq((i + 1) % items.length); break;
        case 'ArrowUp': next = items.eq((i - 1 + items.length) % items.length); break;
        case 'Home': next = items.first(); break;
        case 'End': next = items.last(); break;
        case 'Escape': e.preventDefault(); e.stopPropagation(); this.close(true); return;
        case 'Tab': this.close(); return;
        case 'Enter':
        case ' ':
            if (i !== -1) { e.preventDefault(); this.choose(items.eq(i)); }
            return;
        default:
            if (e.key && e.key.length === 1 && /\S/.test(e.key)) {
                var key = e.key.toLowerCase(), n = items.length;
                for (var k = 1; k <= n; k++) {
                    var cand = items.eq((i + k) % n);
                    if (cand.text().replace(/^\s+/, '').charAt(0).toLowerCase() === key) { next = cand; break; }
                }
            }
        }
        if (next && next.length) {
            e.preventDefault();
            items.attr('tabindex', '-1');
            next.attr('tabindex', '0')[0].focus();
        }
    };

    // ---- the table -------------------------------------------------------------------------------------------

    var DEFAULTS = {
        columns: null,
        source: null,
        rowKey: null,
        paging: {},
        sort: null,
        select: null,
        columnToggle: null,
        inlineEdit: null,
        actions: null,
        actionsContainer: null,
        tableOptions: null,
        filter: null,
        keyboard: true,
        empty: null,
        loading: null,
        error: null,
        caption: '',
        tableClass: '',
        dateFormat: '%Y-%m-%d %H:%M',
        onLoad: null,
        onRender: null
    };

    function DataTable($el, options) {
        this.$el = $el;
        this.el = $el[0];
        this.o = $.extend({}, DEFAULTS, options || {});
        this.id = this.el.id || uid();
        this.cache = {};
        this.cacheOrder = [];
        this.seq = 0;
        this.rowsData = [];
        this.total = 0;
        this.menus = [];
        this.lastChecked = null;
        this.editing = null;
        this.init();
    }

    DataTable.prototype.init = function () {
        var o = this.o, self = this;
        var p = this.paging = $.extend({ limit: 25, offset: 0, pageLinks: 10, containers: null, compact: null, alwaysVisible: true,
                                         labels: {} }, o.paging === false ? { off: true } : o.paging || {});
        p.labels = $.extend({ first: '&laquo;', prev: '&lsaquo;', next: '&rsaquo;', last: '&raquo;' }, p.labels);
        this.texts = {
            empty: o.empty !== null ? o.empty : t('No records found.'),
            loading: o.loading !== null ? o.loading : t('Loading...'),
            error: o.error !== null ? o.error : t('Data error.')
        };

        // the table: the element itself when it is one (its header and rows give the columns and data), else built
        if (this.el.tagName === 'TABLE') {
            this.$table = this.$el;
            this.$root = $('<div class="exp-dt"></div>').insertBefore(this.$table).append(this.$table);
            if (!o.columns) { o.columns = this.columnsFromMarkup(); }
            if (!o.source) { o.source = { dom: true }; }
        } else {
            this.$root = this.$el.addClass('exp-dt').empty();
            this.$table = $('<table></table>').appendTo(this.$root);
        }
        this.$table.addClass('exp-dt-table').addClass(o.tableClass || '');
        // a table wider than its column scrolls inside it instead of running over the next column
        this.$scroll = $('<div class="exp-dt-scroll"></div>').insertBefore(this.$table).append(this.$table);
        this.columns = (o.columns || []).map(function (c) { return $.extend({ sortable: false, hidden: false }, c); });

        // the selection column
        var sel = this.select = o.select ? $.extend({ key: 'select', name: '', className: 'exp-dt-check', value: null,
                                                         label: null, header: true, ranges: true }, o.select === 'checkbox' || o.select === true ? {} : o.select) : null;
        if (sel && !this.column(sel.key)) { this.columns.unshift({ key: sel.key, label: '', sortable: false }); }
        // the order the columns were defined in: Table options lists them so, whatever order they are shown in
        this.defOrder = this.columns.slice();

        // shown columns from columnToggle: only the ones with a label can be hidden; ordered: true also puts the
        // shown ones in the order of the list
        var ct = o.columnToggle;
        if (ct) {
            var shown = ct.shown;
            if (!shown && ct.pref) {
                var v = Exp.prefs.get(ct.pref, null);
                shown = v ? String(v).split(',') : null;
            }
            if (shown && shown.length) {
                this.columns.forEach(function (c) { if (c.label && shown.indexOf(c.key) === -1) { c.hidden = true; } });
                if (ct.ordered) { this.applyOrder(shown); }
            }
            this.shownKeys = shown || null;
        }

        this.state = { offset: 0, limit: p.off ? null : Number(p.limit) || 25, sort: o.sort ? { key: o.sort.key, dir: o.sort.dir === 'desc' ? 'desc' : 'asc' } : null, filter: '' };
        if (p.offset) { this.state.offset = Number(p.offset) || 0; }

        this.buildHead();
        this.$message = $('<tbody class="exp-dt-message" hidden="hidden"><tr><td></td></tr></tbody>').appendTo(this.$table);
        this.$body = $('<tbody class="exp-dt-body"></tbody>').appendTo(this.$table);
        if (this.domRows) { this.$body.append(this.domRows.map(function (r) { return r._tr; })); }
        if (o.caption) { this.$table.prepend($('<caption class="exp-visually-hidden"></caption>').text(o.caption)); }
        this.$status = $('<div class="exp-visually-hidden" role="status" aria-live="polite"></div>').appendTo(this.$root);

        this.buildPagers();
        this.buildActions();
        this.buildFilter();
        this.bind();
        this.$el.data('expDataTable', this);
        if (this.$table[0] !== this.el) { this.$table.data('expDataTable', this); }
        if (o.initialLoad !== false) { this.load(); }
    };

    DataTable.prototype.columnsFromMarkup = function () {
        var cols = [], self = this;
        this.$table.find('thead th').each(function (i) {
            var key = this.getAttribute('data-key') || ('c' + i);
            cols.push({ key: key, label: trim($(this).text()), html: this.innerHTML,
                        sortable: this.hasAttribute('data-sortable') || $(this).hasClass('exp-dt-sortable') });
        });
        var keys = cols.map(function (c) { return c.key; });
        this.domRows = this.$table.find('tbody tr').toArray().map(function (tr) {
            var row = { _tr: tr };
            $(tr).children('td, th').each(function (i) {
                row[keys[i]] = this.hasAttribute('data-value') ? this.getAttribute('data-value') : trim($(this).text());
            });
            return row;
        });
        this.$table.find('thead, tbody').remove();
        return cols;
    };

    DataTable.prototype.column = function (key) {
        for (var i = 0; i < this.columns.length; i++) { if (this.columns[i].key === key) { return this.columns[i]; } }
        return null;
    };

    /**
     * Puts the columns in the order of keys: the ones without a label (selection, row menu) stay first, then the
     * keys in their order, then the rest in their defined order.
     */
    DataTable.prototype.applyOrder = function (keys) {
        var fixed = [], listed = [], rest = [];
        this.defOrder.forEach(function (c) {
            if (!c.label) { fixed.push(c); } else if (keys.indexOf(c.key) === -1) { rest.push(c); }
        });
        keys.forEach(function (k) {
            for (var i = 0; i < this.defOrder.length; i++) {
                var c = this.defOrder[i];
                if (c.key === k && c.label && listed.indexOf(c) === -1) { listed.push(c); break; }
            }
        }, this);
        this.columns = fixed.concat(listed, rest);
    };

    /** A column's alignment class: align: 'right' or 'center'. */
    function alignClass(c) { return c.align === 'right' || c.align === 'center' ? ' exp-dt-align-' + c.align : ''; }

    DataTable.prototype.buildHead = function () {
        var self = this, $tr = $('<tr></tr>');
        this.columns.forEach(function (c) {
            var $th = $('<th scope="col"></th>').attr('data-key', c.key).addClass('exp-dt-col-' + c.key + alignClass(c));
            if (c.className) { $th.addClass(c.className); }
            if (c.headerClassName) { $th.addClass(c.headerClassName); }
            if (c.title) { $th.attr('title', c.title); }
            if (self.select && c.key === self.select.key) {
                $th.addClass('exp-dt-col-select');
                if (self.select.header) {
                    self.$all = $('<input type="checkbox" class="exp-dt-check-all" />').attr('aria-label', t('Select all'));
                    $th.append(self.$all);
                }
            } else if (c.sortable) {
                $th.addClass('exp-dt-sortable').attr('aria-sort', 'none');
                var $b = $('<button type="button" class="exp-dt-sort"></button>');
                if (c.html && !c.label) { $b.html(c.html); } else { $b.text(c.label || ''); }
                $th.append($b);
            } else if (c.label) {
                $th.append($('<span class="exp-dt-label"></span>').toggleClass('exp-visually-hidden', !!c.labelHidden).text(c.label));
            }
            if (c.hidden) { $th.prop('hidden', true); }
            $tr.append($th);
        });
        var $head = $('<thead></thead>').append($tr);
        if (this.$head) { this.$head.replaceWith($head); } else { $head.appendTo(this.$table); }
        this.$head = $head;
        this.updateSortHeads();
    };

    DataTable.prototype.updateSortHeads = function () {
        var s = this.state.sort;
        this.$head.find('th.exp-dt-sortable').each(function () {
            var key = this.getAttribute('data-key'), on = s && s.key === key;
            var dir = on ? s.dir : null;
            this.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none');
            $(this).toggleClass('exp-dt-asc', dir === 'asc').toggleClass('exp-dt-desc', dir === 'desc');
            // what a click does next: the opposite direction when sorted by it, else ascending
            $(this).find('button.exp-dt-sort').attr('title', dir === 'asc' ? t('Click to sort descending') : t('Click to sort ascending'));
        });
    };

    // ---- pagers -------------------------------------------------------------------------------------------

    DataTable.prototype.buildPagers = function () {
        var p = this.paging, self = this;
        this.$pagers = $();
        this.$compacts = $();
        if (p.off) { return; }
        var full = p.containers ? $.map([].concat(p.containers), function (c) { return $(c).toArray(); }) : null;
        if (!full) { full = [$('<div class="exp-dt-pager-wrap"></div>').appendTo(this.$root)[0]]; }
        full.forEach(function (c) {
            self.$pagers = self.$pagers.add($('<nav class="exp-dt-pager"></nav>').attr('aria-label', t('Pages')).appendTo($(c).empty()));
        });
        $.map([].concat(p.compact || []), function (c) { return $(c).toArray(); }).forEach(function (c) {
            self.$compacts = self.$compacts.add($('<nav class="exp-dt-pager exp-dt-pager-compact"></nav>').attr('aria-label', t('Pages')).appendTo($(c).empty()));
        });
        this.$pagers.add(this.$compacts).on('click', 'button', function (e) {
            e.preventDefault();
            var b = $(this), page = self.page(), pages = self.pages();
            if (b.prop('disabled')) { return; }
            if (b.hasClass('exp-dt-first')) { self.setPage(1); }
            else if (b.hasClass('exp-dt-prev')) { self.setPage(page - 1); }
            else if (b.hasClass('exp-dt-next')) { self.setPage(page + 1); }
            else if (b.hasClass('exp-dt-last')) { self.setPage(pages); }
            else if (b.hasClass('exp-dt-page')) { self.setPage(Number(b.attr('data-page'))); }
        });
    };

    DataTable.prototype.page = function () {
        return this.state.limit ? Math.ceil(this.state.offset / this.state.limit) + 1 : 1;
    };
    DataTable.prototype.pages = function () {
        return this.state.limit ? Math.ceil(this.total / this.state.limit) : (this.total ? 1 : 0);
    };

    DataTable.prototype.renderPagers = function () {
        if (this.paging.off) { return; }
        var p = this.paging, page = this.total ? this.page() : 0, pages = this.pages(), L = p.labels;
        var btn = function (cls, html, label, disabled) {
            return $('<button type="button"></button>').addClass(cls).html(html).attr('aria-label', label).prop('disabled', !!disabled);
        };
        var first = page <= 1, last = page >= pages;
        this.$pagers.each(function () {
            var $nav = $(this).empty();
            var $pages = $('<span class="exp-dt-pages"></span>');
            var r = pageRange(page, pages, p.pageLinks);
            for (var i = r[0]; i <= r[1]; i++) {
                if (i === page) {
                    $pages.append($('<span class="exp-dt-page exp-dt-current" aria-current="page"></span>').attr('data-page', i).text(i));
                } else {
                    $pages.append($('<button type="button" class="exp-dt-page"></button>').attr({ 'data-page': i, 'aria-label': t('Page %page', { '%page': i }) }).text(i));
                }
            }
            $nav.append($('<span class="exp-dt-backward"></span>').append(btn('exp-dt-first', L.first, t('First page'), first), btn('exp-dt-prev', L.prev, t('Previous page'), first)),
                        $pages,
                        $('<span class="exp-dt-forward"></span>').append(btn('exp-dt-next', L.next, t('Next page'), last), btn('exp-dt-last', L.last, t('Last page'), last)));
        });
        this.$compacts.each(function () {
            $(this).empty().append(btn('exp-dt-prev', L.prev, t('Previous page'), first), btn('exp-dt-next', L.next, t('Next page'), last));
        });
        // alwaysVisible: false hides the pagers while everything fits on one page, as the classic paginator did
        this.$pagers.add(this.$compacts).prop('hidden', !p.alwaysVisible && pages <= 1);
    };

    // ---- toolbar, Table options, filter ------------------------------------------------------------------

    DataTable.prototype.toolbar = function () {
        if (!this.$toolbar) {
            this.$toolbar = this.o.actionsContainer ? $(this.o.actionsContainer).first() : $('<div class="exp-dt-toolbar"></div>').prependTo(this.$root);
            this.$toolbar.addClass('exp-dt-actions').attr('role', this.$toolbar.attr('role') || 'toolbar');
            if (!this.$toolbar.attr('aria-label')) { this.$toolbar.attr('aria-label', t('Table actions')); }
        }
        return this.$toolbar;
    };

    DataTable.prototype.buildActions = function () {
        var self = this, defs = (this.o.actions || []).slice();
        var to = this.o.tableOptions;
        if (to) {
            defs.push($.extend({ id: 'exp-dt-options', label: t('Table options') }, to.button || {}, { menu: null, onClick: function () { self.openOptions(); } }));
        }
        if (!defs.length) { return; }
        var $bar = this.toolbar();
        defs.forEach(function (d) {
            var m = new MenuButton(self, d);
            self.menus.push(m);
            $bar.append(m.$group, ' ');
        });
    };

    DataTable.prototype.action = function (id) {
        for (var i = 0; i < this.menus.length; i++) { if (this.menus[i].id === id) { return this.menus[i]; } }
        return null;
    };

    DataTable.prototype.closeMenus = function (except) {
        this.menus.forEach(function (m) { if (m !== except) { m.close(); } });
    };

    DataTable.prototype.buildFilter = function () {
        var f = this.o.filter, self = this;
        if (!f) { return; }
        f = this.filterConf = $.extend({ input: null, container: null, delay: 400, attrs: {} }, f === true ? {} : f);
        var $in = f.input ? $(f.input).first() : $();
        if (!$in.length) {
            $in = $('<input type="text" />').attr($.extend({ 'aria-label': t('Filter') }, f.attrs));
            (f.container ? $(f.container).first() : this.toolbar()).append($in);
        } else if (!$in.attr('aria-label') && !$in.attr('id')) {
            $in.attr('aria-label', t('Filter'));
        }
        this.$filter = $in;
        var timer = null;
        $in.on('input.expdt', function () {
            if (timer) { window.clearTimeout(timer); }
            timer = window.setTimeout(function () { timer = null; self.setFilter($in.val()); }, f.delay);
        });
    };

    /** Table options: rows per page (and a custom number), and the visible columns. A native modal <dialog>. */
    DataTable.prototype.buildOptions = function () {
        var self = this, to = this.o.tableOptions, ids = uid('exp-dt-options');
        var $d = $('<dialog class="exp-dt-dialog"></dialog>').attr('aria-labelledby', ids + '-title');
        $d.append($('<h2 class="exp-dt-dialog-title"></h2>').attr('id', ids + '-title').text(to.title || t('Table options')));
        var $bd = $('<div class="exp-dt-dialog-body"></div>').appendTo($d);
        var lim = to.limits;
        if (lim) {
            var $fs = $('<fieldset></fieldset>').append($('<legend></legend>').text(lim.legend || t('Number of items per page:')));
            var $block = $('<div class="block"></div>').appendTo($fs);
            (lim.items || []).forEach(function (item) {
                var $r = $('<input type="radio" name="TableOptionValue" />').attr({ id: 'table-option-row-btn-' + item.id, value: item.count })
                    .prop('checked', Number(self.state.limit) === Number(item.count));
                $r.on('click', function () {
                    self.setLimit(item.count);
                    if (isFn(lim.onSelect)) { lim.onSelect.call(self, item, self); }
                });
                $block.append($('<div class="table-options-row"></div>').append(
                    $('<span class="table-options-key"></span>').append($('<label></label>').attr('for', 'table-option-row-btn-' + item.id).text(item.count)),
                    $('<span class="table-options-value"></span>').append($r)));
            });
            if (lim.custom) {
                var c = $.extend({ label: t('Custom'), placeholder: '', max: 10000, invalid: null }, lim.custom);
                var $ci = $('<input id="table-option-custom-input" type="text" name="TableOptionCustomValue" value="" class="table-options-custom-input" />').attr('placeholder', c.placeholder);
                var $cr = $('<input id="table-option-custom-radio" type="radio" name="TableOptionValue" value="custom" />').attr('aria-label', c.label);
                var valid = function (v) { var n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= c.max ? n : null; };
                var apply = function () {
                    var v = trim($ci.val());
                    if (v === '') { return; }
                    var n = valid(v);
                    if (n !== null) {
                        $d.find('input[name="TableOptionValue"]').prop('checked', false);
                        $cr.prop('checked', true);
                        self.setLimit(n);
                    } else {
                        window.alert(c.invalid || t('Please enter a valid number between 1 and %max', { '%max': c.max }));
                        $cr.prop('checked', false);
                        $ci.val('');
                    }
                };
                $ci.on('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(); } });
                $ci.on('blur', apply);
                $cr.on('click', function () {
                    var n = valid(trim($ci.val()));
                    if (n !== null) { self.setLimit(n); }
                });
                $block.append($('<div class="table-options-row"></div>').append(
                    $('<span class="table-options-key"></span>').append($('<label for="table-option-custom-input"></label>').text(c.label)),
                    $('<span class="table-options-value table-options-custom-value"></span>').append($ci, ' ', $cr)));
            }
            $bd.append($fs);
        }
        if (to.presets) {
            this.$presets = $('<fieldset class="exp-dt-presets"></fieldset>');
            if (lim) { $bd.append('<br />'); }
            $bd.append(this.$presets);
            this.renderPresets();
        }
        if (to.columns) {
            var C = to.columns;
            var $cf = $('<fieldset class="exp-dt-columns"></fieldset>').append($('<legend></legend>').text(C.legend || t('Visible table columns:')));
            if (C.filter) {
                var F = $.extend({ label: t('Find a column'), placeholder: '' }, C.filter === true ? {} : C.filter);
                var $fi = $('<input type="search" class="exp-dt-column-filter" autocomplete="off" />').attr({ id: ids + '-filter', placeholder: F.placeholder });
                $cf.append($('<div class="exp-dt-column-filter-row"></div>').append(
                    $('<label></label>').attr('for', ids + '-filter').text(F.label), ' ', $fi));
                $fi.on('input', function () { self.filterOptionColumns($fi.val()); });
                $fi.on('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); } });
                this.$columnFilter = $fi;
            }
            this.$columnList = $('<div class="block exp-dt-column-list"></div>').appendTo($cf);
            if (lim || to.presets) { $bd.append('<br />'); }
            $bd.append($cf);
            var ct = this.o.columnToggle || {};
            if (ct.ordered) {
                var Or = $.extend({ legend: t('Order of the shown columns:'), hint: t('Drag a column, or use its buttons.') }, C.order || {});
                var $of = $('<fieldset class="exp-dt-order-fieldset"></fieldset>').append($('<legend></legend>').text(Or.legend));
                if (Or.hint) { $of.append($('<p class="exp-dt-order-hint"></p>').text(Or.hint)); }
                this.$orderList = $('<ol class="exp-dt-order"></ol>').appendTo($of);
                $bd.append('<br />', $of);
                this.bindOrderList();
            }
            this.renderOptionColumns();
        }
        var $close = $('<button type="button" class="exp-dt-dialog-close"></button>').text(to.close || t('Close'));
        var $footer = $('<div class="exp-dt-dialog-footer"></div>');
        (to.buttons || []).forEach(function (b) {
            var $b = $('<button type="button" class="exp-dt-dialog-close exp-dt-dialog-button"></button>').text(b.label || '');
            if (b.id) { $b.attr('id', b.id); }
            if (b.title) { $b.attr('title', b.title); }
            $b.on('click', function (e) { e.preventDefault(); if (isFn(b.onClick)) { b.onClick.call(self, self, e); } });
            $footer.append($b, ' ');
        });
        $d.append($footer.append($close));
        if (to.presets || (to.columns && (to.columns.filter || (this.o.columnToggle || {}).ordered))) { $d.addClass('exp-dt-dialog-wide'); }
        $close.on('click', function () { self.closeOptions(); });
        $d.on('cancel', function (e) { e.preventDefault(); self.closeOptions(); });
        $d.on('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); self.closeOptions(); } });
        $d.on('click', function (e) { if (e.target === $d[0] && to.backdropCloses) { self.closeOptions(); } });
        (to.container ? $(to.container).first() : this.$root).append($d);
        this.$options = $d;
    };

    /** Keeps the focus on "the same" control when part of the dialog is drawn again. */
    function keepFocus($scope, draw) {
        var a = document.activeElement, sel = null;
        if (a && $scope[0] && $scope[0].contains(a)) {
            var key = a.getAttribute('data-key') || a.value, role = a.getAttribute('data-role') || a.getAttribute('name');
            sel = { key: key, role: role };
        }
        draw();
        if (sel) {
            var $t = $scope.find('[data-role="' + sel.role + '"][data-key="' + sel.key + '"], [name="' + sel.role + '"][value="' + sel.key + '"]').filter(':enabled').first();
            if (!$t.length) { $t = $scope.find('[data-role="' + sel.role + '"]').filter(':enabled').first(); }
            if ($t.length) { $t[0].focus(); }
        }
    }

    /** Table options: the column check boxes, grouped by each column's group, and the order list. */
    DataTable.prototype.renderOptionColumns = function () {
        var self = this, $cb = this.$columnList, C = (this.o.tableOptions || {}).columns || {}, ct = this.o.columnToggle || {};
        if (!$cb) { return; }
        keepFocus($cb, function () {
            $cb.empty();
            var G = self.optionColumnGroups(), groups = G.groups, byGroup = G.byGroup;
            var grouped = groups.length > 1 || (groups.length === 1 && groups[0] !== '');
            groups.forEach(function (g, gi) {
                var $target = $cb;
                if (grouped) {
                    var gid = self.id + '-colgroup-' + gi;
                    $target = $('<div class="exp-dt-column-group" role="group"></div>').attr('aria-labelledby', gid).appendTo($cb);
                    $target.append($('<h3 class="exp-dt-column-group-title"></h3>').attr('id', gid).text(g || C.otherGroup || t('Other')));
                }
                byGroup[g].forEach(function (entry) {
                    var col = entry.col, id = 'table-option-col-btn-' + entry.i;
                    var $x = $('<input type="checkbox" name="TableOptionColumn" />').attr({ id: id, value: col.key }).prop('checked', !col.hidden);
                    $x.on('click', function () {
                        var keys;
                        if (ct.ordered) {
                            keys = self.shownColumns().filter(function (k) { return k !== col.key; });
                            if (this.checked) { keys.push(col.key); }
                        } else {
                            keys = $cb.find('input[name="TableOptionColumn"]:checked').map(function () { return this.value; }).get();
                        }
                        self.setShown(keys);
                    });
                    var $label = $('<label></label>').attr('for', id).text(col.label);
                    if (col.title) { $label.attr('title', col.title); }
                    $target.append($('<div class="table-options-row"></div>')
                        .attr('data-search', (col.label + ' ' + (col.group || '') + ' ' + (col.title || '')).toLowerCase())
                        .append($('<span class="table-options-key"></span>').append($label),
                                $('<span class="table-options-value"></span>').append($x)));
                });
            });
            $cb.append($('<p class="exp-dt-column-none" hidden="hidden"></p>').text((C.filter && C.filter.none) || t('No columns found.')));
        });
        if (this.$columnFilter) { this.filterOptionColumns(this.$columnFilter.val()); }
        this.renderOrderList();
    };

    /**
     * The columns Table options offers (they have a key and a label and can be toggled), by group in the order
     * the groups first appear: { groups: [name, ...], byGroup: { name: [ { col, i }, ... ] } }, i the column's
     * place in the defined order ('' is the group of columns without one).
     */
    DataTable.prototype.optionColumnGroups = function () {
        var groups = [], byGroup = {};
        this.defOrder.forEach(function (col, i) {
            if (!col.label || !col.key || col.toggle === false) { return; }
            var g = col.group || '';
            if (!Object.prototype.hasOwnProperty.call(byGroup, g)) { byGroup[g] = []; groups.push(g); }
            byGroup[g].push({ col: col, i: i });
        });
        return { groups: groups, byGroup: byGroup };
    };

    /** Shows only the column check boxes whose name (or group, or description) has the text. */
    DataTable.prototype.filterOptionColumns = function (text) {
        var needle = trim(text || '').toLowerCase(), $cb = this.$columnList, any = false;
        if (!$cb) { return; }
        $cb.find('.table-options-row').each(function () {
            var on = !needle || this.getAttribute('data-search').indexOf(needle) !== -1;
            this.hidden = !on;
            if (on) { any = true; }
        });
        $cb.find('.exp-dt-column-group').each(function () {
            this.hidden = $(this).find('.table-options-row').filter(function () { return !this.hidden; }).length === 0;
        });
        $cb.find('.exp-dt-column-none').prop('hidden', any);
    };

    /** The shown columns in their order: drag one to another place, or move it with its up and down buttons. */
    DataTable.prototype.renderOrderList = function () {
        var self = this, $ol = this.$orderList;
        if (!$ol) { return; }
        var O = $.extend({ up: t('Move %name up'), down: t('Move %name down') }, ((this.o.tableOptions || {}).columns || {}).order || {});
        keepFocus($ol, function () {
            $ol.empty();
            var keys = self.shownColumns();
            keys.forEach(function (k, i) {
                var c = self.column(k), name = c.label || k;
                var $li = $('<li class="exp-dt-order-item" draggable="true"></li>').attr('data-key', k);
                $li.append($('<span class="exp-dt-order-handle" aria-hidden="true"></span>'),
                           $('<span class="exp-dt-order-label"></span>').text(name),
                           $('<button type="button" class="exp-dt-order-up" data-role="exp-dt-order-up">↑</button>')
                               .attr({ 'data-key': k, 'aria-label': O.up.replace('%name', name), title: O.up.replace('%name', name) }).prop('disabled', i === 0),
                           $('<button type="button" class="exp-dt-order-down" data-role="exp-dt-order-down">↓</button>')
                               .attr({ 'data-key': k, 'aria-label': O.down.replace('%name', name), title: O.down.replace('%name', name) }).prop('disabled', i === keys.length - 1));
                $ol.append($li);
            });
        });
    };

    DataTable.prototype.bindOrderList = function () {
        var self = this, $ol = this.$orderList, dragKey = null;
        var clear = function () { $ol.find('.exp-dt-drop-before, .exp-dt-drop-after, .exp-dt-dragging').removeClass('exp-dt-drop-before exp-dt-drop-after exp-dt-dragging'); };
        $ol.on('click', 'button.exp-dt-order-up, button.exp-dt-order-down', function (e) {
            e.preventDefault();
            self.moveColumn(this.getAttribute('data-key'), $(this).hasClass('exp-dt-order-up') ? -1 : 1);
        });
        $ol.on('dragstart', 'li.exp-dt-order-item', function (e) {
            dragKey = this.getAttribute('data-key');
            var dt = e.originalEvent && e.originalEvent.dataTransfer;
            if (dt) { dt.effectAllowed = 'move'; try { dt.setData('text/plain', dragKey); } catch (x) { /* old browsers */ } }
            $(this).addClass('exp-dt-dragging');
        });
        $ol.on('dragover', 'li.exp-dt-order-item', function (e) {
            if (dragKey === null) { return; }
            e.preventDefault();
            var dt = e.originalEvent && e.originalEvent.dataTransfer;
            if (dt) { dt.dropEffect = 'move'; }
            var r = this.getBoundingClientRect(), after = (e.originalEvent || e).clientY > r.top + r.height / 2;
            $ol.find('.exp-dt-drop-before, .exp-dt-drop-after').not(this).removeClass('exp-dt-drop-before exp-dt-drop-after');
            $(this).toggleClass('exp-dt-drop-after', after).toggleClass('exp-dt-drop-before', !after);
        });
        $ol.on('drop', 'li.exp-dt-order-item', function (e) {
            if (dragKey === null) { return; }
            e.preventDefault();
            var target = this.getAttribute('data-key'), after = $(this).hasClass('exp-dt-drop-after');
            var keys = self.shownColumns().filter(function (k) { return k !== dragKey; });
            var at = keys.indexOf(target);
            if (target !== dragKey && at !== -1) {
                keys.splice(after ? at + 1 : at, 0, dragKey);
                clear();
                dragKey = null;
                self.setShown(keys);
            }
        });
        $ol.on('dragend', function () { dragKey = null; clear(); });
    };

    /** Table options: choose a preset, save the shown columns as one, delete one of your own. */
    DataTable.prototype.renderPresets = function () {
        var self = this, $fs = this.$presets, P = $.extend({
            legend: t('Column presets:'), none: t('No preset'), choose: t('Preset'), name: t('Name of the new preset'),
            saveAs: t('Save current as...'), remove: t('Delete'), items: [], current: null
        }, (this.o.tableOptions || {}).presets || {});
        if (!$fs) { return; }
        var items = (isFn(P.items) ? P.items.call(this, this) : P.items) || [];
        var current = isFn(P.current) ? P.current.call(this, this) : P.current;
        var find = function (id) { for (var i = 0; i < items.length; i++) { if (String(items[i].id) === String(id)) { return items[i]; } } return null; };
        keepFocus($fs, function () {
            $fs.empty().append($('<legend></legend>').text(P.legend));
            var sid = self.id + '-preset', nid = self.id + '-preset-name';
            var $sel = $('<select class="exp-dt-preset-select" data-role="exp-dt-preset-select" data-key="s"></select>').attr('id', sid)
                .append($('<option value=""></option>').text(P.none));
            items.forEach(function (it) { $sel.append($('<option></option>').attr('value', it.id).text(it.name)); });
            $sel.val(current !== null && current !== undefined && find(current) ? String(current) : '');
            var $del = $('<button type="button" class="exp-dt-dialog-close exp-dt-preset-delete" data-role="exp-dt-preset-delete" data-key="d"></button>').text(P.remove);
            var syncDel = function () { var it = find($sel.val()); $del.prop('disabled', !(it && it.own)); };
            syncDel();
            $sel.on('change', function () {
                syncDel();
                var it = find($sel.val());
                if (it && isFn(P.onApply)) { P.onApply.call(self, it, self); }
            });
            $del.on('click', function () {
                var it = find($sel.val());
                if (!it || !it.own || !isFn(P.onDelete)) { return; }
                Promise.resolve(P.onDelete.call(self, it, self)).then(function () { self.renderPresets(); });
            });
            var $name = $('<input type="text" class="exp-dt-preset-name" data-role="exp-dt-preset-name" data-key="n" maxlength="60" />').attr({ id: nid, placeholder: P.name });
            var $save = $('<button type="button" class="exp-dt-dialog-close exp-dt-preset-save" data-role="exp-dt-preset-save" data-key="v"></button>').text(P.saveAs);
            var save = function () {
                var name = trim($name.val());
                if (!name) { $name[0].focus(); return; }
                if (!isFn(P.onSave)) { return; }
                Promise.resolve(P.onSave.call(self, name, self.shownColumns(), self)).then(function () { self.renderPresets(); });
            };
            $save.on('click', save);
            $name.on('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); save(); } });
            $fs.append($('<div class="exp-dt-preset-row"></div>').append($('<label></label>').attr('for', sid).text(P.choose), ' ', $sel, ' ', $del),
                       $('<div class="exp-dt-preset-row"></div>').append($('<label class="exp-visually-hidden"></label>').attr('for', nid).text(P.name), $name, ' ', $save));
        });
    };

    DataTable.prototype.openOptions = function () {
        if (!this.o.tableOptions) { return; }
        if (!this.$options) { this.buildOptions(); }
        var d = this.$options[0];
        this.optionsReturn = document.activeElement;
        if (!d.open) {
            if (isFn(d.showModal)) { d.showModal(); } else { d.setAttribute('open', 'open'); }
        }
        var $first = this.$options.find('input:checked, input, button').first();
        if ($first.length) { $first[0].focus(); }
        this.emit('options', { open: true });
    };

    DataTable.prototype.closeOptions = function () {
        if (!this.$options) { return; }
        var d = this.$options[0];
        if (d.open) { if (isFn(d.close)) { d.close(); } else { d.removeAttribute('open'); } }
        if (this.optionsReturn && this.optionsReturn.focus && document.contains(this.optionsReturn)) { this.optionsReturn.focus(); }
        this.emit('options', { open: false });
    };

    DataTable.prototype.saveColumns = function (keys) {
        var ct = this.o.columnToggle || {};
        this.shownKeys = keys;
        if (isFn(ct.save)) { ct.save.call(this, keys, this); }
        else if (ct.pref) {
            Exp.prefs.set(ct.pref, keys.join(',')).catch(function (e) {
                if (window.console) { window.console.error('Exp.datatable: the columns were not saved', e); }
            });
        }
        this.emit('columns', { shown: keys.slice() });
    };

    DataTable.prototype.showColumn = function (key) { this.setColumnHidden(key, false); };
    DataTable.prototype.hideColumn = function (key) { this.setColumnHidden(key, true); };
    DataTable.prototype.setColumnHidden = function (key, hidden) {
        var c = this.column(key);
        if (!c) { return; }
        c.hidden = !!hidden;
        var i = this.columns.indexOf(c);
        this.$head.find('th').eq(i).prop('hidden', !!hidden);
        this.$body.children('tr').each(function () { $(this.cells[i]).prop('hidden', !!hidden); });
        this.updateMessageSpan();
    };
    DataTable.prototype.visibleColumns = function () {
        return this.columns.filter(function (c) { return !c.hidden; }).map(function (c) { return c.key; });
    };
    /** The shown columns that can be toggled (they have a label), in the order they are shown. */
    DataTable.prototype.shownColumns = function () {
        return this.columns.filter(function (c) { return !c.hidden && c.label && c.toggle !== false; }).map(function (c) { return c.key; });
    };

    /**
     * Shows exactly the columns keys (the others with a label are hidden); with columnToggle.ordered also in that
     * order. A column with remote: true that was hidden loads the rows again (the server sends only shown columns),
     * any other change only draws the rows again. opts.save: false does not save the choice.
     */
    DataTable.prototype.setShown = function (keys, opts) {
        opts = opts || {};
        var self = this, ct = this.o.columnToggle || {}, before = this.visibleColumns(), reload = false;
        keys = (keys || []).filter(function (k) { var c = self.column(k); return c && c.label && c.toggle !== false; });
        this.columns.forEach(function (c) {
            if (!c.label || c.toggle === false) { return; }
            var hide = keys.indexOf(c.key) === -1;
            if (!hide && c.hidden && c.remote) { reload = true; }
            c.hidden = hide;
        });
        if (ct.ordered) { this.applyOrder(keys); }
        this.shownKeys = keys.slice();
        if (this.visibleColumns().join(',') !== before.join(',') || reload) {
            this.cancelEdit();
            this.buildHead();
            this.updateMessageSpan();
            if (reload) { this.load(); } else { this.render(); }
        }
        if (this.$options) { this.renderOptionColumns(); }
        if (opts.save !== false) { this.saveColumns(keys); }
        return keys;
    };

    /** Moves a shown column by delta places (-1 earlier, 1 later) among the shown ones. */
    DataTable.prototype.moveColumn = function (key, delta) {
        var keys = this.shownColumns(), i = keys.indexOf(key), j = i + delta;
        if (i === -1 || j < 0 || j >= keys.length) { return false; }
        keys.splice(i, 1);
        keys.splice(j, 0, key);
        this.setShown(keys);
        return true;
    };

    // ---- copying a cell ----------------------------------------------------------------------------------

    DataTable.prototype.copyTexts = function () {
        return $.extend({ title: t('Click to copy'), done: t('Copied'), failed: t('Not copied') }, this.o.copy || {});
    };

    /** The text a copy cell puts on the clipboard: copy(row) when copy is a function, else the row's value. */
    DataTable.prototype.copyValue = function (c, row, $td) {
        var v = isFn(c.copy) ? c.copy.call(this, row, c, this) : row[c.key];
        if (v === undefined || v === null) { return ''; }
        if (typeof v === 'object') { v = Array.isArray(v) ? v.join(', ') : JSON.stringify(v); }
        return String(v);
    };

    /** Puts the cell's value on the clipboard and says so in a small confirmation; a Promise of true or false. */
    DataTable.prototype.copyCell = function (td) {
        var $td = $(td), row = $.data($td.closest('tr')[0], 'expRow'), c = this.column($td.attr('data-key'));
        if (!row || !c || !c.copy) { return Promise.resolve(false); }
        var self = this, text = this.copyValue(c, row, $td), T = this.copyTexts();
        var fallback = function () {
            var ta = document.createElement('textarea'), ok = false;
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(ta);
            return ok;
        };
        var p = window.navigator.clipboard && window.isSecureContext !== false
            ? window.navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); })
            : Promise.resolve(fallback());
        return p.then(function (ok) {
            $td.find('.exp-dt-copied').remove();
            var $note = $('<span class="exp-dt-copied" aria-hidden="true"></span>').toggleClass('exp-dt-copy-failed', !ok).text(ok ? T.done : T.failed);
            $td.append($note);
            window.setTimeout(function () { $note.remove(); }, 1400);
            self.announce(ok ? T.done : T.failed);
            self.emit('copy', { row: row, key: c.key, text: text, copied: ok });
            return ok;
        });
    };

    // ---- data ----------------------------------------------------------------------------------------------

    DataTable.prototype.stateCopy = function () {
        var s = this.state;
        return { offset: s.offset, limit: s.limit, sort: s.sort ? { key: s.sort.key, dir: s.sort.dir } : null, filter: s.filter, page: this.page() };
    };

    /** The source as a function of the state: a Promise of {rows, total, offset}. */
    DataTable.prototype.fetch = function (state) {
        var src = this.o.source, self = this;
        if (isFn(src)) { try { return Promise.resolve(src.call(this, state, this)); } catch (e) { return Promise.reject(e); } }
        if (!src) { return Promise.resolve({ rows: [], total: 0 }); }
        if (src.dom || src.rows) {
            var rows = (src.dom ? this.domRows : src.rows).slice();
            if (state.filter) {
                var needle = String(state.filter).toLowerCase(), keys = src.filterKeys || this.columns.map(function (c) { return c.key; });
                rows = rows.filter(function (r) { return keys.some(function (k) { return r[k] !== undefined && String(r[k]).toLowerCase().indexOf(needle) !== -1; }); });
            }
            if (state.sort) {
                var k = state.sort.key, m = state.sort.dir === 'desc' ? -1 : 1;
                rows = rows.map(function (r, i) { return [r, i]; }).sort(function (a, b) { return compareValues(a[0][k], b[0][k]) * m || a[1] - b[1]; }).map(function (x) { return x[0]; });
            }
            var total = rows.length;
            return Promise.resolve({ rows: state.limit ? rows.slice(state.offset, state.offset + state.limit) : rows, total: total });
        }
        var parse = isFn(src.parse) ? src.parse : function (r) { return { rows: r.rows || r.list || [], total: r.total !== undefined ? r.total : (r.rows || r.list || []).length }; };
        var request, key;
        if (src.fn) {
            var args = isFn(src.args) ? src.args.call(this, state, this) : (src.args || []);
            var data = isFn(src.data) ? src.data.call(this, state, this) : src.data;
            key = src.fn + '::' + JSON.stringify(args) + '::' + JSON.stringify(data || null);
            request = function () { return Exp.io.call(src.fn, args, { method: src.method || 'POST', data: data }); };
        } else {
            var url = isFn(src.url) ? src.url.call(this, state, this) : src.url;
            var params = isFn(src.data) ? src.data.call(this, state, this) : src.data;
            key = url + '::' + JSON.stringify(params || null);
            request = function () {
                return new Promise(function (resolve, reject) {
                    $.ajax({ url: url, method: src.method || 'GET', data: params, dataType: 'json', timeout: src.timeout || 0 })
                        .then(function (json) { resolve(json); }, function (xhr, status) {
                            var e = new Error(status === 'timeout' ? t('No answer from the server.') : t('The server answered with an error (HTTP %status).', { '%status': xhr.status }));
                            e.status = xhr.status; e.kind = status === 'timeout' ? 'timeout' : (xhr.status ? 'server' : 'network'); e.response = xhr;
                            reject(e);
                        });
                });
            };
        }
        var max = Number(src.cache) || 0;
        if (max && Object.prototype.hasOwnProperty.call(this.cache, key)) {
            return Promise.resolve(this.cache[key]);
        }
        return request().then(function (raw) {
            var res = parse.call(self, raw, state, self) || { rows: [], total: 0 };
            if (max) {
                self.cache[key] = res;
                self.cacheOrder.push(key);
                while (self.cacheOrder.length > max) { delete self.cache[self.cacheOrder.shift()]; }
            }
            return res;
        });
    };

    DataTable.prototype.flushCache = function () { this.cache = {}; this.cacheOrder = []; };

    DataTable.prototype.showMessage = function (text, cls) {
        this.$message.find('td').attr('class', cls || '').text(text);
        this.updateMessageSpan();
        this.$message.prop('hidden', false);
    };
    DataTable.prototype.hideMessage = function () { this.$message.prop('hidden', true); };
    DataTable.prototype.updateMessageSpan = function () {
        this.$message.find('td').attr('colspan', Math.max(1, this.visibleColumns().length));
    };

    /** Loads the rows for the current state; a Promise of the result. */
    DataTable.prototype.load = function () {
        var self = this, state = this.stateCopy(), seq = ++this.seq;
        this.cancelEdit();
        this.$table.attr('aria-busy', 'true');
        var shown = false;
        var timer = window.setTimeout(function () { shown = true; self.showMessage(self.texts.loading, 'exp-dt-loading'); }, 0);
        return this.fetch(state).then(function (res) {
            window.clearTimeout(timer);
            if (seq !== self.seq) { return res; }
            self.$table.removeAttr('aria-busy');
            self.total = Number(res.total) || 0;
            if (typeof res.offset === 'number' && res.offset >= 0) { self.state.offset = res.offset; }
            self.rowsData = res.rows || [];
            self.render();
            self.renderPagers();
            if (isFn(self.o.onLoad)) { self.o.onLoad.call(self, res, self); }
            self.emit('load', { rows: self.rowsData, total: self.total, state: self.stateCopy(), meta: res.meta });
            return res;
        }, function (err) {
            window.clearTimeout(timer);
            if (seq !== self.seq) { return null; }
            self.$table.removeAttr('aria-busy');
            self.showMessage(err && err.kind === 'signedout' ? err.message : self.texts.error, 'exp-dt-error');
            self.emit('error', { error: err, state: state });
            if (window.console) { window.console.warn('Exp.datatable: the rows were not loaded', err && err.message); }
            return null;
        });
    };
    DataTable.prototype.reload = DataTable.prototype.load;

    DataTable.prototype.renderCell = function (c, row, $td) {
        if (this.select && c.key === this.select.key) {
            var s = this.select, value = isFn(s.value) ? s.value(row) : row[this.o.rowKey || 'id'];
            var $c = $('<input type="checkbox" />').attr('value', value);
            if (s.className) { $c.addClass(s.className); }
            if (s.name) { $c.attr('name', s.name); }
            var label = isFn(s.label) ? s.label(row) : null;
            if (label) { $c.attr('aria-label', t('Select %name', { '%name': label })); }
            $td.append($c);
            return;
        }
        if (isFn(c.render)) {
            var out = c.render.call(this, row, $td, this);
            if (out === undefined || out === null) { return; }
            if (typeof out === 'string') { $td[0].innerHTML = out; } else { $td.append(out); }
            return;
        }
        var v = row[c.key];
        if (c.format === 'date') { v = v === null || v === undefined || v === '' ? '' : formatDate(v, c.dateFormat || this.o.dateFormat); }
        $td.text(v === null || v === undefined ? '' : String(v));
    };

    DataTable.prototype.canEdit = function (row) {
        var ie = this.o.inlineEdit;
        return !!ie && (!isFn(ie.canEdit) || !!ie.canEdit.call(this, row, this));
    };

    DataTable.prototype.render = function () {
        var self = this, rows = this.rowsData, rk = this.o.rowKey;
        this.lastChecked = null;
        if (this.o.source && this.o.source.dom) {
            this.$body.children('tr').detach();
            rows.forEach(function (r) { self.$body.append(r._tr); });
        } else {
            var frag = document.createDocumentFragment();
            rows.forEach(function (row, ri) {
                var tr = document.createElement('tr');
                tr.className = ri % 2 ? 'exp-dt-odd' : 'exp-dt-even';
                if (ri === 0) { tr.className += ' exp-dt-row-first'; }
                if (rk && row[rk] !== undefined) { tr.setAttribute('data-row-key', row[rk]); }
                $.data(tr, 'expRow', row);
                self.columns.forEach(function (c) {
                    var td = document.createElement('td'), $td = $(td);
                    td.setAttribute('data-key', c.key);
                    td.className = 'exp-dt-col-' + c.key + alignClass(c) + (c.className ? ' ' + c.className : '');
                    if (c.hidden) { td.hidden = true; }
                    self.renderCell(c, row, $td);
                    if (c.copy && self.copyValue(c, row, $td) !== '') {
                        td.className += ' exp-dt-copy';
                        td.tabIndex = 0;
                        td.title = self.copyTexts().title;
                    }
                    if (editableType(c) && self.canEdit(row)) {
                        td.className += ' exp-dt-editable';
                        td.tabIndex = 0;
                        td.setAttribute('aria-label', (c.label || c.key) + ': ' + $td.text() + '. ' + t('Press Enter to edit'));
                    }
                    tr.appendChild(td);
                });
                frag.appendChild(tr);
            });
            this.$body.empty().append(frag);
        }
        if (rows.length) { this.hideMessage(); } else { this.showMessage(this.texts.empty, 'exp-dt-empty'); }
        this.syncAll();
        if (isFn(this.o.onRender)) { this.o.onRender.call(this, this); }
    };

    DataTable.prototype.rows = function () { return this.rowsData.slice(); };

    // ---- state changes ---------------------------------------------------------------------------------

    DataTable.prototype.setPage = function (page) {
        if (this.paging.off || !this.state.limit) { return Promise.resolve(null); }
        var pages = this.pages();
        page = Math.max(1, Math.min(Number(page) || 1, pages || 1));
        var offset = normalizeOffset((page - 1) * this.state.limit, this.total, this.state.limit);
        if (offset === this.state.offset) { return Promise.resolve(null); }
        this.state.offset = offset;
        this.emit('page', { page: page, offset: offset, limit: this.state.limit });
        this.announce(t('Page %page of %pages', { '%page': page, '%pages': pages }));
        return this.load();
    };

    DataTable.prototype.setLimit = function (limit) {
        limit = Number(limit);
        if (this.paging.off || !(limit > 0) || limit === this.state.limit) { return Promise.resolve(null); }
        this.state.offset = normalizeOffset(this.state.offset, this.total, limit);
        this.state.limit = limit;
        if (this.$options) {
            this.$options.find('input[name="TableOptionValue"]').each(function () {
                if (this.value !== 'custom' && Number(this.value) === limit) { this.checked = true; }
            });
        }
        this.emit('page', { page: this.page(), offset: this.state.offset, limit: limit });
        return this.load();
    };

    /** Sorts by a column; dir omitted: the opposite of the current direction when sorted by it, else ascending. */
    DataTable.prototype.sortBy = function (key, dir) {
        var c = this.column(key);
        if (!c || !c.sortable) { return Promise.resolve(null); }
        var s = this.state.sort;
        if (!dir) { dir = s && s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : (c.sortDir || 'asc'); }
        this.state.sort = { key: key, dir: dir };
        this.state.offset = 0;
        this.updateSortHeads();
        this.emit('sort', { key: key, dir: dir });
        this.announce(t(dir === 'asc' ? 'Sorted by %column, ascending' : 'Sorted by %column, descending', { '%column': c.label || key }));
        return this.load();
    };

    DataTable.prototype.setFilter = function (text) {
        text = String(text === undefined || text === null ? '' : text);
        if (this.$filter && this.$filter.val() !== text) { this.$filter.val(text); }
        this.state.filter = text;
        this.state.offset = 0;
        this.emit('filter', { filter: text });
        return this.load();
    };

    DataTable.prototype.announce = function (text) {
        var $s = this.$status;
        $s.text('');
        window.setTimeout(function () { $s.text(text); }, 50);
    };

    DataTable.prototype.emit = function (what, data) {
        data = $.extend({ table: this.el }, data);
        this.$el.trigger('exp:datatable:' + what, [data]);
        Exp.emit('exp:datatable:' + what, data);
    };

    // ---- selection ---------------------------------------------------------------------------------------

    DataTable.prototype.checks = function () {
        var s = this.select;
        if (!s) { return $(); }
        return this.$body.find('td[data-key="' + s.key + '"] input[type=checkbox]');
    };
    DataTable.prototype.selected = function () {
        return this.checks().filter(':checked').map(function () { return $.data($(this).closest('tr')[0], 'expRow'); }).get();
    };
    DataTable.prototype.selectAll = function (on) {
        this.checks().prop('checked', on !== false);
        this.syncAll();
        this.emitSelect();
    };
    DataTable.prototype.invert = function () {
        this.checks().each(function () { this.checked = !this.checked; });
        this.syncAll();
        this.emitSelect();
    };
    DataTable.prototype.syncAll = function () {
        var c = this.checks(), n = c.filter(':checked').length;
        c.each(function () { $(this).closest('tr').toggleClass('exp-dt-selected', this.checked); });
        if (this.$all) {
            this.$all.prop('checked', c.length > 0 && n === c.length).prop('indeterminate', n > 0 && n < c.length);
        }
    };
    DataTable.prototype.emitSelect = function () {
        var rows = this.selected();
        this.emit('select', { selected: rows, count: rows.length });
    };

    // ---- inline editing -----------------------------------------------------------------------------------

    DataTable.prototype.edit = function (td) {
        var $td = $(td), $tr = $td.closest('tr'), row = $.data($tr[0], 'expRow'), key = $td.attr('data-key');
        var c = this.column(key), et = c && editableType(c);
        if (!row || !et || !this.canEdit(row)) { return; }
        if (this.editing && this.editing.td === td) { return; }
        this.commitEdit();
        var self = this, old = row[key];
        var $in = $('<input type="text" class="exp-dt-editor" />').attr('aria-label', c.label || key)
            .val(old === null || old === undefined ? '' : String(old));
        // over the cell, as the classic cell editor was: the value stays in the cell beneath it until it is saved
        $td.addClass('exp-dt-editing').append($in);
        this.editing = { td: td, $in: $in, row: row, key: key, old: old, column: c, type: et };
        $in.on('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); self.commitEdit(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); self.cancelEdit(true); }
        });
        $in.on('focusout', function () {
            window.setTimeout(function () { if (self.editing && self.editing.$in === $in && document.activeElement !== $in[0]) { self.commitEdit(); } }, 0);
        });
        $in[0].focus();
        $in[0].select();
    };

    DataTable.prototype.endEdit = function (show, focus) {
        var ed = this.editing;
        if (!ed) { return; }
        this.editing = null;
        var $td = $(ed.td).removeClass('exp-dt-editing');
        ed.$in.remove();
        if (show !== undefined) { $td.empty(); this.renderCell(ed.column, ed.row, $td); }
        if (focus) { ed.td.focus(); }
    };

    DataTable.prototype.cancelEdit = function (focus) {
        if (this.editing) { this.endEdit(undefined, focus); }
    };

    /** Validates and saves the open editor; an invalid value puts the old one back and keeps the editor open. */
    DataTable.prototype.commitEdit = function () {
        var ed = this.editing;
        if (!ed) { return; }
        var raw = ed.$in.val(), value = raw;
        if (ed.type.type === 'number') { value = validateNumber(raw); }
        if (isFn(ed.type.validate)) { value = ed.type.validate(raw, ed.old, ed.row); }
        if (value === undefined) {
            ed.$in.val(ed.old === null || ed.old === undefined ? '' : String(ed.old));
            this.emit('invalid', { row: ed.row, key: ed.key, value: raw });
            return;
        }
        var self = this, row = ed.row, key = ed.key, old = ed.old, td = ed.td, refocus = document.activeElement === ed.$in[0];
        row[key] = value;
        this.endEdit(true, refocus);
        var ie = this.o.inlineEdit, p;
        if (isFn(ie.save)) { p = ie.save.call(this, row, key, value, this); }
        else if (ie.fn) {
            var data = isFn(ie.data) ? ie.data.call(this, row, key, value, this) : ie.data;
            var args = isFn(ie.args) ? ie.args.call(this, row, key, value, this) : (ie.args || []);
            p = Exp.io.call(ie.fn, args, { method: 'POST', data: data });
        }
        this.emit('edit', { row: row, key: key, value: value, old: old });
        Promise.resolve(p).then(function () {
            self.flushCache();
            if (ie.reloadWhenSorted !== false && self.state.sort && self.state.sort.key === key) { self.load(); }
        }, function (err) {
            row[key] = old;
            if (document.contains(td)) { $(td).empty(); self.renderCell(self.column(key), row, $(td)); }
            self.announce((err && err.message) || self.texts.error);
            self.emit('error', { error: err, row: row, key: key, value: value });
            if (window.console) { window.console.warn('Exp.datatable: the change was not saved', err && err.message); }
        });
    };

    // ---- events ------------------------------------------------------------------------------------------

    DataTable.prototype.bind = function () {
        var self = this;
        // on the table, not the header: the header is built again when the columns change order
        this.$table.on('click', 'thead button.exp-dt-sort', function (e) {
            e.preventDefault();
            self.sortBy($(this).closest('th').attr('data-key'));
        });
        this.$table.on('click', 'thead input.exp-dt-check-all', function () { self.selectAll(this.checked); });
        // cells with copy: a click (or Enter / Space on the focused cell) puts the value on the clipboard
        this.$body.on('click', 'td.exp-dt-copy', function (e) {
            if ($(e.target).closest('a, input, button, select, textarea').length) { return; }
            self.copyCell(this);
        });
        this.$body.on('keydown', 'td.exp-dt-copy', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === this) { e.preventDefault(); self.copyCell(this); }
        });
        this.$body.on('click', 'td[data-key] input[type=checkbox]', function (e) {
            if (!self.select || $(this).closest('td').attr('data-key') !== self.select.key) { return; }
            var all = self.checks(), i = all.index(this);
            if (self.select.ranges && e.shiftKey && self.lastChecked !== null && self.lastChecked < all.length) {
                var a = Math.min(i, self.lastChecked), b = Math.max(i, self.lastChecked), on = this.checked;
                all.slice(a, b + 1).prop('checked', on);
            }
            self.lastChecked = i;
            self.syncAll();
            self.emitSelect();
        });
        this.$body.on('click', 'td.exp-dt-editable', function (e) {
            if (self.editing && self.editing.td === this) { return; }
            if ($(e.target).closest('a, input, button, select, textarea').length) { return; }
            self.edit(this);
        });
        if (this.o.keyboard) {
            this.$body.on('keydown', function (e) { self.bodyKey(e); });
        }
        this.$root.on('keydown.expdt', function (e) {
            if (e.key === 'Escape') { self.closeMenus(); }
        });
    };

    /** Keyboard in the rows: Enter or F2 edits a cell, arrows move between rows and cells, Home and End. */
    DataTable.prototype.bodyKey = function (e) {
        var $t = $(e.target);
        if ($t.is('input.exp-dt-editor')) { return; }
        var $td = $t.closest('td'), $tr = $td.closest('tr');
        if (!$td.length) { return; }
        if ($t.is('td.exp-dt-editable') && (e.key === 'Enter' || e.key === 'F2')) { e.preventDefault(); this.edit($td[0]); return; }
        var focusables = function ($cell) { return $cell.find('a[href], input, button, select, textarea').addBack('[tabindex]').filter(':visible'); };
        var go = function ($row, index) {
            if (!$row.length) { return false; }
            var $cell = $($row[0].cells[index]), $f = focusables($cell);
            if (!$f.length) { $f = focusables($row.children('td')); }
            if ($f.length) { $f[0].focus(); return true; }
            return false;
        };
        var idx = $td[0].cellIndex;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if ($t.is('select, textarea') || ($t.is('input') && !$t.is('[type=checkbox], [type=radio]'))) { return; }
            if (go(e.key === 'ArrowDown' ? $tr.next() : $tr.prev(), idx)) { e.preventDefault(); }
        } else if ((e.key === 'Home' || e.key === 'End') && e.ctrlKey) {
            if (go(e.key === 'Home' ? $tr.siblings().addBack().first() : $tr.siblings().addBack().last(), idx)) { e.preventDefault(); }
        }
    };

    DataTable.prototype.destroy = function () {
        this.seq++;
        this.closeMenus();
        this.menus.forEach(function (m) { $(document).off('mousedown.expdtmenu' + m.id); m.$group.remove(); });
        if (this.$options) { this.closeOptions(); this.$options.remove(); }
        if (this.$filter) { this.$filter.off('.expdt'); }
        this.$pagers.add(this.$compacts).remove();
        this.$el.removeData('expDataTable');
        if (this.el.tagName === 'TABLE') { this.$table.removeData('expDataTable'); }
        else { this.$root.removeClass('exp-dt').empty(); }
    };

    Exp.datatable = {
        DataTable: DataTable,
        formatDate: formatDate,
        validateNumber: validateNumber,
        normalizeOffset: normalizeOffset,
        pageRange: pageRange,
        escapeHtml: escapeHtml
    };

    /** $(el).expDataTable(options) sets one up (again, with options); $(el).expDataTable('method', args...) calls one. */
    $.fn.expDataTable = function (options) {
        var args = Array.prototype.slice.call(arguments, 1), out;
        this.each(function () {
            var inst = $.data(this, 'expDataTable');
            if (typeof options === 'string') {
                if (inst && isFn(inst[options])) {
                    var r = inst[options].apply(inst, args);
                    if (out === undefined) { out = r; }
                }
                return;
            }
            if (inst) { inst.destroy(); }
            new DataTable($(this), options);
        });
        return out === undefined ? this : out;
    };

    Exp.register('datatable', function ($el, options) {
        $el.expDataTable(options.value !== undefined && Object.keys(options).length === 1 ? {} : options);
    });
}(window, document));
