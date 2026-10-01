API reference
=============

Version 1.0.0.0. Everything below is available today; [MODULES.md](MODULES.md)
lists what lands next.

Loading
-------

| Template | Loads |
|---|---|
| `{exp_config( hash( 'prefs', array(…), 'strings', array(…) ) )}` | the page's configuration block (once per page, before the scripts) |
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
Exp.version              // "1.0.0.0"
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

Page-wide events. Handlers get `(event, data)`. The API's own events:

| Event | Data |
|---|---|
| `exp:started` | `{ root, only }` after `Exp.start()` |
| `exp:prefs:set` | `{ name, value }` after a preference was saved |

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

The same, with `conf.link` = each element.

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
