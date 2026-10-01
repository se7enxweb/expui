API reference
=============

Version 1.0.0.1. Everything below is available today; [MODULES.md](MODULES.md)
lists what lands next. The modules (`exp::collapse` and after) are summed up
here; each has its full page in `doc/modules/`.

Loading
-------

| Template | Loads |
|---|---|
| `{exp_config( hash( 'prefs', array(…), 'strings', array(…) ) )}` | the page's configuration block (in the pagelayout's `<head>`, and again wherever a template needs its own preferences or texts) |
| `{ezscript_require( 'exp::core' )}` | jQuery 4, jQuery Migrate 4 (while `[ExpUI] Migrate=enabled`), the core |
| `{ezscript_require( array( 'exp::core', 'exp::io' ) )}` | … and the server calls |
| `{ezscript_require( array( 'exp::core', 'exp::io', 'exp::compat' ) )}` | … and `$.ez()` over `Exp.io` |
| `{ezcss_require( 'exp/core.css' )}` | the design tokens (`--exp-*`) and utilities |

`ezscript_require` collects the scripts for the page's `<head>`; `ezscript`
writes them where it stands. Both work: the core reads `{exp_config()}`'s block
when it loads, or when the page is ready if the block comes later.

**Several blocks are merged.** The admin designs write one in their `<head>`;
a template adds its own for its preferences and texts
(`{exp_config( hash( 'prefs', array( 'myext_open' ) ) )}`). The core merges
every block in page order: configuration deeply, texts and preferences by
name.

**The core runs once per page.** Asking for `exp::core` on a page that has it
already (every admin page does) costs one extra request at most and changes
nothing: the running core, its events and its modules stay.

| Key | Loads |
|---|---|
| `exp::core::shared` | the core without its own jQuery when `ezjsc::jquery`, earlier in the same list, loads the same jQuery release (compared by file name); otherwise like `exp::core` |
| `exp::collapse` | `Exp.collapse()`, `$.fn.expCollapse` (needs the core) |
| `exp::sticky` | `Exp.sticky`, `$.fn.expSticky` (needs the core) |
| `exp::dialog` | `Exp.dialog`, `data-exp-dialog` (needs the core; `Exp.dialog.form()` also `exp::io`) |
| `exp::upload` | `Exp.upload`, `$.fn.expUpload`, `data-exp-upload` (needs the core; `exp::io` gives failures their `Exp.io.Error` type) |
| `exp::datatable` | `Exp.datatable`, `$.fn.expDataTable`, `data-exp-datatable` (needs the core; `exp::io` for server sources) |
| `exp::datepicker` | `Exp.datepicker`, `$.fn.expDatePicker`, `window.showDatePicker()` (needs the core) |
| `exp::autosave` | `Exp.autosave`, `$.fn.expAutosave`, `$.fn.expPreview` (needs the core; the preview also `exp::collapse`) |

Their stylesheets: `exp/dialog.css`, `exp/upload.css`, `exp/datatable.css`,
`exp/datepicker.css` (and `exp/autosave.css`, empty for now), each on top of
`exp/core.css`. The admin designs load every key above but `exp::compat`, and
every stylesheet, on every page.

`Exp` core (`exp::core`)
-----------------------

### `Exp.$`

jQuery 4. Use it (or the `$` that `Exp.ready()` hands you) in code written for the
API. When the page already has jQuery 4 (`ezjsc::jquery` with expui activated
before ezjscore), `Exp.$` is that same jQuery. When the page has an older
jQuery, `window.jQuery` and `window.$` stay that one. When it has none,
jQuery 4 is the page's jQuery too.

```js
Exp.$.fn.jquery          // "4.0.0"
Exp.jQueryShared         // true when jQuery 4 is also window.jQuery
```

### `Exp.version`, `Exp.config`

```js
Exp.version              // "1.0.0.1"
Exp.config.root          // "/admin/"           the siteaccess's base address
Exp.config.www           // "/"                 the installation's web root
Exp.config.siteaccess    // "admin"
Exp.config.call          // "/admin/ezjscore/call/"
Exp.config.prefsUrl      // "/admin/user/preferences"
Exp.config.locale        // { code: "eng-GB", http: "en-GB", firstDay: 1 }   firstDay: 1 = Monday
Exp.config.jquery        // "4.0.0"
Exp.config.tokenElement  // "ezxform_token_js"  where the form token is read from
Exp.config.separator     // "@SEPARATOR$"       between calls in one ezjscore request
```

### `Exp.ready(fn)`

Runs `fn($)` when the DOM is ready and the page's `data-exp-*` modules have been
started. `$` is jQuery 4.

### `Exp.i18n(text, params)`

The translation of `text` the server put into the page (`{exp_config()}`, from
`[ExpUI] Strings` and the `strings` you name), else `text` itself. `params`
replaces placeholders:

```js
Exp.i18n('The server answered with an error (HTTP %status).', { '%status': 500 })
```

### `Exp.on(name, fn)`, `Exp.off(name, fn)`, `Exp.emit(name, data)`

Page-wide events. Handlers get `(event, data)`. The core's own events:

| Event | Data |
|---|---|
| `exp:started` | `{ root, only }` after `Exp.start()` |
| `exp:prefs:set` | `{ name, value }` after a preference was saved |

The modules' events are listed with each module below:
`exp:collapse`, `exp:dialog:*`, `exp:upload:*`, `exp:datatable:*`,
`exp:datepicker:*`, `exp:autosave:*`. The dialog, upload and datatable events
are also triggered on their element, and bubble.

### `Exp.register(name, init)`, `Exp.start(root, only)`, `Exp.modules()`

```js
Exp.register('counter', function ($el, options) { /* … */ });
```

- `name`: lower-case letters, digits and `-`. Elements with `data-exp-<name>` are
  started with `init.call(element, $(element), options)`, **once per element**.
- `options`: the attribute's value parsed as JSON when it starts with `{`, else
  `{ value: "<the attribute>" }`, else `{}`.
- Registered after the page was ready: started at once.
- `Exp.start(root)` starts the modules below `root` (after inserting HTML);
  `only`: an array of module names.
- An exception in one module is logged and does not stop the others.

### `Exp.prefs.get(name, fallback)`, `Exp.prefs.set(name, value)`

User preferences, the ones `ezpreference()` reads in templates.

- `get`: the value the server had when the page was made (ask for it with
  `{exp_config( hash( 'prefs', array( 'name' ) ) )}`), or what you set since;
  else `fallback`.
- `set`: saves it for the signed-in user (`user/preferences`, with the form
  token); returns a Promise of the saved value. Names: letters, digits, `_`, `.`,
  `-`, up to 64 characters.

### `Exp.keys.bind(combo, fn, options)`, `Exp.keys.unbind(id)`

```js
var id = Exp.keys.bind('/', function () { $('#search').focus(); return false; });
Exp.keys.bind('ctrl+s', save, { inInputs: true });
Exp.keys.bind('Escape', close, { scope: '#my-dialog' });
Exp.keys.unbind(id);
```

- `combo`: a key (`k`, `/`, `Escape`, `Enter`, `space`) with optional `ctrl+`,
  `alt+`, `shift+`, `meta+`.
- Not while typing in a field unless `inInputs: true`; only inside `scope` when
  given. Returning `false` prevents the browser's default.

### `Exp.reducedMotion`, `Exp.token()`

`true` when the user asked the system for less motion. `Exp.token()` is the
page's form token (`#ezxform_token_js`), or `''`.

The `<html>` element gets the class `exp-js`.

`Exp.io` (`exp::io`)
-------------------

The ezjscore server calls. Same endpoint, arguments and form token as `$.ez()`
and YUI's `io-ez`.

### `Exp.io.call(fn, args, options)` → Promise

```js
Exp.io.call('ezjscnode::subtree', [2, 25, 0]).then(content => …, error => …)
```

- `fn`: `'class::function'` as ezjscore knows it.
- `args`: an array (or one value) of arguments; none may contain `::`.
- `options.method`: `'POST'` (default) or `'GET'`; `options.data`: more POST
  fields (object, `[{name, value}]` or a query string); `options.timeout` in ms;
  `options.signal`: an `AbortSignal`.
- Resolves with the server function's `content`; rejects with an
  `Exp.io.Error`.

### `Exp.io.form(form, options)` → Promise

Posts a form with its fields and files (`FormData`), to its `action` or
`options.url`, adding the form token when the form has none.
`options.submitter`: the button that submitted it (its name and value are sent).
Resolves with the response (parsed when JSON).

### `Exp.io.poll(fn, args, options)` → Promise

Calls `fn` again every `options.every` ms (2000) until `options.until(content)`
is true, then resolves with that content. Rejects (`timeout`) after
`options.max` calls (150), or with the first failure. `options.onTick(content, n)`
after each call.

```js
// asynchronous publishing: wait until the object's version is published, then open it
Exp.io.poll('ezpublishingqueue::status', [contentObjectId, version], {
    every: 1000, until: function (s) { return s.status === 'finished'; }
}).then(function (s) { window.location.href = s.node_uri; });   // node_uri is a full address already
```

### `Exp.io.url(path)`

`Exp.io.url('content/view/full/2')` → `/admin/content/view/full/2`.

### `Exp.io.Error`

| Property | |
|---|---|
| `kind` | `signedout` (session ended, status 401), `refused` (403), `server` (an HTTP error, or the server function's `error_text`), `network` (no answer or aborted), `timeout`, `invalid` (bad arguments; nothing was sent) |
| `status` | the HTTP status (0 when there was none) |
| `message` | a translated message, or the server function's error text |
| `response` | the jqXHR or the server's JSON |

### `Exp.io.raw(callString, options)`, `Exp.io.callString(fn, args)`

The building blocks: `callString` gives `'class::function::a::b'`; `raw` sends it
and returns the jqXHR of the call view's JSON (`{error_text, content}`).

`exp::compat`
-------------

Installs `$.ez(callArgs, post, callBack)` on the page's jQuery and on `Exp.$`, as a
wrapper over `Exp.io.raw()`: same arguments, same jqXHR back (`.done()`, `.fail()`,
`.then()`), same `$.ez.url`, `$.ez.root_url`, `$.ez.seperator`,
`$.ez.setPreference(name, value)`. Use it while code written for `$.ez()` is moved.
`Exp.compat.install(jq)` installs it on another jQuery (once).

`exp::collapse`
---------------

### `Exp.collapse(conf)` → instance

A menu or panel that collapses and expands, and remembers it per user. The
configuration is that of YUI's `Y.eZ.CollapsibleMenu`, plus `pref`:

```js
Exp.collapse({
    link: '#rightmenu-showhide',          // the element that collapses and expands it
    collapsed: 0,                         // the state the page was made in: 0/1 or "0"/"1"
    content: ['', ''],                    // the link's HTML when expanded / collapsed; false: left alone
    elements: [{
        selector: '#rightmenu',
        duration: 0.4,                    // seconds
        fullStyle: { width: '201px' },
        collapsedStyle: { width: '18px' }
    }],
    pref: { name: 'admin_right_menu_show', values: [1, 0] },   // saved as values[collapsed]
    callback: function () {},             // after each change; this: the instance
    beforecollapse: fn, aftercollapse: fn, beforeuncollapse: fn, afteruncollapse: fn
});
```

- Style values may be functions, called at the moment of the change.
- Sizes (`px`, `em`, `rem`, `%`, plain numbers) are animated over `duration`.
  Other values (`no-repeat`, `unset`) are set at once. With reduced motion,
  everything is set at once.
- `after*` runs when the first element's animation ends.
- The link gets `aria-expanded`, and its click is handled (its `href` stays as
  the no-script fallback).
- Each change emits `exp:collapse` with `{ link, collapsed }`.

Instance: `collapse()`, `uncollapse()` (also `expand()`), `toggle()`,
`conf.collapsed`; `$(link).data('expCollapse')`.

### `$(el).expCollapse(conf)`

The same, with `conf.link` = each element. Everything about it:
[modules/collapse.md](modules/collapse.md).

`exp::sticky`
-------------

### `$(toolbar).expSticky(options)`, `Exp.sticky.start(toolbar, options)` → instance

A toolbar that stays in view once the page is scrolled past its start, and a
"go to the top" link. It works the way the admin's `fixed_toolbar.js` did, and
uses its class, so the admin's styles and other extensions keep working:

| Option | Default | |
|---|---|---|
| `form` | `'#editform, #ClassEdit'` | only on pages with this form |
| `start` | `'#columns'` | the toolbar is fixed once this element's top scrolls under it |
| `className` | `'controlbar-fixed'` | the class it gets while fixed |
| `toTop` | `'.scroll-to-top'` | faded in below the start, out above it; a click hides it |
| `scrollToStart` | `true` | on load, scroll to the start and focus the form's first text field |
| `toTopOpacity`, `fade` | `0.6`, `500` | the link's opacity, and its fade in ms (0 with reduced motion) |

Instance: `active` (`false` on a page without the form), `formY` (the scroll
position where it fixes), `onScroll()`.

### `Exp.sticky.admin()`

`Exp.sticky.start('#controlbar-top')` with the defaults above: the admin's edit
forms. `exp::sticky` calls it when the page is ready, and `fixed_toolbar.js`
returns at once when `Exp.sticky` is there.

Everything about it: [modules/sticky.md](modules/sticky.md).

`exp::dialog`
-------------

Modal dialogs on the native `<dialog>` element. Every call returns a Promise;
a dismissed dialog resolves with `null` (`confirm`: `false`).

| Call | Resolves with |
|---|---|
| `Exp.dialog.open(options)` | the value of the button that closed it, or `null` |
| `Exp.dialog.confirm(text, { okLabel, cancelLabel, danger, title, size, onClose })` | `true` or `false` |
| `Exp.dialog.alert(text, { okLabel, title, size, onClose })` | `undefined` |
| `Exp.dialog.form(url, { title, content, action, onResponse, … })` | the server's answer to the posted form (`Exp.io.form()`), or `null` |
| `Exp.dialog.create(options)` | (returns the dialog, not opened) |
| `Exp.dialog.current()`, `Exp.dialog.closeAll()` | (the dialog on top or `null`; dismisses every open one) |

Each returned Promise has the dialog as `.dialog`. Options of `open`: `title`,
`content` / `url` (with `method`, `data`) / `template`, `buttons` (`label`,
`value`, `primary`, `danger`, `name`, `action`, `close`), `size` (`s`, `m`, `l`,
`xl`), `width`, `className`, `dismissible`, `closeOnBackdrop`, `closeSelector`,
`initialFocus`, `role`, `describedBy`, `labelledBy`, `keep`, `scripts`,
`onOpen`, `onClose`.

The dialog: `open()`, `close(value)`, `setTitle()`, `setContent()`,
`setButtons()`, `load(url, { method, data })`, `busy(on)`, `error(text)`,
`destroy()`; `isOpen`, `value`, `element`, `$body`;
`$(dialog.element).data('expDialog')`.

Events (on the `<dialog>` and page-wide): `exp:dialog:open` `{ dialog }`,
`exp:dialog:close` `{ dialog, value }`. Markup: `data-exp-dialog` with
`confirm`, `form`, `template` or `url`, and `data-exp-dialog-close` inside a
dialog. Everything about it: [modules/dialog.md](modules/dialog.md).

`exp::upload`
-------------

### `$(el).expUpload(options)`

Files uploaded one request per file, with progress, Cancel, several at once and
drop zones. `el` is a container (the chooser, the drop hint and the list are
built in it) or an `<input type="file">`.

Options: `url` (required), `name`, `multiple`, `accept`, `drop`, `maxSize`,
`data`, `form`, `token`, `auto`, `parallel`, `responseType` (`auto`, `json`,
`text`), `headers`, `list`, `input`, `texts`, and the callbacks `onAdd`,
`onRefuse`, `onStart`, `onProgress`, `onDone(response, file)`,
`onFail(error, file)`, `onCancel`, `onComplete(summary)`.

The instance (`$(el).expUpload('instance')` or `$(el).data('expUpload')`):
`add(files)`, `start()` (a Promise of the summary), `cancel(file | id)` (no
argument: all), `files()`, `progress()`, `clear()`, `enable()`, `disable()`,
`destroy()`. `$(el).expUpload('start')` and the like call a method on each
element.

`Exp.upload.size(bytes)` (`"1.5 kB"`, in the page's language),
`Exp.upload.accepted(file, accept)`, `Exp.upload.Upload` (the class).

Events (on the element and page-wide), with `{ upload, file, … }`:
`exp:upload:add`, `:refuse` `{ reason }`, `:start`, `:progress`
`{ loaded, total, percent, overall }`, `:done` `{ response }`, `:fail`
`{ error }`, `:cancel`, and `:complete` `{ upload, files, done, failed, canceled }`.
Markup: `data-exp-upload` with the options as JSON. Everything about it:
[modules/upload.md](modules/upload.md).

`exp::datatable`
----------------

### `$(el).expDataTable(options)`

Sortable, paged tables with selection, column toggling, inline editing, action
menus, a "Table options" dialog and a filter. `el` is an element to build the
table in, or an existing `<table>` (its header gives the columns, its rows the
data).

Options: `columns`, `source` (`{ rows }`, `{ dom: true }`, `{ url, … }`,
`{ fn, args, … }` for `Exp.io.call()`, or a function of the state), `rowKey`,
`sort`, `paging` (or `false`), `select`, `columnToggle`, `inlineEdit`,
`actions`, `actionsContainer`, `tableOptions`, `filter`, `keyboard`, `empty`,
`loading`, `error`, `caption`, `tableClass`, `dateFormat`, `onLoad`, `onRender`,
`initialLoad`.

The instance (`$(el).data('expDataTable')`, or
`$(el).expDataTable('method', args…)`): `load()`, `reload()`, `flushCache()`,
`setPage()`, `setLimit()`, `sortBy(key, dir)`, `setFilter()`, `page()`,
`pages()`, `total`, `stateCopy()`, `rows()`, `selected()`, `selectAll()`,
`invert()`, `showColumn()`, `hideColumn()`, `visibleColumns()`,
`openOptions()`, `closeOptions()`, `action(id)`, `destroy()`. Calling
`$(el).expDataTable(options)` again sets it up again.

`Exp.datatable`: `DataTable` (the class) and its helpers `formatDate()`,
`validateNumber()`, `normalizeOffset()`, `pageRange()`, `escapeHtml()`.

Events (on the element and page-wide), with `{ table, … }`:
`exp:datatable:load`, `:sort`, `:page`, `:filter`, `:select`, `:edit`,
`:invalid`, `:columns`, `:options`, `:error`. Markup: `data-exp-datatable`
with the options as JSON. Everything about it:
[modules/datatable.md](modules/datatable.md).

`exp::datepicker`
-----------------

### `$(el).expDatePicker(options)`

A calendar for existing date fields: `fields` (`year`, `month`, `day`, optional
`hour`, `minute`, selectors inside `el`), `button`, `min` (`'1970-01-01'`),
`max`, `firstDay` (the siteaccess's). Choosing a day fills the fields without
leading zeros and an empty time with 12:00.

`Exp.datepicker.open({ fields, anchor, container, min, max, firstDay, onSelect })`
opens one now and returns `{ close(), element }` (or `null`);
`Exp.datepicker.close()`, `Exp.datepicker.isOpen()`.
`window.showDatePicker( base, id, datatype )` is what the date templates'
calendar icon calls.

Events (page-wide): `exp:datepicker:open` `{ fields }`,
`exp:datepicker:select` `{ date, fields }`, `exp:datepicker:close`
`{ fields }`. Everything about it: [modules/datepicker.md](modules/datepicker.md).

`exp::autosave`
---------------

### `new Exp.autosave.AutoSubmit(conf)`, `$(form).expAutosave(conf)`

Saves a form as a draft while it is edited, only when it changed: `form`,
`action`, `interval` (300 s), `trackUserInput`, `ignoreClass`, `enabled`,
`beforeSerialize` (default: TinyMCE's `triggerSave()`). Methods: `start()`,
`stop()`, `submit(fields)`, `on(event, fn)` with `init`, `beforesave`,
`success`, `error`, `abort`, `nochange`. `Exp.emit('autosubmit:forcesave')`
saves every autosave on the page now.

### `new Exp.autosave.Preview(conf)`, `$(el).expPreview(conf)`

The draft's preview in the edit page: `buttonPlace`, `place`, `preview`,
`element`, `texts`, `topPosition`, `previewTemplate`, `elementTemplate`.
Methods: `init()`, `loading()`, `setContent(html)`, `error(text)`, `close()`.

Also `Exp.autosave.instances` (by form id) and
`Exp.autosave.serializeForm(form, ignoreClass)`. Events (page-wide):
`exp:autosave:<event>` with `{ form }` (and `json` for `success` and `error`).
Everything about it: [modules/autosave.md](modules/autosave.md).

CSS (`exp/core.css`)
--------------------

Custom properties on `:root`, overridable on `:root` or any `.exp-scope`:

| Token | Default |
|---|---|
| `--exp-ink`, `--exp-muted`, `--exp-faint` | text colours |
| `--exp-line`, `--exp-soft`, `--exp-card` | borders and surfaces |
| `--exp-accent`, `--exp-accent-dark`, `--exp-accent-ring` | the Exponential orange and its focus ring |
| `--exp-ok`, `--exp-warn`, `--exp-bad`, `--exp-info` (+ `-bg`) | states |
| `--exp-radius`, `--exp-radius-s`, `--exp-shadow`, `--exp-shadow-up` | shapes |
| `--exp-mono`, `--exp-speed` | monospace font; transition speed (0s with reduced motion) |

Utilities: `.exp-visually-hidden`, `.exp-focus-ring`.
