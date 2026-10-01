Converting YUI to Exponential UI
================================

**Most sites do not need to do anything.** The kernel, the admin and the
extensions that ship with Exponential are converted for you, release by release.
This guide is for the few who wrote their **own** JavaScript with YUI — in a
custom extension or design, often years ago — and want to move it to the new
API before YUI leaves Exponential.

Nothing breaks while you read this: YUI stays loaded until every part of
Exponential has moved, and the [roadmap](ROADMAP.md) announces the release that
removes it well in advance.

---

Step 1 — Do you need to do anything?
-----------------------------------

Run this from your installation root. Replace `extension/myextension` and
`design/mydesign` with **your own** extensions and designs (not the ones that
come with Exponential):

```sh
grep -rnE "YAHOO\.|YUI\(|YUI\.add|ezjsc::yui|io-ez|Y\.io\.ez|yui3-|yui-skin-sam" \
     extension/myextension design/mydesign \
     --include=*.tpl --include=*.js --include=*.php --include=*.ini --include=*.append.php --include=*.css
```

| What it prints | What to do |
|---|---|
| **Nothing** | You are done. Nothing to change, now or later. |
| Lines in your own files | Go on with step 2. Each line is one place to convert. |

Not sure which extensions are yours? `ls extension/` — anything you or your
agency wrote. The `ez*`, `exp*`, `sevenx_*` extensions and the ones you installed
with Composer come with their own conversions.

Also check jQuery code of your own (the admin moves to jQuery 4 too):

```sh
grep -rnE "\\$\.(trim|isArray|parseJSON|type|isFunction|isNumeric|now|proxy|browser)\(|\.size\(\)|\.(bind|unbind|delegate|undelegate|live|die)\(" \
     extension/myextension design/mydesign --include=*.tpl --include=*.js
```

Every match there is in the [jQuery 4 table](#step-6--jquery-3-code-on-jquery-4)
below.

---

Step 2 — Load the new API instead of YUI
----------------------------------------

Find where your template loads YUI:

```sh
grep -rn "ezjsc::yui" extension/myextension design/mydesign
```

**Before**

```html
{ezscript_require( array( 'ezjsc::yui3', 'ezjsc::yui3io', 'mycode.js' ) )}
```

**After**

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io', 'mycode.js' ) )}
```

- `ezjsc::yui3` → `exp::core` (jQuery 4 and `Exp`)
- `ezjsc::yui3io` → `exp::io` (server calls)
- `ezjsc::yui2` → `exp::core`
- Add `{exp_config()}` before the scripts, best once in your pagelayout's
  `<head>` (the admin designs have it already). A template that needs its own
  preferences or texts may add another; the core merges them.

In `design.ini` lists (`JavaScriptList[]`, `BackendJavaScriptList[]`,
`FrontendJavaScriptList[]`) the same keys are replaced the same way:

```ini
# before
BackendJavaScriptList[]=ezjsc::yui3
BackendJavaScriptList[]=ezjsc::yui3io
# after
BackendJavaScriptList[]=exp::core
BackendJavaScriptList[]=exp::io
```

Then clear the caches:

```sh
php bin/php/ezcache.php --clear-tag=template,ini
php bin/php/ezcache.php --clear-id=ezjscore-packer,template-block
```

---

Step 3 — Replace the YUI wrapper of your script
-----------------------------------------------

**YUI 3, before**

```js
YUI( YUI3_config ).use( 'node', 'event', 'io-ez', function( Y )
{
    Y.on( 'domready', function()
    {
        // your code, using Y
    });
});
```

**YUI 2, before**

```js
YAHOO.util.Event.onDOMReady( function()
{
    // your code, using YAHOO.util.*
});
```

**After (both)**

```js
Exp.ready(function ($) {
    // your code, using $ (jQuery 4) and Exp
});
```

---

Step 4 — Replace each YUI call
------------------------------

Work through your file top to bottom; every YUI call has a one-line
replacement. `$` below is the jQuery 4 that `Exp.ready()` gives you.

### Finding elements

| YUI | Exponential UI |
|---|---|
| `Y.one('#menu')` | `$('#menu')` |
| `Y.all('.item')` | `$('.item')` |
| `Y.one('#menu').one('a')` | `$('#menu').find('a').first()` |
| `node.get('parentNode')` | `$el.parent()` |
| `node.ancestor('form')` | `$el.closest('form')` |
| `YAHOO.util.Dom.get('menu')` | `document.getElementById('menu')` or `$('#menu')` |
| `YAHOO.util.Dom.getElementsByClassName('item', 'li', root)` | `$(root).find('li.item')` |

### Reading and changing elements

| YUI | Exponential UI |
|---|---|
| `node.addClass('open')` / `removeClass` / `toggleClass` / `hasClass` | `$el.addClass('open')` / `removeClass` / `toggleClass` / `hasClass` |
| `YAHOO.util.Dom.addClass(el, 'open')` | `$(el).addClass('open')` |
| `node.setStyle('display', 'none')` | `$el.css('display', 'none')` (or `.hide()`) |
| `YAHOO.util.Dom.setStyle(el, 'width', '10px')` | `$(el).css('width', '10px')` |
| `node.get('value')` / `node.set('value', x)` | `$el.val()` / `$el.val(x)` |
| `node.getAttribute('data-x')` / `setAttribute` | `$el.attr('data-x')` / `$el.attr('data-x', v)` |
| `node.setHTML(html)` / `node.set('innerHTML', html)` | `$el.html(html)` |
| `node.append(child)` / `prepend` / `remove()` | `$el.append(child)` / `prepend` / `remove()` |
| `YAHOO.util.Dom.getRegion(el)` | `el.getBoundingClientRect()` |
| `YAHOO.util.Dom.getViewportHeight()` | `window.innerHeight` |

### Events

| YUI | Exponential UI |
|---|---|
| `node.on('click', fn)` | `$el.on('click', fn)` |
| `Y.on('click', fn, '#menu a')` | `$('#menu a').on('click', fn)` |
| `Y.delegate('click', fn, '#list', 'li')` | `$('#list').on('click', 'li', fn)` |
| `YAHOO.util.Event.addListener(el, 'click', fn)` | `$(el).on('click', fn)` |
| `YAHOO.util.Event.removeListener(el, 'click', fn)` | `$(el).off('click', fn)` |
| `e.halt()` / `YAHOO.util.Event.stopEvent(e)` | `e.preventDefault(); e.stopPropagation();` |
| `e.preventDefault()` / `e.stopPropagation()` | the same |
| `e.target` (a YUI node) | `e.target` (an element): `$(e.target)` |
| `event-outside` (`node.on('clickoutside', fn)`) | `$(document).on('click', e => { if (!el.contains(e.target)) fn(e); })` |
| `new YAHOO.util.KeyListener(el, {keys: 27}, fn).enable()` | `Exp.keys.bind('Escape', fn, { scope: el })` |
| YUI custom events (`Y.fire('x')`, `Y.on('x', fn)`) | `Exp.emit('mysite:x', data)`, `Exp.on('mysite:x', fn)` |

### Talking to the server

The most common YUI code in Exponential extensions. ezjscore's server functions
stay exactly as they are; only the call changes.

**YUI 3 `io-ez`, before**

```js
Y.io.ez( 'mysite::latest::' + nodeId, {
    on: {
        success: function( id, r ) {
            var data = r.responseJSON;
            if ( data.error_text ) { alert( data.error_text ); return; }
            Y.one( '#latest' ).setHTML( data.content );
        },
        failure: function() { alert( 'failed' ); }
    }
});
```

**After**

```js
Exp.io.call('mysite::latest', [nodeId]).then(function (content) {
    $('#latest').html(content);
}, function (error) {
    alert(error.message);   // error.kind: signedout, refused, server, network, timeout, invalid
});
```

**YUI 3 with POST data, before**

```js
Y.io.ez( 'mysite::save', { method: 'POST', data: 'title=' + encodeURIComponent( title ) } );
```

**After**

```js
Exp.io.call('mysite::save', [], { data: { title: title } });
```

**YUI 2 `Connect`, before**

```js
YAHOO.util.Connect.asyncRequest( 'POST', url, {
    success: function( o ) { var data = YAHOO.lang.JSON.parse( o.responseText ); /* … */ },
    failure: function( o ) { /* … */ }
}, 'a=1&b=2' );
```

**After** — when `url` is an ezjscore call, use `Exp.io.call()` as above; for any
other address:

```js
$.ajax({ url: url, method: 'POST', data: { a: 1, b: 2, ezxform_token: Exp.token() }, dataType: 'json' })
    .then(function (data) { /* … */ }, function () { /* … */ });
```

**A form, before** (YUI 3 `io-form`)

```js
Y.io( form.get( 'action' ), { method: 'POST', form: { id: form } } );
```

**After**

```js
Exp.io.form(form[0] || form).then(function (response) { /* … */ });
```

**Waiting for something on the server** (the asynchronous publishing pattern)

YUI code did this with `Y.io.ez()` and `Y.later()` calling itself again. Before:

```js
function check() {
    Y.io.ez('mysite::status::' + jobId, { method: 'GET', on: { success: function (id, r) {
        if (r.responseJSON.content.done) { finished(); } else { Y.later(2000, null, check); }
    } } });
}
check();
```

After:

```js
Exp.io.poll('mysite::status', [jobId], { every: 2000, until: function (s) { return s.done; } })
    .then(function (s) { /* finished */ });
```

> [!NOTE]
> **Your own retry rules?** Exponential's asynchronous publishing status page
> (`content/queued.tpl`, `ezasynchronouspublishing.js`) keeps its own timing,
> failure count and messages, so it calls `Exp.io.call()` itself (GET, then a
> `setTimeout()` for the next check) when Exponential UI is there, and its
> YUI version otherwise. Use `Exp.io.poll()` when "ask every n ms until done"
> is all you need.

**`$.ez()` code** keeps working: load `exp::compat` and it runs on the new calls
underneath. Move it to `Exp.io.call()` when you touch the file anyway:

| `$.ez()` | `Exp.io.call()` |
|---|---|
| `$.ez('mysite::latest::' + id, false, function (data) { use(data.content); })` | `Exp.io.call('mysite::latest', [id], { method: 'GET' }).then(use)` |
| `$.ez('mysite::save', { title: t }, cb)` | `Exp.io.call('mysite::save', [], { data: { title: t } }).then(cb)` |
| `$.ez.setPreference('name', 'value')` | `Exp.prefs.set('name', 'value')` |

### Remembering things

| YUI | Exponential UI |
|---|---|
| `Y.io.ez.setPreference('admin_menu', 'small')` | `Exp.prefs.set('admin_menu', 'small')` (saved for the user) |
| reading the preference in the template (`ezpreference('admin_menu')`) | the same, or `{exp_config( hash( 'prefs', array( 'admin_menu' ) ) )}` and `Exp.prefs.get('admin_menu')` |
| `YAHOO.util.Cookie.set('x', v)` / `get('x')` | for a user's choice: `Exp.prefs`; for a real cookie: `document.cookie = 'x=' + encodeURIComponent(v) + '; path=/; SameSite=Lax'` |

### Helpers

| YUI | Exponential UI |
|---|---|
| `YAHOO.lang.JSON.parse(s)` / `Y.JSON.parse(s)` | `JSON.parse(s)` |
| `YAHOO.lang.JSON.stringify(o)` / `Y.JSON.stringify(o)` | `JSON.stringify(o)` |
| `Y.Lang.isArray(a)` / `YAHOO.lang.isArray(a)` | `Array.isArray(a)` |
| `Y.Lang.isString(s)` / `isNumber` / `isFunction` | `typeof s === 'string'` / `'number'` / `'function'` |
| `Y.Lang.trim(s)` / `YAHOO.lang.trim(s)` | `s.trim()` |
| `Y.Array.each(list, fn)` | `list.forEach(fn)` |
| `Y.Object.keys(o)` | `Object.keys(o)` |
| `Y.mix(a, b)` / `YAHOO.lang.augmentObject(a, b)` | `Object.assign(a, b)` or `$.extend(a, b)` |
| `Y.later(500, null, fn)` | `setTimeout(fn, 500)` |
| `YAHOO.namespace('mysite.tools')` | `window.mysite = window.mysite || {}; mysite.tools = mysite.tools || {};` |
| `Y.UA.ie` and other browser sniffing | not needed: jQuery 4 targets current browsers; test features (`'IntersectionObserver' in window`) |

### Animation

| YUI | Exponential UI |
|---|---|
| `new YAHOO.util.Motion(el, {...}).animate()` / `new Y.Anim({...}).run()` | a CSS transition plus a class: `$el.addClass('is-open')`, or `$el.animate({...})` |
| `node.transition({opacity: 0})` | `$el.fadeOut()` or a CSS transition |
| easing (`YAHOO.util.Easing.easeOut`) | CSS `transition-timing-function: ease-out` |

Respect `Exp.reducedMotion`: skip or shorten animations when it is `true`.

### Starting behaviour from HTML

YUI code often searched the page for elements on `domready`. With Exponential UI
you can register a module once and mark the elements in the template:

```js
// before: YUI().use('node', function (Y) { Y.all('.mysite-teaser').each(function (n) { … }); });
Exp.register('mysite-teaser', function ($el, options) { /* … one element … */ });
```

```html
<div class="teaser" data-exp-mysite-teaser='{"limit": 3}'>…</div>
```

---

Step 5 — YUI widgets
--------------------

Widgets (`DataTable`, `Calendar`, `Dialog`, `TabView`, `Slider`, drag and drop,
`Uploader` …) are replaced by Exponential UI **modules**. Check
[MODULES.md](MODULES.md):

- **The module is available**: follow its page in `doc/modules/` — it has a
  before/after for the YUI widget it replaces.
- **The module is planned**: keep your widget code as it is for now; YUI stays
  loaded until that module is available, and its page will show you the
  conversion when it lands.

| YUI widget | Module |
|---|---|
| `Y.eZ.CollapsibleMenu` (`ezcollapsiblemenu`) | **`exp::collapse`, available**: [modules/collapse.md](modules/collapse.md). Same configuration; change the constructor |
| `fixed_toolbar.js` (the edit form's toolbar) | **`exp::sticky`, available**: [modules/sticky.md](modules/sticky.md). Nothing to change in admin designs; it runs by itself |
| `YAHOO.widget.DataTable`, `Paginator`, `TextboxCellEditor`, `DataSource`, `XHRDataSource` | **`exp::datatable`, available**: [modules/datatable.md](modules/datatable.md). Columns, source, paging, selection, menus and Table options in one call; see below |
| `YAHOO.widget.Dialog`, `SimpleDialog`, `Panel`, `Y.eZ.ModalWindow` (`ezmodalwindow`) | **`exp::dialog`, available**: [modules/dialog.md](modules/dialog.md). The native `<dialog>`; every call returns a Promise; see below |
| `Y.Uploader`, the `io-upload-iframe` step of `ezajaxuploader`, `ezmultiupload` | **`exp::upload`, available**: [modules/upload.md](modules/upload.md). One request per file, the same fields; see below |
| `YAHOO.widget.Calendar`, `ezdatepicker.js` | **`exp::datepicker`, available**: [modules/datepicker.md](modules/datepicker.md). The standard date templates need nothing; your fields stay as they are |
| `Y.eZ.AutoSubmit` (`ezautosubmit`), `Y.eZ.ContentPreview` (`ezcontentpreview`) | **`exp::autosave`, available**: [modules/autosave.md](modules/autosave.md). Same configuration; change the constructors |
| `YAHOO.widget.Button` (a menu button) | the `actions` of `exp::datatable`, or a plain `<button>` styled with the admin's classes |
| `YAHOO.util.KeyListener` | `Exp.keys.bind()` (step 4) |
| `YAHOO.widget.TabView` | `exp::tabs` (planned) |
| `YAHOO.widget.Slider`, `CalendarGroup` (ezflow's timeline) | `exp::timeline` (planned) / `<input type=range>` |
| `YAHOO.util.DD`, `DDProxy`, `DDTarget`, YUI 3 `dd-*` | `exp::sortable` (planned) |

### A data table

**Before** (YUI 2)

```js
var ds = new YAHOO.util.XHRDataSource(url);
ds.responseSchema = { resultsList: 'content.list', metaFields: { total: 'content.total_count' } };
var dt = new YAHOO.widget.DataTable('my-table', [{ key: 'name', label: 'Name', sortable: true }], ds,
    { dynamicData: true, paginator: new YAHOO.widget.Paginator({ rowsPerPage: 25 }) });
```

**After**

```js
$('#my-table').expDataTable({
    columns: [{ key: 'name', label: 'Name', sortable: true }],
    source: { url: function (s) { return url + '?offset=' + s.offset + '&limit=' + s.limit; },
              parse: function (json) { return { rows: json.content.list, total: json.content.total_count }; } },
    paging: { limit: 25 }
});
```

The element can also be a `<table>` already in the page:
`<table data-exp-datatable>` sorts and pages its own rows.

### A dialog

**Before** (YUI 3, the admin's modal window)

```js
var win = new Y.eZ.ModalWindow({ window: '#my-window', width: 650 });
win.setTitle('Rename'); win.setContent(html); win.open();
```

**After**

```js
var d = Exp.dialog.create({ title: 'Rename', width: 650 });
d.setContent(html);
d.open().then(function (value) { /* the value it was closed with, or null */ });
```

A question becomes one line: `Exp.dialog.confirm('Remove?').then(function (ok) { … })`.
No window markup in the template and no overlay mask: the browser does both.

### An upload

**Before** (YUI 3 `io-upload-iframe`)

```js
Y.io(url, { method: 'POST', form: { id: form, upload: true }, on: { complete: done } });
```

**After**

```js
$(form).find('input[type=file]').expUpload({ url: url, form: form, auto: false, responseType: 'text', onDone: done });
// start it from the form's own button: $(input).expUpload('start')
```

The same fields in the same order, with a progress bar and Cancel.

### Autosave and preview

Replace `new Y.eZ.AutoSubmit(conf)` by `new Exp.autosave.AutoSubmit(conf)` and
`new Y.eZ.ContentPreview(conf)` by `new Exp.autosave.Preview(conf)`; the
configuration and the events stay. `Y.fire('autosubmit:forcesave')` becomes
`Exp.emit('autosubmit:forcesave')`.

### Keep the YUI version as the fallback

Every template Exponential moved keeps both: the Exponential UI branch when it
is there, the untouched YUI code otherwise. Do the same while your site may run
without Exponential UI:

```js
if (window.Exp && window.Exp.dialog) {
    // Exponential UI
} else {
    // the YUI code, as it was
}
```

---

Step 6 — jQuery 3 code on jQuery 4
----------------------------------

Your own jQuery code runs on the page's jQuery. With Exponential UI activated
before ezjscore, that is jQuery 4 (see [INSTALL.md](INSTALL.md#switch-it-on)),
and these calls must change. jQuery Migrate 4 (on by default while sites move
over) restores most of them and prints a warning in the browser console for
each one it meets: open the console and click through your pages.

**Two of them Migrate does not bring back, and they throw** ("is not a
function"): `.size()` and `$.browser`. Fix those first; a page that calls them
stops at that line.

| Old | New |
|---|---|
| `$.trim(s)` | `s.trim()` |
| `$.isArray(a)` | `Array.isArray(a)` |
| `$.parseJSON(s)` | `JSON.parse(s)` |
| `$.isFunction(f)` | `typeof f === 'function'` |
| `$.isNumeric(n)` | `!isNaN(parseFloat(n)) && isFinite(n)` |
| `$.type(x)` | `typeof x` / `Array.isArray(x)` |
| `$.now()` | `Date.now()` |
| `$.proxy(fn, obj)` | `fn.bind(obj)` |
| `$el.size()` | `$el.length` |
| `$el.bind('click', fn)` / `unbind` | `$el.on('click', fn)` / `off` |
| `$el.delegate('li', 'click', fn)` / `undelegate` | `$el.on('click', 'li', fn)` / `off` |
| `$el.live('click', fn)` | `$(document).on('click', selector, fn)` |
| `$el.click(fn)`, `.change(fn)`, … (deprecated) | `$el.on('click', fn)`, `.on('change', fn)` |
| `$.browser` | feature detection |
| `$el.click()`, `.change()`, `.focus()`, … with no handler (a trigger) | `$el.trigger('click')`, `.trigger('change')`, `.trigger('focus')` |
| `$el.click(handler)` with a named handler | `$el.on('click', handler)` (the same rule; easy to miss in a search for `function`) |
| `$el.hover(inFn, outFn)` | `$el.on('mouseenter', inFn).on('mouseleave', outFn)`; with one function, `.on('mouseenter mouseleave', fn)` |
| `$el.attr('disabled', true)` (also `checked`, `selected`, `readonly`, `multiple`) | `$el.prop('disabled', true)` |

**Mind the traps.**

- **`hover` is not an event.** `.hover(fn)` must not become
  `.on('hover', fn)`; that handler never runs.
- **`.bind(this)` is not jQuery.** `fn.bind(this)` is JavaScript's own
  `Function.prototype.bind` and stays as it is; only `$el.bind('event', …)`
  changes. The same goes for other libraries' `dom.bind(el, 'click', …)`
  (TinyMCE) and YUI's `.delegate()` / `.size()` on `Y.one()` and `Y.all()`
  results.
- **`.size()` on a YUI NodeList is YUI's own and fine.** Only change it where
  the object is a jQuery one.

A quick way to fix the common ones across a directory (review the diff before
you keep it):

```sh
cd extension/myextension
grep -rlE "(\\$|jQuery)\.trim\(|\.size\(\)" --include=*.js . | while read f; do
    sed -i -E "s/(\\\$|jQuery)\.trim\(([^()]*)\)/String( (\2) ?? '' ).trim()/g; s/\.size\(\)/.length/g" "$f"
done
git diff
```

What to check in that diff:

- `String( (x) ?? '' ).trim()` keeps `$.trim()`'s answer for `null` and
  `undefined` (an empty string; a plain `String(x)` would give `"null"`).
- A `$.trim(...)` whose argument has parentheses of its own, such as
  `$.trim(a.replace(/x/, ''))`, is left alone: change it by hand.
- Put back every `.length` that replaced `.size()` on a YUI object (`Y.one()`,
  `Y.all()` results); only jQuery objects lost `.size()`.

---

Step 7 — Check your work
------------------------

1. Clear the caches (step 2).
2. Open every page you changed with the browser's console open: no errors, no
   jQuery Migrate warnings from your files.
3. Use the feature: click, type, submit, as a user would — and as a user who
   uses only the keyboard.
4. Run the search of step 1 again: it should print nothing for your files.
5. Optional: write a test for your module the way Exponential UI tests its own
   ([TESTING.md](TESTING.md)).

---

Stuck?
------

- [FAQ.md](FAQ.md) answers the usual questions.
- Open an issue at https://github.com/se7enxweb/expui/issues with the YUI code
  you are converting; we add the answer to this guide so the next person has it.
