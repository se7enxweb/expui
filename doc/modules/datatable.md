exp::datatable
==============

Sortable, paged tables with row selection, column toggling, inline editing, action menus and a
"Table options" dialog. Available since 1.0.0.1. Replaces the YUI 2 DataTable stack: DataTable,
Paginator, TextboxCellEditor, DataSource and XHRDataSource, Button (menu buttons), SimpleDialog,
Cookie and KeyListener.

In the admin: nothing to do
---------------------------

With Exponential UI active, every admin design (admin, admin2, admin3) loads `exp::datatable`
and `exp/datatable.css` (`design.ini` `BackendJavaScriptList`, `BackendCSSFileList`), and these
tables run on it:

- the sub-items table of the node view (`children.tpl` and `children_detailed.tpl`, with
  `design/admin/javascript/ezajaxsubitems_expdatatable.js`);
- eztags' children table (`eztags_children_yui.tpl`, with `$.fn.eZTagsChildrenExp` in
  `jquery.eztagschildren.js`).

Each keeps its YUI 2 version as the fallback when Exponential UI is not there. What they do, and
what is new, is in [From YUI](#from-yui) below.

> [!NOTE]
> **Tested against YUI.** In the admin, admin2 and admin3 designs, on Exponential Velocity and on
> PHP-FPM, every control of both tables was used with the YUI version and with this one, every
> action carried out on test content, and the records compared: the same requests, posted
> fields, cookies and saved preferences, the same rows, menus and pagers. No difference in any
> recorded run.

In your own templates
---------------------

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io', 'exp::datatable' ) )}
{ezcss_require( array( 'exp/core.css', 'exp/datatable.css' ) )}

<div id="my-toolbar"></div>
<div id="my-table"></div>
<div id="my-pager"></div>

<script>
{literal}
Exp.ready(function ($) {
    $('#my-table').expDataTable({
        columns: [
            { key: 'name',  label: 'Name', sortable: true },
            { key: 'class_name', label: 'Type', sortable: true },
            { key: 'priority', label: 'Priority', sortable: true, editable: 'number' }
        ],
        source: {
            fn: 'ezjscnode::subtree',
            args: function (s) { return [2, s.limit, s.offset, s.sort.key, s.sort.dir === 'asc' ? 1 : 0]; },
            parse: function (c) { return { rows: c.list, total: c.total_count }; }
        },
        sort: { key: 'name', dir: 'asc' },
        paging: { limit: 25, containers: ['#my-pager'] },
        select: { name: 'SelectedIDArray[]', value: function (row) { return row.node_id; } },
        actionsContainer: '#my-toolbar',
        actions: [{ id: 'my-more', label: 'More actions', menu: [{ label: 'Remove selected', value: 'remove' }],
                    onSelect: function (item, table) { console.log(item.value, table.selected()); } }]
    });
});
{/literal}
</script>
```

On admin pages the module and its stylesheet are loaded already: you only write the call.

The table is a real `<table>`: `<thead>` with `<th scope="col">` cells (sortable ones hold a
`<button>` and say `aria-sort`), a `<tbody>` for the rows and one for the loading, empty and error
message. A status region tells screen readers about page and sort changes.

> [!NOTE]
> **Start it from code when the template has data to hand over** (the admin's sub-items table has
> labels, languages, class lists). For a plain table already in the page, `data-exp-datatable`
> is enough: see *An existing table* below.

### An existing table

```html
<table data-exp-datatable='{"paging": {"limit": 20}}'>
    <thead><tr><th data-key="name" data-sortable>Name</th><th data-key="size" data-sortable>Size</th></tr></thead>
    <tbody>
        <tr><td><a href="/a">a.pdf</a></td><td data-value="2048">2 kB</td></tr>
    </tbody>
</table>
```

The header gives the columns (`data-sortable` makes one sortable), the rows stay as they are, and
`data-value` is what a cell sorts by. Without JavaScript it is still the table it was.

Options
-------

| Option | Type | Default | |
|---|---|---|---|
| `columns` | array | from the table's header | the columns, see below |
| `source` | object or function | `{ dom: true }` on a `<table>` | where the rows come from, see below |
| `rowKey` | string | `null` | the row field written to each `<tr data-row-key>` |
| `sort` | `{ key, dir }` | none | the starting sort; `dir` is `'asc'` or `'desc'` |
| `paging` | object or `false` | `{ limit: 25 }` | see below; `false`: every row, no pager |
| `select` | `true`, `'checkbox'` or object | none | row selection, see below |
| `columnToggle` | object | none | which columns are shown, and where that is saved |
| `inlineEdit` | object | none | saving edited cells, see below |
| `actions` | array | none | toolbar buttons and menu buttons |
| `actionsContainer` | selector | a toolbar above the table | where the buttons go |
| `tableOptions` | object | none | the "Table options" button and dialog |
| `filter` | `true` or object | none | a text field that filters the rows |
| `keyboard` | boolean | `true` | arrow keys between rows, Enter or F2 to edit |
| `empty`, `loading`, `error` | string | `Exp.i18n('No records found.')`, `'Loading...'`, `'Data error.'` | the message texts |
| `caption` | string | `''` | a caption for screen readers |
| `tableClass` | string | `''` | more classes on the `<table>` |
| `dateFormat` | string | `'%Y-%m-%d %H:%M'` | for `format: 'date'` columns |
| `onLoad` | function | none | after each load: `onLoad(result, table)`, `this` is the table |
| `onRender` | function | none | after the rows were drawn |
| `initialLoad` | boolean | `true` | `false`: nothing is loaded until `load()` |

### Columns

| | |
|---|---|
| `key` | the row field (and the column's name in events, `data-key` on its cells, class `exp-dt-col-<key>`) |
| `label` | the header text; a column without one cannot be hidden from Table options |
| `labelHidden` | the label is read by screen readers but not shown (the admin's thumbnail column) |
| `sortable` | a header button that sorts by it; `sortDir` is the first direction (`'asc'`) |
| `hidden` | starts hidden |
| `render(row, $td, table)` | the cell: return an HTML string, a node or jQuery, or fill `$td` and return nothing; without it the field is written as text |
| `format`, `dateFormat` | `'date'`: a `Date` or a timestamp in ms, written with `%d %e %m %Y %y %H %M %S` |
| `editable` | `true`, `'number'`, `'text'` or `{ type, validate(raw, old, row) }` (return `undefined` for invalid) |
| `className`, `headerClassName` | more classes on its cells, on its header cell |
| `toggle` | `false` keeps it out of Table options |
| `group` | the heading it is listed under in Table options (columns of one group together) |
| `title` | a description: the header cell's and the Table options label's tooltip; the column filter searches it too |
| `align` | `'right'` or `'center'`: class `exp-dt-align-<align>` on its header and cells |
| `copy` | `true` (the row's value) or `copy(row, column, table)` returning the text: a click on the cell, or Enter or Space on it, puts the text on the clipboard and shows a short confirmation (`copy: { title, done, failed }` among the table options gives the texts) |
| `remote` | the server sends this column's data only while it is shown: showing it loads the rows again |

### Sources

| Source | |
|---|---|
| `{ rows: [...], filterKeys }` | rows in the page: sorted, filtered and paged in the browser; the filter looks in the `filterKeys` fields (default: every column) |
| `{ dom: true, filterKeys }` | the rows of the `<table>` it is started on (its cells keep their markup) |
| `{ url, method, data, parse, cache, timeout }` | `$.ajax` (GET by default) to `url`, a string or `url(state)`; `parse(json, state)` returns `{ rows, total, offset }` |
| `{ fn, args, data, method, parse, cache }` | an ezjscore server function through `Exp.io.call(fn, args(state), { data })` |
| `function (state) {}` | returns `{ rows, total }` or a Promise of it |

`state` is `{ offset, limit, sort: { key, dir }, filter, page }`. `parse` may also return an
`offset` (the server's); the table moves to it.

`cache: 20` keeps the last 20 answers, by request, as YUI's DataSource `maxCacheEntries` did: going
back to a page already seen asks the server nothing. `flushCache()` empties it; a saved inline edit
does that itself.

### Paging

| | |
|---|---|
| `limit` | rows per page |
| `offset` | the starting offset |
| `containers` | where the full pagers go (first, previous, page links, next, last); default: below the table |
| `compact` | where previous/next-only pagers go (the admin's top right pager) |
| `pageLinks` | how many page links (10) |
| `alwaysVisible` | `true`: the pagers show also when everything fits on one page; `false` hides them then, as YUI Paginator's option did |
| `labels` | `{ first, prev, next, last }`: the buttons' HTML (`&laquo;`, `&lsaquo;`, `&rsaquo;`, `&raquo;`); each has a translated `aria-label` too |

Pages follow YUI Paginator's rules: a new number of rows keeps the offset on a page boundary
(`offset - offset % limit`), never past the last page; the same number, or the same page, loads
nothing; sorting goes back to the first page.

### Selection

`select: true` adds a checkbox column with a "select all" box in its header. As an object:

| | default | |
|---|---|---|
| `key` | `'select'` | the column it is drawn in (one of `columns`, or one added first) |
| `name` | `''` | the checkboxes' `name`, so a surrounding form posts them |
| `value(row)` | `row[rowKey]` | each checkbox's value |
| `className` | `'exp-dt-check'` | its class |
| `label(row)` | none | its `aria-label`: "Select <label>" |
| `header` | `true` | the "select all" box (indeterminate when some are checked) |
| `ranges` | `true` | shift-click checks or unchecks the range from the last click |

### Column toggling

`columnToggle: { shown: ['name', 'priority'], save: function (keys) {} }` hides every labelled
column not in `shown`, and calls `save` with the shown keys whenever Table options changes them.
`{ pref: 'my_columns' }` reads and saves a user preference instead (`Exp.prefs`, comma separated;
ask for it with `{exp_config( hash( 'prefs', array( 'my_columns' ) ) )}`).

`ordered: true` also puts the shown columns in the order of `shown` (the columns without a label,
such as the selection and the row menu, stay first). Table options then lists the shown columns in
their order: drag one to another place, or use its up and down buttons. `table.setShown(keys)`
shows exactly `keys` (in that order when ordered), `table.moveColumn(key, -1 | 1)` moves one, and
`table.shownColumns()` gives the shown, toggleable keys in their order. A change saves through
`save`, rebuilds the header and draws the rows again (or loads them, for a `remote` column).

### Inline editing

| | |
|---|---|
| `canEdit(row)` | whether a row's editable cells may be edited (default: all) |
| `save(row, key, value, table)` | saves; return a Promise |
| `fn`, `data(row, key, value)`, `args(row, key, value)` | or: post to an ezjscore server function with `Exp.io.call` |
| `reloadWhenSorted` | `true`: after a save, reload the page when the table is sorted by the edited column |

A click on the cell (or Enter or F2 on it) opens a text field over it. **Enter** saves, **Escape**
cancels, **leaving the field** saves. The new value shows at once; a failed save puts the old one
back and fires `exp:datatable:error`. An invalid value (a `number` column with `abc`) puts the old
value back in the field, and the field stays open.

### Actions

Each entry of `actions` is a button in the toolbar:

| | |
|---|---|
| `id` | the button is `<id>-button`, its wrapper `<id>`, its menu `<id>-menu` (YUI Button's ids, so the admin's styles and icons apply) |
| `label`, `html`, `title` | its text (as HTML with `html: true`), its title |
| `onClick(table, event)` | a plain button |
| `menu` | an array of items, or a function `menu(table)` called each time it opens |
| `onSelect(item, table)` | an item was chosen (an item may have its own `onSelect`) |
| `disabled`, `className` | |

Items: `{ id, label, html, value, disabled, onSelect }`. A group: `{ group: 'Title', items: [...] }`.
The item's `id` goes on its `<li>` (the admin's menu icons are styled by those ids).

`table.action(id).setDisabled(true)` disables a button later.

### Table options

```js
tableOptions: {
    button: { id: 'ezbtn-options', label: 'Table options' },
    container: '#to-dialog-container',          // where the dialog element goes (default: the table's element)
    title: 'Table options', close: 'Close',
    limits: { legend: 'Number of items per page:',
              items: [{ id: 1, count: 10 }, { id: 2, count: 25 }],
              onSelect: function (item) { Exp.prefs.set('admin_list_limit', item.id); },
              custom: { label: 'Custom', placeholder: 'Enter number', max: 10000, invalid: 'Please enter ...' } },
    columns: { legend: 'Visible table columns:' }   // false: no column list
}
```

A native modal `<dialog>`, built the first time it opens, with the same field names and ids as the
YUI dialog (`TableOptionValue`, `table-option-row-btn-<id>`, `table-option-custom-input`,
`TableOptionColumn`). Escape and the Close button close it (a click on the backdrop too, with
`backdropCloses: true`); focus goes back to the button. The
custom number is taken on Enter or when the field is left; outside 1 to `max`, `window.alert(invalid)`
says so, as before.

More, for a table with many columns (the admin's sub items):

```js
tableOptions: {
    columns: { legend: 'Visible table columns:',
               filter: { label: 'Find a column:', placeholder: 'Column name', none: 'No columns match.' },
               otherGroup: 'Other',                                          // the heading of columns without a group
               order: { legend: 'Order of the visible columns:', hint: 'Drag a column ...', up: 'Move %name up', down: 'Move %name down' } },
    presets: { legend: 'Column presets:', choose: 'Preset', none: 'None', name: 'Name of the new preset',
               saveAs: 'Save current as...', remove: 'Delete preset',
               items: function () { return [{ id: 'seo', name: 'SEO', own: false, columns: ['name', 'url'] }]; },
               current: function () { return null; },                   // the chosen preset's id
               onApply: function (item) { this.setShown(item.columns); },
               onSave: function (name, keys) { return Promise.resolve(); },  // then the list is drawn again
               onDelete: function (item) { return Promise.resolve(); } },    // only for own: true
    buttons: [{ id: 'my-export', label: 'Export CSV', onClick: function (table) {} }]   // left in the footer
}
```

With any of these the dialog is wider and its body scrolls. The columns are listed by `group`, the
filter hides the ones whose label, group or `title` do not have the text, and with
`columnToggle.ordered` a list of the shown columns lets them be put in order.

### Filter

`filter: { container: '#action-filter', delay: 400, attrs: { id: 'action-filter-input', size: 40 } }`
adds a text field (or `input: '#existing'` uses one). Typing filters after `delay` ms: the table goes
back to the first page and loads with `state.filter`. The field is labelled "Filter".

The instance
------------

```js
var table = $('#my-table').data('expDataTable');      // or $('#my-table').expDataTable('method', args...)
table.load();  table.reload();  table.flushCache();
table.setPage(2);  table.setLimit(50);  table.sortBy('name', 'desc');  table.setFilter('news');
table.page();  table.pages();  table.total;  table.stateCopy();
table.rows();  table.selected();  table.selectAll(true);  table.invert();
table.showColumn('priority');  table.hideColumn('priority');  table.visibleColumns();
table.setShown(['name', 'priority']);  table.moveColumn('priority', -1);  table.shownColumns();  table.copyCell(td);
table.openOptions();  table.closeOptions();  table.action('ezbtn-more');
table.destroy();
```

Calling `$(el).expDataTable(options)` again sets it up again with the new options.

Events
------

Fired on the table's element and through `Exp.on()`, with `table` (the element) in the data:

| Event | Data |
|---|---|
| `exp:datatable:load` | `{ rows, total, state, meta }` after the rows were drawn |
| `exp:datatable:sort` | `{ key, dir }` |
| `exp:datatable:page` | `{ page, offset, limit }` |
| `exp:datatable:filter` | `{ filter }` |
| `exp:datatable:select` | `{ selected, count }` |
| `exp:datatable:edit` | `{ row, key, value, old }` when a value is saved |
| `exp:datatable:invalid` | `{ row, key, value }` when a value was refused |
| `exp:datatable:columns` | `{ shown }` after Table options changed the columns |
| `exp:datatable:options` | `{ open }` |
| `exp:datatable:copy` | `{ row, key, text, copied }` after a copy cell was clicked |
| `exp:datatable:error` | `{ error, state }` (loading) or `{ error, row, key, value }` (saving) |

```js
$('#my-table').on('exp:datatable:select', function (e, d) { $('#remove').prop('disabled', !d.count); });
```

Keyboard and screen readers
---------------------------

| Where | Key | |
|---|---|---|
| header | Tab, Enter or Space | reach a sortable header and sort by it |
| rows | Tab | the row's links, checkboxes and editable cells |
| rows | ArrowUp, ArrowDown | the same control in the row above or below |
| rows | Ctrl+Home, Ctrl+End | the first or last row |
| editable cell | Enter or F2 | edit; then Enter saves, Escape cancels |
| menu button | Enter, Space, ArrowDown, ArrowUp | open the menu on the first or last item |
| menu button | Escape | closes a menu opened with the mouse; the focus stays on the button |
| menu | ArrowUp, ArrowDown, Home, End, a letter | move; Enter or Space chooses; Escape closes and returns to the button; Tab closes |
| pager | Tab, Enter | the page buttons (each says which page) |
| Table options | Escape | close |

Sortable headers say `aria-sort`; the menu buttons `aria-haspopup`, `aria-expanded`,
`aria-controls`; menus are `role="menu"` with `menuitem`s and labelled groups; the busy table says
`aria-busy`; disabled items say `aria-disabled`.

Styles
------

`exp/datatable.css` draws the look the admin gave YUI's table: a dark header, striped rows, the
pager buttons, the menus and the dialog. The `<table>` sits in a `.exp-dt-scroll` element, so a table wider
than its column (a narrow window, a large zoom) scrolls sideways inside the column instead of running over
the next one. Every colour is a custom property on `.exp-dt` (and on its toolbar, pagers and
dialog): `--exp-dt-head`, `--exp-dt-head-sortable`, `--exp-dt-head-sorted`, `--exp-dt-head-ink`,
`--exp-dt-head-line`, `--exp-dt-row`, `--exp-dt-row-alt`, `--exp-dt-row-hover`, `--exp-dt-line`,
`--exp-dt-link`, `--exp-dt-button-ink`, `--exp-dt-button-line`, `--exp-dt-button-hover`,
`--exp-dt-disabled`, `--exp-dt-panel`, `--exp-dt-frame`. Focus rings use `--exp-accent`.

Classes: `.exp-dt` (the element), `.exp-dt-table`, `.exp-dt-body`, `.exp-dt-message`,
`.exp-dt-col-<key>`, `.exp-dt-sortable`, `.exp-dt-asc`, `.exp-dt-desc`, `.exp-dt-editable`,
`.exp-dt-editor`, `.exp-dt-selected` (a checked row), `.exp-dt-action`, `.exp-dt-menu`,
`.exp-dt-pager`, `.exp-dt-dialog`.

Texts
-----

The texts the table shows itself come from `[ExpUI] Strings` through `Exp.i18n()`: the messages
(`No records found.`, `Loading...`, `Data error.`), the sort titles and announcements (`Click to
sort ascending`, `Sorted by %column, ascending` …), the pager labels (`Pages`, `Page %page`,
`Page %page of %pages`, `First page` …), `Table actions`, `Table options` and its dialog's texts,
`Select all`, `Select %name`, `Filter`, `Press Enter to edit`. Labels you pass (columns, buttons,
menu items) are yours to translate in the template.

From YUI
--------

### The admin's sub-items table

Before (`design/admin/javascript/ezajaxsubitems_datatable.js`, started by `children_detailed.tpl`):

```js
YUILoader.require(['datatable', 'button', 'container', 'cookie', 'element']);
YUILoader.onSuccess = function () { sortableSubitems.init(confObj, labelsObj, createGroups, createOptions); };
YUILoader.insert([], 'js');
// inside: new YAHOO.widget.DataTable('content-sub-items-list', columnDefs, dataSource, { paginator, sortedBy, dynamicData: true })
//         new YAHOO.widget.Button({ type: 'menu', id: 'ezbtn-more', menu: [...] }), new YAHOO.widget.SimpleDialog(...),
//         YAHOO.util.Cookie.setSub('eZSubitemColumns', navigationPart, ...), new YAHOO.widget.TextboxCellEditor(...)
```

After (`design/admin/javascript/ezajaxsubitems_expdatatable.js`, same template):

```js
if (window.Exp && Exp.$ && Exp.$.fn.expDataTable && window.eZAjaxSubitemsExpDataTable) {
    Exp.ready(function () { eZAjaxSubitemsExpDataTable.init(confObj, labelsObj, createGroups, createOptions); });
} else {
    // the YUI 2 table, as before
}
// inside: $('#content-sub-items-list').expDataTable({ source: { url: ..., cache: 20 }, paging: { containers: ['#bpg'], compact: ['#tpg'] },
//         select: { key: 'checkbox', name: 'DeleteIDArray[]', ... }, columnToggle: { save: <the eZSubitemColumns cookie> },
//         inlineEdit: { fn: 'ezjscnode::updatepriority', data: ... }, actions: [...], tableOptions: {...} })
```

What it does, the same as before, compared request by request in every admin design on both web
servers:

| | |
|---|---|
| rows | `GET ezjscore/call/ezjscnode::subtree::<node>::<limit>::<offset>::<sort>::<1/0>::<name filter>?ContentType=json`; pages already seen come from the cache (20) |
| rows per page | 10, 25, 50, 100, 200, 500, saved as `admin_list_limit` = 1 to 6 (`user/preferences`, `set_and_exit`); a custom number from 1 to 10000, not saved |
| columns | Table options; saved in the `eZSubitemColumns` cookie, one sub-value per navigation part, `escape()`d and `|` separated, for 10 years; the ini's `[SubItems] VisibleColumns` when there is none |
| priority | `POST ezjscnode::updatepriority` with `ContentNodeID`, `ContentObjectID`, `PriorityID[]`, `Priority[]`; reloads the page when sorted by priority |
| Select | Select all visible, Select none, Invert selection |
| Create new | the class groups and classes; posts the list form with `ClassID` and `NewButton` |
| Create multiple new | posts the list form to `content/multiedit` with `MultiEditCreateParent` and `MultiEditReturnURI` |
| More actions | a hint while nothing is checked; then Remove (`RemoveButton`), Move (`MoveButton`), Copy (`CopyButton`), Hide (`HideButton`), Unhide (`UnhideButton`) and Edit selected (to `content/multiedit` with `MultiEditReturnURI`), each with the checked `DeleteIDArray[]` |
| row menu | the context menu (`ezpopmenu_showTopLevel(..., 'SubitemsContextMenu', ...)`), now also from the keyboard |

New: every control is reachable and usable from the keyboard, the checkboxes are labelled, the
headers say how the table is sorted, and the texts the YUI version had in its code (the custom
number's placeholder and message) are translatable.

### eztags' children table

Before (`design/admin2/javascript/jquery.eztagschildren.js`): `$('#eztags-tag-children-table').eZTagsChildren(settings)`,
which loaded YUI 2 with `YUILoader` and built an `XHRDataSource`, a `DataTable`, a `Paginator`,
three menu buttons, a `SimpleDialog` and a `KeyListener`.

After: the same file adds `$.fn.eZTagsChildrenExp(settings)` on `$.fn.expDataTable`;
`eztags_children_yui.tpl` calls it when Exponential UI is there, and `eZTagsChildren` otherwise.
Same requests (`ezjsctagschildren::tagsChildren::<tag>` with `offset`, `limit`, `sortby`,
`sortdirection`, `filter`), the same filter field (`#action-filter-input`, after 400 ms), the same
forms posted (`tags/add/<tag>/<locale>`, `tags/deletetags`, `tags/movetags`, with
`SelectedIDArray[]`), the same preference (`admin_eztags_list_limit`), the same count in
`#eztags-children-count`.

Tests
-----

`design/standard/javascript/exp/test/datatable.test.js`, 25 tests on `/expui/test`:

- the helpers (dates, numbers, offsets, page links, escaping);
- the markup: header cells, `aria-sort`, hidden columns, the status region;
- sorting by click and its event, back to the first page, numbers as numbers;
- the pagers, full and compact, every button, rows per page, nothing loaded twice;
- every source: a function, a URL (GET, the address, `parse`, the cache and `flushCache()`), a
  server function, rows in the page, an existing table;
- the empty, loading and error messages;
- selection: names, values, labels, select all, invert, shift ranges, without them;
- column toggling, with a callback and with a preference;
- Table options: rows per page, a custom number (and a refused one), columns, Escape, Close;
- menu buttons: ARIA, arrow keys, Home, End, type-ahead, Escape, disabled items, menus built when
  opened, groups, plain and disabled buttons, a click outside;
- inline editing: click, Enter, Escape, an invalid value, leaving the field, the reload when sorted
  by it, a failed save, a server function with its fields;
- the filter, the keyboard in the rows, the plugin's methods, `data-exp-datatable`, `Exp.on()`.

The admin's sub-items table and eztags' children table are also tested by use, as the note at the
top says.
