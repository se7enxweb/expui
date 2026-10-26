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
already (a page that requested a module does) costs one extra request at most and changes
nothing: the running core, its events and its modules stay.

| Key | Loads |
|---|---|
| `exp::core::shared` | the core without its own jQuery when `ezjsc::jquery`, earlier in the same list, loads the same jQuery release (compared by file name); otherwise like `exp::core`. On a page that requests no `ezjsc::jquery` the page then has no jQuery: the core runs on plain JavaScript (see [Without jQuery](#without-jquery)) |
| `exp::collapse` | `Exp.collapse()`, `$.fn.expCollapse` (when the page has jQuery; needs the core) |
| `exp::sticky` | `Exp.sticky`, `$.fn.expSticky` (when the page has jQuery; needs the core) |
| `exp::dialog` | `Exp.dialog`, `data-exp-dialog` (needs the core; `Exp.dialog.form()` also `exp::io`) |
| `exp::upload` | `Exp.upload.create()`, `$.fn.expUpload` (when the page has jQuery), `data-exp-upload` (needs the core; `exp::io` gives failures their `Exp.io.Error` type) |
| `exp::datatable` | `Exp.datatable.create()`, `$.fn.expDataTable` (when the page has jQuery), `data-exp-datatable` (needs the core; `exp::io` for server sources) |
| `exp::datepicker` | `Exp.datepicker`, `Exp.datepicker.create()`, `$.fn.expDatePicker` (when the page has jQuery), `window.showDatePicker()` (needs the core) |
| `exp::autosave` | `Exp.autosave`, `$.fn.expAutosave`, `$.fn.expPreview` (when the page has jQuery; needs the core and, with the preview, `exp::collapse`) |

Their stylesheets: `exp/dialog.css`, `exp/upload.css`, `exp/datatable.css`,
`exp/datepicker.css` (and `exp/autosave.css`, empty for now), each on top of
`exp/core.css`. The admin designs load every stylesheet on every page. admin4
and admin4l load a module's script only on a page that requests it; the older
admin designs (admin, admin3) load every key above but `exp::compat` on every
page.

### Without jQuery

`exp::core::shared` on a page that loads no jQuery: `Exp.$` is `undefined`, and the core,
`exp::io` and every module but `exp::compat` work on plain JavaScript, with the same API (the
differences are named where they are documented below: `Exp.ready()`'s `$`, what
`Exp.register()` hands over, `Exp.io.raw()`, the callbacks and parts that were jQuery). Server
calls go through `fetch`, sent as jQuery sent them: the same address, method, fields
(`Exp.util.param()`), form token, `Accept` and `X-Requested-With` headers, cookies for the same
origin. The uploads stay `XMLHttpRequest`s, as they were.

| Needs jQuery 4 (`Exp.$`) | Works without it |
|---|---|
| `exp::compat` (`$.ez()` hands back a jqXHR) | `exp::core`, `exp::io`, `exp::collapse`, `exp::sticky`, `exp::dialog`, `exp::upload`, `exp::datatable`, `exp::datepicker`, `exp::autosave` |

What changes for code written without jQuery, module by module:

| Module | Entry point without jQuery | jQuery's part, kept where the page has jQuery |
|---|---|---|
| `exp::collapse` | `Exp.collapse(conf)`, `Exp.collapse.get(link)`; the instance's `links` (elements) | `$.fn.expCollapse`, `instance.$link`, `$(link).data('expCollapse')` |
| `exp::sticky` | `Exp.sticky.start(toolbar, options)` (an element, a selector or jQuery), `Exp.sticky.get(toolbar)`; `toolbar`, `form`, `startElement`, `toTop` | `$.fn.expSticky`, `$(toolbar).data('expSticky')` |
| `exp::dialog` | `Exp.dialog.*`, `Exp.dialog.get(element)`; the parts `element`, `header`, `heading`, `closeButton`, `body`, `errorElement`, `footer`; a button's `action(dialog, event)` gets the browser's event | `$el`, `$header`, `$title`, `$close`, `$body`, `$error`, `$footer`, `$(element).data('expDialog')` |
| `exp::upload` | `Exp.upload.create(el, options)`, `Exp.upload.get(el)`; `el`, `root`, `zone`, `input`, `inputs`, `listElement`, `dropZones`; a file's `row`, `bar`, `statusElement`, `cancelButton` | `$.fn.expUpload`, `$el`, `$root`, `$input`, `$zone`, `$list`, `$drop`; a file's `$row`, `$bar`, `$status`, `$cancel` |
| `exp::datepicker` | `Exp.datepicker.create(box, options)` → `{ button, fields }`, `Exp.datepicker.get(box)`, `Exp.datepicker.open()`, `showDatePicker()`; the events' `fields` are elements (`null` for a missing time) | `$.fn.expDatePicker`; the events' `fields` in jQuery |
| `exp::autosave` | `new Exp.autosave.AutoSubmit(conf)`, `new Exp.autosave.Preview(conf)`; the preview's `linkElement`, `placeElement`, `previewElement` | `$.fn.expAutosave`, `$.fn.expPreview`; the preview's `link`, `place`, `preview` |

Events a module triggers on its element (`exp:dialog:*`, `exp:upload:*`, `exp:datatable:*`) are
also `CustomEvent`s that bubble, the data in `event.detail`; with jQuery on the page they are
triggered through jQuery as well, and each listener hears an event once (while the
`CustomEvent` is dispatched, the jQuery that triggered it is told it is triggered already,
`jQuery.event.triggered`). Without jQuery the fields the date picker fills get a native `change`
event, where jQuery's `.trigger('change')` reached only jQuery's handlers and the `onchange`
attribute.

`exp::compat` requested on a page without jQuery sets nothing up and says so in the browser
console (`Exp: exp::compat needs jQuery 4, and this page has none; request
ezjsc::jquery before exp::core::shared`). With jQuery 4 on the page, everything runs on it exactly as before: the
listeners are bound through it (so `.trigger()` reaches them), the animations are its
`.animate()`, the requests its `$.ajax()`.

The core takes the jQuery that is on the page when it boots. A jQuery that arrives later (a
template further down the page requests `ezjsc::jquery` after another one requested
`exp::core::shared`) is not taken over: `Exp.$` stays undefined, `exp::compat` says so in the
console, and the other modules keep running without jQuery. Their jQuery plugins can be put on
such a jQuery with `Exp.<module>.install(jQuery)` (`Exp.collapse`, `Exp.sticky`,
`Exp.datepicker`, `Exp.upload`, `Exp.autosave`, `Exp.datatable`). A page that needs `exp::compat`
requests `ezjsc::jquery` in the same list, in front of `exp::core::shared`.

`Exp` core (`exp::core`)
-----------------------

### `Exp.$`

jQuery 4. Use it (or the `$` that `Exp.ready()` hands you) in code written for the
API. When the page already has jQuery 4 (`ezjsc::jquery` with expui activated
before ezjscore), `Exp.$` is that same jQuery. When the page has an older
jQuery, `window.jQuery` and `window.$` stay that one. When it has none and
`exp::core` brought jQuery 4, jQuery 4 is the page's jQuery too.

**`undefined` without jQuery**: `exp::core::shared` on a page that loads none (or one that is
not a 4.x, which the console reports) leaves `Exp.$` unset and `Exp.jQueryShared` `false`; the
core runs on plain JavaScript ([Without jQuery](#without-jquery)). Test `Exp.$` before using it
in code that may run there.

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
Exp.config.jquery        // "4.0.0"            null without jQuery
Exp.config.tokenElement  // "ezxform_token_js"  where the form token is read from
Exp.config.separator     // "@SEPARATOR$"       between calls in one ezjscore request
```

### `Exp.ready(fn)`

Runs `fn($)` when the DOM is ready and the page's `data-exp-*` modules have been
started. `$` is `Exp.$`: jQuery 4, or `undefined` on a page without jQuery. The functions run in
the order they were given, never synchronously (also after the page was ready), as with jQuery.

### `Exp.i18n(text, params)`

The translation of `text` the server put into the page (`{exp_config()}`, from
`[ExpUI] Strings` and the `strings` you name), else `text` itself. `params`
replaces placeholders:

```js
Exp.i18n('The server answered with an error (HTTP %status).', { '%status': 500 })
```

### `Exp.on(name, fn)`, `Exp.off(name, fn)`, `Exp.emit(name, data)`

Page-wide events. Handlers get `(event, data)`; `event` is jQuery's event, or without jQuery
`{ type, namespace, timeStamp }`. Several names separated by spaces and namespaces
(`name.ns`, `Exp.off('.ns')`) work either way. The core's own events:

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
  started with `init.call(element, $(element), options)`, **once per element**; without jQuery
  with `init.call(element, element, options)`.
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
  `-`, up to 64 characters. A failed request rejects with the jqXHR, or without jQuery with an
  object that has its `status`, `statusText` and `textStatus`.

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

### `Exp.util`

What the plain JavaScript parts use, for code that should run without jQuery:

| | |
|---|---|
| `Exp.util.extend([deep,] target, source…)` | `jQuery.extend()`'s rules (undefined values skipped, `deep` merges plain objects and arrays); it is `jQuery.extend` when the page has jQuery |
| `Exp.util.param(fields)` | `jQuery.param()`'s encoding (`a[b]=1`, `a[]=1`, an array of `{name, value}`); it is `jQuery.param` when the page has jQuery |
| `Exp.util.isPlainObject(value)` | as `jQuery.isPlainObject()` |
| `Exp.util.request(options)` → Promise | a request as `jQuery.ajax()` sends it, on `fetch`: `url`, `method` (`GET`), `data` (fields, a string or `FormData`; added to the address for GET), `dataType` (`'json'`, or the answer's own type), `headers`, `timeout`, `signal`. Form fields go as `application/x-www-form-urlencoded` (`%20` as `+`), `X-Requested-With: XMLHttpRequest` to the same origin, cookies to the same origin only. Rejects with `{ status, statusText, textStatus, responseText, responseJSON, responseURL, getResponseHeader() }` (`textStatus`: `error`, `timeout`, `abort`, `parsererror`); the Promise has `abort()` |
| `Exp.util.css(el, name, value)`, `Exp.util.css(el, { name: value })` | sets styles as jQuery's `.css()` does: a number gets `px` where jQuery adds it (`width`, `top`, `margin…`, not `opacity`), `+=`/`-=`, no negative `width` or `height`, `null` skipped |
| `Exp.util.animate(el, props, ms, complete)` | as jQuery's `.animate()`: the start value read (and converted to the end's unit) as jQuery reads it, its "swing" steps on one timer for every animation (animation frames while the page is visible, else every 13 ms), `overflow: hidden` while a `width` or `height` changes, a value `'show'` or `'hide'` fades in or out (`.fadeIn()`, `.fadeOut()`); started while none runs, the first step is made at once, so one of 0 ms ends at once; `complete` runs with `this` the element |
| `Exp.util.stop(el, jumpToEnd)` | as jQuery's `.stop(true, jumpToEnd)`: stops the element's animations; jumping to the end sets the end values and runs `complete` |

`Exp.io` (`exp::io`)
-------------------

The ezjscore server calls. Same endpoint, arguments and form token as `$.ez()`
and YUI's `io-ez`. Through `jQuery.ajax()` when the page has jQuery 4, else through `fetch`
(`Exp.util.request()`), with the same requests and the same answers.

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
| `response` | the jqXHR (without jQuery: the object `Exp.util.request()` rejects with) or the server's JSON |

### `Exp.io.raw(callString, options)`, `Exp.io.callString(fn, args)`

The building blocks: `callString` gives `'class::function::a::b'`; `raw` sends it
and returns the jqXHR of the call view's JSON (`{error_text, content}`); without jQuery a
Promise of that JSON, with `abort()`.

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
- A link that is no control by itself (an `<a>` without `href`, a `<span>`) and
  has no `role` also gets `role="button"` and `tabindex="0"` (unless it has its
  own), and Enter and Space toggle it, so it is reached and used with the
  keyboard like a button.
- Each change emits `exp:collapse` with `{ link, collapsed }`.

Instance: `collapse()`, `uncollapse()` (also `expand()`), `toggle()`,
`conf.collapsed`, `links` (the link elements); with jQuery also `$link` and
`$(link).data('expCollapse')`. `Exp.collapse.get(link)` finds the instance either way.
Without jQuery the styles are set and animated with `Exp.util.css()` and
`Exp.util.animate()`, by jQuery's rules; with jQuery through it, as before.

### `$(el).expCollapse(conf)`

The same, with `conf.link` = each element, where the page has jQuery
(`Exp.collapse.install(jQuery)` for one loaded later). Everything about it:
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
| `toTopOpacity`, `fade` | `0.85`, `500` | the link's opacity (the default keeps its text at a contrast of at least 4.5:1), and its fade in ms (0 with reduced motion) |

`toolbar` is an element, a selector or jQuery (the first one); no jQuery needed. Instance:
`active` (`false` on a page without the form), `formY` (the scroll position where it fixes),
`onScroll()`, and the elements `toolbar`, `form`, `startElement`, `toTop`.
`Exp.sticky.get(toolbar)` finds it; with jQuery also `$(toolbar).data('expSticky')`.
`$.fn.expSticky` is there where the page has jQuery (`Exp.sticky.install(jQuery)` for one loaded
later).

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
`destroy()`; `isOpen`, `value`; its parts as elements: `element`, `header`, `heading`,
`closeButton`, `body`, `errorElement`, `footer`; with jQuery also in jQuery (`$el`, `$header`,
`$title`, `$close`, `$body`, `$error`, `$footer`) and `$(dialog.element).data('expDialog')`.
`Exp.dialog.get(element)` finds a dialog either way. Without jQuery `load()` and `url` go through
`fetch` (`Exp.util.request()`: the same method, fields, `Accept: text/html,*/*`), a button's
`action(dialog, event)` gets the browser's event, and `scripts: true` runs the content's scripts
by putting new `<script>` elements in their place (a `src` one loads as the browser loads it,
where jQuery fetched it at once).

Events (on the `<dialog>`, as `CustomEvent`s and with jQuery through it as well, and
page-wide): `exp:dialog:open` `{ dialog }`, `exp:dialog:close` `{ dialog, value }`. Markup: `data-exp-dialog` with
`confirm`, `form`, `template` or `url`, and `data-exp-dialog-close` inside a
dialog. Everything about it: [modules/dialog.md](modules/dialog.md).

`exp::upload`
-------------

### `Exp.upload.create(el, options)`, `$(el).expUpload(options)`

Files uploaded one request per file, with progress, Cancel, several at once and
drop zones. `el` is a container (the chooser, the drop hint and the list are
built in it) or an `<input type="file">`. `Exp.upload.create()` needs no jQuery and returns the
instance (an element that has one keeps it); `$.fn.expUpload` is there where the page has jQuery
(`Exp.upload.install(jQuery)` for one loaded later). The requests are the same either way: one
`XMLHttpRequest` POST per file to `url`, `Accept: */*` (`application/json, text/javascript, */*`
with `responseType: 'json'`) and the `headers`, a `FormData` of the form's fields (the file in its
place) or of `data` then the file, the form token added unless `token: false` or the fields have
one; upload progress, `abort()` on Cancel, the error kinds `signedout`, `refused`, `server`,
`invalid`, `network`, `timeout`.

Options: `url` (required), `name`, `multiple`, `accept`, `drop`, `maxSize`,
`data`, `form`, `token`, `auto`, `parallel`, `responseType` (`auto`, `json`,
`text`), `headers`, `list`, `input`, `texts`, and the callbacks `onAdd`,
`onRefuse`, `onStart`, `onProgress`, `onDone(response, file)`,
`onFail(error, file)`, `onCancel`, `onComplete(summary)`.

The instance (`Exp.upload.get(el)`, `$(el).expUpload('instance')` or `$(el).data('expUpload')`):
`add(files)`, `start()` (a Promise of the summary), `cancel(file | id)` (no
argument: all), `files()`, `progress()`, `clear()`, `enable()`, `disable()`,
`destroy()`; its parts as elements (`el`, `root`, `zone`, `input`, `inputs`, `listElement`,
`dropZones`) and, with jQuery, in jQuery (`$el`, `$root`, `$input`, `$zone`, `$list`, `$drop`).
A file (what the callbacks and events get) has `id`, `name`, `size`, `type`, `status`, `percent`,
`loaded`, `total`, `response`, `error`, and its `row`, `bar`, `statusElement`, `cancelButton`
(with jQuery also `$row`, `$bar`, `$status`, `$cancel`). `$(el).expUpload('start')` and the like
call a method on each element.

`Exp.upload.size(bytes)` (`"1.5 kB"`, in the page's language),
`Exp.upload.accepted(file, accept)`, `Exp.upload.Upload` (the class).

Events (on the element, as `CustomEvent`s and with jQuery through it as well, and page-wide),
with `{ upload, file, … }`:
`exp:upload:add`, `:refuse` `{ reason }`, `:start`, `:progress`
`{ loaded, total, percent, overall }`, `:done` `{ response }`, `:fail`
`{ error }`, `:cancel`, and `:complete` `{ upload, files, done, failed, canceled }`.
Markup: `data-exp-upload` with the options as JSON. Everything about it:
[modules/upload.md](modules/upload.md).

`exp::datatable`
----------------

### `Exp.datatable.create(el, options)`, `$(el).expDataTable(options)`

Sortable, paged tables with selection, column toggling, inline editing, action
menus, a "Table options" dialog and a filter. `el` is an element to build the
table in, or an existing `<table>` (its header gives the columns, its rows the
data). `Exp.datatable.create()` needs no jQuery and returns the instance; with jQuery on the page
`$.fn.expDataTable` does the same, its callbacks getting jQuery objects as before (`render(row,
$td)`), where `create()`'s get elements (`render(row, td)`).

Options: `columns`, `source` (`{ rows }`, `{ dom: true }`, `{ url, … }`,
`{ fn, args, … }` for `Exp.io.call()`, or a function of the state), `rowKey`,
`sort`, `paging` (or `false`), `select`, `columnToggle`, `inlineEdit`,
`actions`, `actionsContainer`, `tableOptions`, `filter`, `keyboard`, `empty`,
`loading`, `error`, `caption`, `tableClass`, `dateFormat`, `onLoad`, `onRender`,
`initialLoad`.

The instance (`Exp.datatable.get(el)`, `$(el).data('expDataTable')`, or
`$(el).expDataTable('method', args…)`): `load()`, `reload()`, `flushCache()`,
`setPage()`, `setLimit()`, `sortBy(key, dir)`, `setFilter()`, `page()`,
`pages()`, `total`, `stateCopy()`, `rows()`, `selected()`, `selectAll()`,
`invert()`, `showColumn()`, `hideColumn()`, `visibleColumns()`,
`openOptions()`, `closeOptions()`, `action(id)`, `rowData(tr)`, `destroy()`; its parts as
elements (`table`, `body`, `head`, `pagers` …) and, with jQuery, in jQuery (`$table`, `$body` …).
Setting it up again on the same element replaces it.

`Exp.datatable`: `create()`, `get()`, `install(jQuery)` (`$.fn.expDataTable` on a jQuery loaded
later), `DataTable` (the class) and its helpers `formatDate()`, `validateNumber()`,
`normalizeOffset()`, `pageRange()`, `escapeHtml()`.

Events (on the element as `CustomEvent`s with the data in `event.detail`, through jQuery as well
when the page has it, and page-wide), with `{ table, … }`:
`exp:datatable:load`, `:sort`, `:page`, `:filter`, `:select`, `:edit`,
`:invalid`, `:columns`, `:options`, `:error`. Markup: `data-exp-datatable`
with the options as JSON. Everything about it:
[modules/datatable.md](modules/datatable.md).

`exp::datepicker`
-----------------

### `Exp.datepicker.create(el, options)`, `$(el).expDatePicker(options)`

A calendar for existing date fields: `fields` (`year`, `month`, `day`, optional
`hour`, `minute`, selectors inside `el`), `button`, `min` (`'1970-01-01'`),
`max`, `firstDay` (the siteaccess's). Choosing a day fills the fields without
leading zeros and an empty time with 12:00. `Exp.datepicker.create()` needs no jQuery and returns
`{ button, fields }` (elements; `null` without a year field), `Exp.datepicker.get(el)` the same
later; `$.fn.expDatePicker` is there where the page has jQuery and keeps the fields in jQuery
(`$(el).data('expDatePicker')`; `Exp.datepicker.install(jQuery)` for a jQuery loaded later).

`Exp.datepicker.open({ fields, anchor, container, min, max, firstDay, onSelect })`
opens one now and returns `{ close(), element }` (or `null`);
`Exp.datepicker.close()`, `Exp.datepicker.isOpen()`.
`window.showDatePicker( base, id, datatype )` is what the date templates'
calendar icon calls.

Events (page-wide): `exp:datepicker:open` `{ fields }`,
`exp:datepicker:select` `{ date, fields }`, `exp:datepicker:close`
`{ fields }`. `fields` are jQuery objects where the page has jQuery and the calendar was opened
with `open()`, `showDatePicker()` or `$.fn.expDatePicker` (as before), else elements (`null` for
a missing time). Without jQuery each field filled gets a native `change` event; with jQuery
`.trigger('change')`, as before. Everything about it: [modules/datepicker.md](modules/datepicker.md).

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
`Exp.autosave.serializeForm(form, ignoreClass)`. Both need no jQuery. Without it the draft is
posted through `fetch` (`Exp.util.request()`) exactly as `$.ajax()` posted it: `POST` to
`action`, the form's `FormData` (the extra fields after it, the form token added when the form
has none), `Accept: text/plain, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`; a save
replaced by a newer one or cut off by `stop()` is aborted (`abort` only for the second). The
preview's parts are elements (`linkElement`, `placeElement`, `previewElement`); with jQuery also
`link`, `place`, `preview` in jQuery, as before. `$.fn.expAutosave` and `$.fn.expPreview` are
there where the page has jQuery (`Exp.autosave.install(jQuery)` for one loaded later). Events (page-wide):
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
