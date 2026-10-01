Using Exponential UI
====================

*The friendly book about building interactive pages in Exponential with
jQuery 4 and the `Exp` API — from your first line of code to your own
modules, server calls, styles and tests.*

Version 1.0.0.0 · GNU General Public License v2.0 (or any later version) ·
[github.com/se7enxweb/expui](https://github.com/se7enxweb/expui)

---

Welcome
-------

You want a button that saves without reloading the page. A list that loads
more items when asked. A panel that remembers whether it was open. A field
that suggests as you type. In Exponential these used to need YUI, a library
that stopped being developed in 2014, plus a fair amount of patience.

Exponential UI gives you all of that on **jQuery 4**, the jQuery you may
already know, and a small API called **`Exp`** that takes care of what every
Exponential page needs: the right addresses, the form token, translations, the
user's preferences and talking to the server.

This book walks you through it. Every chapter starts with something you can
copy, paste and see working, then explains what happened. Short **Notes** tell
you the background and the tricks that save an afternoon. Links at the end of
a chapter take you further when you want to.

> [!NOTE]
> **How to read this book.** If you have ten minutes, read Part 1: you will
> have a working page. If you have an hour, add Parts 2 and 3: you will know
> everything you use every day. The rest is there when you need it. Chapter
> titles say what they do, so the table of contents doubles as an index.

### Contents

**Part 1 — First steps**
1. [What Exponential UI is](#1-what-exponential-ui-is)
2. [Installing it in two minutes](#2-installing-it-in-two-minutes)
3. [Your first page](#3-your-first-page)

**Part 2 — The core**
4. [Loading the API on a page](#4-loading-the-api-on-a-page)
5. [`Exp.$`: your jQuery](#5-exp-your-jquery)
6. [Running code when the page is ready](#6-running-code-when-the-page-is-ready)
7. [Modules: behaviour from HTML attributes](#7-modules-behaviour-from-html-attributes)
8. [Configuration: what the page knows](#8-configuration-what-the-page-knows)
9. [Translations](#9-translations)
10. [Page-wide events](#10-page-wide-events)
11. [Remembering things: user preferences](#11-remembering-things-user-preferences)
12. [Keyboard shortcuts](#12-keyboard-shortcuts)
13. [Motion, focus and everyone](#13-motion-focus-and-everyone)

**Part 3 — Talking to the server**
14. [Your first server call](#14-your-first-server-call)
15. [Calls in detail](#15-calls-in-detail)
16. [Writing your own server function](#16-writing-your-own-server-function)
17. [Rendering a template from JavaScript](#17-rendering-a-template-from-javascript)
18. [Sending forms](#18-sending-forms)
19. [Waiting for the server: polling](#19-waiting-for-the-server-polling)
20. [Timeouts and cancelling](#20-timeouts-and-cancelling)
21. [When things go wrong](#21-when-things-go-wrong)

**Part 4 — Looks**
22. [Design tokens](#22-design-tokens)
23. [Utilities](#23-utilities)

**Part 5 — Moving older code**
24. [`$.ez()` keeps working](#24-ez-keeps-working)
25. [From YUI](#25-from-yui)
26. [From jQuery 3](#26-from-jquery-3)

**Part 6 — Quality**
27. [Testing your code](#27-testing-your-code)
28. [Security](#28-security)
29. [Speed and deployment](#29-speed-and-deployment)

**Part 7 — The cookbook**
30. [Recipes](#30-recipes)

**Part 8 — Ready-made modules**
31. [Panels that collapse: `exp::collapse`](#31-panels-that-collapse-expcollapse)
32. [A toolbar that stays in view: `exp::sticky`](#32-a-toolbar-that-stays-in-view-expsticky)

**Part 9 — Looking ahead**
33. [Modules that are coming](#33-modules-that-are-coming)

**Appendices**
- [A. Quick reference card](#a-quick-reference-card)
- [B. Troubleshooting](#b-troubleshooting)
- [C. Glossary](#c-glossary)
- [D. Further reading](#d-further-reading)

---

Part 1 — First steps
====================

1. What Exponential UI is
-------------------------

Exponential UI (`expui`) is an extension. It brings three things:

| | What it is | You use it as |
|---|---|---|
| **jQuery 4** | the current jQuery, with jQuery UI 1.14 and jQuery Migrate 4 | `Exp.$`, or the `$` you are handed |
| **The `Exp` API** | small helpers for what every Exponential page needs | `Exp.ready()`, `Exp.io.call()`, `Exp.prefs`, `Exp.register()` … |
| **Design tokens** | colours, sizes and motion as CSS custom properties | `var(--exp-accent)` in your styles |

It is built to replace YUI in Exponential **feature by feature**: nothing that
works today is taken away, and every replacement does at least what the old
one did.

> [!NOTE]
> **Why jQuery and not a framework?** Exponential pages are made on the server,
> by templates. What they need in the browser is a little behaviour on top of
> that HTML: open this, save that, ask the server. jQuery is exactly that, it
> is known by millions of developers, and jQuery 4 is small, current and
> maintained. The `Exp` API adds the Exponential parts and stays out of your
> way.

2. Installing it in two minutes
-------------------------------

```sh
composer require se7enxweb/expui
```

Then in `settings/override/site.ini.append.php`, list it **before** ezjscore:

```ini
[ExtensionSettings]
ActiveExtensions[]=expui
ActiveExtensions[]=ezjscore
```

And refresh:

```sh
php bin/php/ezpgenerateautoloads.php --extension
php bin/php/ezcache.php --clear-all
```

Open **`/expui/test`** in the admin. It runs every test of the API on a real
page and should end with **43 passed, 0 failed**.

> [!NOTE]
> **Why "before ezjscore"?** When two extensions set the same setting, the one
> listed first wins. Current Exponential's ezjscore ships jQuery 4 itself, so
> every page gets jQuery 4 in either order. Listed first, Exponential UI adds
> the Migrate build that names every old jQuery call in the browser's console,
> which is the best help while you move older code. On an older Exponential,
> whose ezjscore still ships jQuery 3, list it after ezjscore: pages keep
> jQuery 3, and the API runs next to it on its own copy.
> [INSTALL.md](INSTALL.md#switch-it-on) has the table.

> [!NOTE]
> **Running Exponential Velocity or another persistent PHP server?** Restart
> it after installing, so its workers load the new classes:
> `php bin/php/velocity.php restart`.

3. Your first page
------------------

Let us make a page that asks the server for the time when you click a button.
Put this in any template you can open in the browser — a node view, a module
view, or a test template:

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io' ) )}

<button type="button" id="what-time">What time is it on the server?</button>
<p id="the-time"></p>

<script>
{literal}
Exp.ready(function ($) {
    $('#what-time').on('click', function () {
        Exp.io.call('ezjsc::time').then(function (seconds) {
            $('#the-time').text(new Date(seconds * 1000).toLocaleString());
        });
    });
});
{/literal}
</script>
```

Click the button. The time appears.

Here is what happened, line by line:

1. `{exp_config()}` wrote a small block of settings into the page: where the
   site is, which siteaccess, which language.
2. `{ezscript_require(…)}` loaded jQuery 4, the core and the server calls, all
   packed into one file.
3. `Exp.ready()` waited until the page was ready and handed you `$`, jQuery 4.
4. `Exp.io.call('ezjsc::time')` asked the server function `time` of ezjscore's
   `ezjsc` group. It answered with a Unix timestamp, and the Promise gave it to
   you.

That is the whole pattern. Everything else in this book is more of the same.

> [!NOTE]
> **`ezjsc::time` is a real function** that ships with ezjscore for exactly
> this kind of first test. You can also open it directly:
> `/ezjscore/call/ezjsc::time` in the address bar shows the raw answer. That
> address is the same "call view" every `Exp.io.call()` talks to.

> [!NOTE]
> **Why `{literal}`?** Exponential templates read `{` and `}` as template
> code, and JavaScript is full of them. `{literal} … {/literal}` tells the
> template to leave everything between them alone. Scripts longer than a few
> lines are happier still in a `.js` file of your extension, which needs no
> `{literal}` at all (see [chapter 4](#4-loading-the-api-on-a-page)).

---

Part 2 — The core
=================

4. Loading the API on a page
----------------------------

Two lines, in this order:

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io' ) )}
```

The packer keys you can ask for:

| Key | Gives you | Needs |
|---|---|---|
| `exp::core` | jQuery 4 (+ Migrate while enabled) and the core: `Exp.ready`, `Exp.register`, `Exp.prefs`, `Exp.keys`, `Exp.i18n`, `Exp.on` … | — |
| `exp::io` | server calls: `Exp.io.call`, `.form`, `.poll`, `.url` | `exp::core` |
| `exp::compat` | `$.ez()` on top of `Exp.io`, for older code | `exp::io` |
| `exp::collapse` | panels and menus that collapse, remembered per user (chapter 31) | `exp::core` |
| `exp::sticky` | a toolbar that stays in view while scrolling (chapter 32) | `exp::core` |

And the stylesheet with the design tokens:

```html
{ezcss_require( 'exp/core.css' )}
```

**Your own scripts** go in your extension, under
`design/<design>/javascript/`, and are loaded in the same call, after the
keys they need:

```html
{ezscript_require( array( 'exp::core', 'exp::io', 'myextension/panel.js' ) )}
```

`ezscript_require` collects scripts and the pagelayout writes them into the
page's `<head>`. `ezscript` writes them right where it stands. Both work.

> [!NOTE]
> **One file, cached.** The packer joins everything you list into one file,
> minifies it in production, and caches it under `var/<site>/cache/public/`.
> The file's name carries the time of its newest source file, so when you
> change a `.js` file the browser gets a new one by itself.

> [!NOTE]
> **Where to put `{exp_config()}`.** Once in your pagelayout's `<head>` (the
> admin designs already have it), and again in any template that needs its own
> preferences or texts: `{exp_config( hash( 'prefs', array( 'myext_open' ) ) )}`.
> The core merges every block on the page. Blocks after the scripts are fine
> too: they are read when the page is ready.

> [!NOTE]
> **On admin pages the core is already there.** Every admin design loads
> `exp::core`, `exp::collapse` and `exp::sticky` by itself. Asking for
> `exp::core` again does no harm: the core runs once per page.

5. `Exp.$`: your jQuery
----------------------

`Exp.$` is jQuery 4. Use it, or the `$` that `Exp.ready()` hands you:

```js
Exp.ready(function ($) {
    $('.note').addClass('is-ready');
});

Exp.$.fn.jquery;      // "4.0.0"
Exp.jQueryShared;     // true when Exp.$ is also the page's window.jQuery
```

Whenever the page has jQuery 4 (every admin page does), it is **one** jQuery 4:
`Exp.$`, `window.jQuery` and `$` are the same, and plugins loaded with
`ezjsc::jquery` work with your code. Only on an older Exponential, whose
ezjscore ships jQuery 3, with Exponential UI listed after it, does the page keep
jQuery 3 as `window.jQuery`, with `Exp.$` a separate jQuery 4. Write `Exp.$` and
your code works either way.

> [!NOTE]
> **New to jQuery?** The [learning centre](https://learn.jquery.com/) is the
> gentle start, and the [API documentation](https://api.jquery.com/) has a page
> for every function with examples. The two you will use most are
> [`.on()`](https://api.jquery.com/on/) and
> [`.trigger()`](https://api.jquery.com/trigger/).

6. Running code when the page is ready
--------------------------------------

```js
Exp.ready(function ($) {
    // the HTML is there, the modules have started, $ is jQuery 4
});
```

You can call `Exp.ready()` as often as you like; each function runs once,
in order. Called after the page is ready, the function runs at once.

> [!NOTE]
> **Why not `$(document).ready()`?** It works too. `Exp.ready()` is the same
> moment, but it guarantees the jQuery you get is jQuery 4, and that the
> page's `data-exp-*` modules (next chapter) have been started.

7. Modules: behaviour from HTML attributes
------------------------------------------

This is the part that makes templates pleasant. You write the behaviour once,
in JavaScript, and switch it on in HTML with an attribute:

```html
<button type="button" data-exp-copy="#share-link">Copy the link</button>
<input id="share-link" value="https://example.com/news/42" readonly>
```

```js
Exp.register('copy', function ($el, options) {
    $el.on('click', function () {
        var text = Exp.$(options.value).val();
        navigator.clipboard.writeText(text).then(function () {
            $el.text(Exp.i18n('Copied'));
        });
    });
});
```

Every element with `data-exp-copy` gets the behaviour, **once per element**,
however often the modules are started.

The rules:

- **Names** are lower case: letters, digits and `-` (`copy`, `read-more`).
  The attribute is `data-exp-<name>`.
- **Options** come from the attribute. A plain value, like `"#share-link"`
  above, arrives as `{ value: "#share-link" }`. JSON, when the value starts
  with `{`, arrives as the object it describes. An empty attribute gives `{}`.
- **Inside** the function, `this` is the element and `$el` is it wrapped in
  jQuery 4.
- **Registered later** (after the page was ready)? It starts at once.
- **One module failing** is logged in the console and does not stop the
  others.

**New HTML from the server?** Start the modules inside it:

```js
$('#results').html(html);
Exp.start('#results');            // every module below #results
Exp.start('#results', ['copy']);  // only these modules
```

`Exp.modules()` lists the registered names.

> [!NOTE]
> **More than one option? Use JSON, and mind the braces in templates.** JSON
> needs double quotes inside, so the HTML attribute gets single quotes. In a
> `.tpl` file, `{` starts template code, so write the JSON's braces as
> `{ldelim}` and `{rdelim}`:
>
> ```html
> <ul data-exp-load-more='{ldelim}"parent": {$node.node_id}, "step": 10{rdelim}'></ul>
> ```
>
> The page then receives `data-exp-load-more='{"parent": 2, "step": 10}'`.
> Wash text values that go inside: `"title": "{$title|wash}"`. With a single
> option, a plain value is simpler and needs none of this.

> [!NOTE]
> **Why attributes?** Because templates make HTML, and the attribute travels
> with the HTML: into AJAX answers, into cached pages, into anything a template
> includes. Nobody has to remember to call an init function. MDN explains
> [`data-*` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*)
> in detail.

8. Configuration: what the page knows
-------------------------------------

`{exp_config()}` puts this into `Exp.config`:

```js
Exp.config.root          // "/admin/"                the siteaccess's base address
Exp.config.www           // "/"                      the installation's web root
Exp.config.siteaccess    // "admin"
Exp.config.call          // "/admin/ezjscore/call/"  where server calls go
Exp.config.prefsUrl      // "/admin/user/preferences"
Exp.config.locale        // { code: "eng-GB", http: "en-GB", firstDay: 1 }
Exp.config.jquery        // "4.0.0"
Exp.version              // "1.0.0.0"
```

`locale.firstDay` is `1` when weeks start on Monday, `0` for Sunday: useful for
anything with a calendar.

To build an address of the site, use `Exp.io.url()` (chapter 15): it knows the
siteaccess.

> [!NOTE]
> **Why is this in the page and not in the script?** The packed script is the
> same file for every siteaccess, user and language, so the browser and the
> server can cache it. What differs per page lives in the small JSON block that
> `{exp_config()}` writes.

9. Translations
---------------

Texts your script shows should be in the visitor's language. Ask for them in
the template:

```html
{exp_config( hash( 'strings', array( 'Copied', 'Saved.' ) ) )}
```

and use them in the script:

```js
Exp.i18n('Copied');                                    // "Kopiert" on a German siteaccess
Exp.i18n('%n of %m saved', { '%n': 3, '%m': 10 });     // placeholders replaced
```

A text with no translation comes back as it is, so your page never shows an
empty button.

**Where the translations come from**: the `extension/expui` context of the
translation files. To translate your own texts, add them to your extension's
`translations/<locale>/translation.ts` in that context:

```xml
<context>
    <name>extension/expui</name>
    <message>
        <source>Copied</source>
        <translation>Kopiert</translation>
    </message>
</context>
```

and make sure your extension is listed in `site.ini`
`[RegionalSettings] TranslationExtensions[]`.

Texts every page should have go into `[ExpUI] Strings[]` in your extension's
`settings/expui.ini.append.php`.

> [!NOTE]
> The API's own texts — "Close", "Cancel", "Loading...", the error messages —
> are already there in English and German.

10. Page-wide events
--------------------

Parts of a page that do not know each other can still talk:

```js
Exp.on('cart:changed', function (event, data) {
    $('#cart-count').text(data.items);
});

Exp.emit('cart:changed', { items: 3 });

Exp.off('cart:changed', handler);   // stop listening (pass the same function)
```

The API sends two events itself:

| Event | When | Data |
|---|---|---|
| `exp:started` | after `Exp.start()` started modules | `{ root, only }` |
| `exp:prefs:set` | after a preference was saved | `{ name, value }` |

> [!NOTE]
> **Name your events** `<area>:<what happened>`, like `cart:changed` or
> `upload:done`. Names starting with `exp:` belong to the API.

11. Remembering things: user preferences
----------------------------------------

Exponential keeps per-user preferences on the server: the same ones the
`ezpreference()` template operator reads. That makes them perfect for "keep
this panel open next time":

```html
{exp_config( hash( 'prefs', array( 'myext_help_open' ) ) )}

<details id="help" {if eq( ezpreference( 'myext_help_open' ), '1' )}open{/if}>
    <summary>Help</summary>
    …
</details>
```

```js
Exp.ready(function ($) {
    $('#help').on('toggle', function () {
        Exp.prefs.set('myext_help_open', this.open ? '1' : '0');
    });
});
```

- `Exp.prefs.get('myext_help_open', '0')` gives the value the page was made
  with (when you asked for it in `{exp_config()}`), or what you set since, or
  the fallback.
- `Exp.prefs.set(name, value)` saves it for the signed-in user and returns a
  Promise of the saved value.
- Names: letters, digits, `_`, `.` and `-`, up to 64 characters.

> [!NOTE]
> **Render the state on the server.** The template reads the preference with
> `ezpreference()`, so the panel is already open in the HTML: no flicker, no
> jump when the script starts. The script only saves changes.

> [!NOTE]
> **Prefix your names** with your extension (`myext_…`), so they never meet
> another extension's preferences.

12. Keyboard shortcuts
----------------------

```js
var id = Exp.keys.bind('/', function () {
    $('#searchtext').trigger('focus');
    return false;                      // false: the browser does not type the "/"
});

Exp.keys.bind('ctrl+s', save, { inInputs: true });          // also while typing in a field
Exp.keys.bind('Escape', close, { scope: '#my-panel' });     // only inside #my-panel

Exp.keys.unbind(id);
```

- A key is what the keyboard reports as its name: `k`, `/`, `Enter`, `Escape`,
  `space`. Combine with `ctrl+`, `alt+`, `shift+` and `meta+`.
- Shortcuts do not fire while the user types in a field, unless you pass
  `inInputs: true`.
- Return `false` to stop the browser's own reaction.

> [!NOTE]
> **Key names** are the standard
> [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
> values, written in any case. Avoid shortcuts the browser or screen readers
> already use (`ctrl+f`, `ctrl+l`, `alt+` letters); a single character on its
> own, like `/` for search, is the friendliest.

13. Motion, focus and everyone
------------------------------

Some people get dizzy from animation and tell their system so. Respect it:

```js
var speed = Exp.reducedMotion ? 0 : 200;
$('#panel').slideToggle(speed);
```

In CSS, use the `--exp-speed` token (chapter 22): it is `0s` for them
automatically.

Other things the API does for you:

- The `<html>` element gets the class `exp-js` when the API runs, so your CSS
  can hide what only makes sense with scripts: `.exp-js .no-js-only { display:
  none; }`.
- `.exp-focus-ring` gives any element the same visible keyboard focus ring.
- `.exp-visually-hidden` hides text from the eye but not from screen readers.

> [!NOTE]
> **Good habits that cost nothing:** a real `<button>` for anything clickable
> that is not a link; text, not only an icon, or an `aria-label`; and every
> feature usable with the keyboard alone. The W3C's
> [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) show how
> common widgets should behave. Read more about
> [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

---

Part 3 — Talking to the server
==============================

14. Your first server call
--------------------------

You met it in chapter 3. A server call asks a PHP function on the server and
gets its answer back as data:

```js
Exp.io.call('ezjscnode::subtree', [2, 10]).then(function (result) {
    result.list.forEach(function (node) {
        console.log(node.node_id, node.name);
    });
});
```

`ezjscnode::subtree` ships with ezjscore: it lists the children of a node.
The arguments here mean "the children of node 2, at most 10". It answers with
an object: `list` (the nodes), `count`, `total_count`, `limit`, `offset`.

> [!NOTE]
> **Names arrive HTML-encoded.** `subtree` encodes each node's `name` for
> HTML: a node called `Fish & Chips` arrives as `Fish &amp; Chips`. Put it into
> the page with `.html(node.name)`, which shows `Fish & Chips` and is safe
> because the server already encoded it. With `.text()` the visitor would see
> the `&amp;`. Your own server functions decide this for themselves
> (chapter 16).

> [!NOTE]
> **Promises** are how JavaScript says "the answer comes later". If
> `.then()` is new to you, MDN's
> [guide to using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
> is the best twenty minutes you can spend.

15. Calls in detail
-------------------

```js
Exp.io.call(fn, args, options)   // → a Promise
```

| | |
|---|---|
| `fn` | `'group::function'`, as ezjscore knows it |
| `args` | an array of arguments, or one value. None may contain `::` |
| `options.method` | `'POST'` (the default) or `'GET'` |
| `options.data` | more POST fields: an object, a list of `{name, value}`, or a query string |
| `options.timeout` | milliseconds before giving up |
| `options.signal` | an `AbortSignal` to cancel it (chapter 20) |

The Promise **resolves** with what the server function returned, and
**rejects** with an `Exp.io.Error` (chapter 21).

Arguments become part of the call string — `ezjscnode::subtree::2::10` — so
they are always strings on the server. Data that is long, structured or
private goes in `options.data`:

```js
Exp.io.call('myext::save', [42], { data: { title: 'Hello', tags: 'a,b' } });
```

**Addresses**: `Exp.io.url('content/view/full/2')` gives
`/admin/content/view/full/2` on the admin, `/content/view/full/2` on a site
without a siteaccess in the address. Use it for every link or redirect your
script makes.

> [!NOTE]
> **POST is the default** for a reason: POST requests carry the form token
> (chapter 28), and many server functions change things. Use `GET` only for
> reading, when you want the browser to be allowed to cache the answer.

16. Writing your own server function
------------------------------------

Here is a complete server function, from nothing to answering the browser.
Your extension is called `myext`.

**1. The PHP class**, `extension/myext/classes/myextserverfunctions.php`:

```php
<?php

class myExtServerFunctions extends ezjscServerFunctions
{
    /**
     * myext::hello::<name> — says hello.
     *
     * @param array $args the call's arguments, as strings
     * @return array the answer; becomes JSON
     */
    public static function hello( $args )
    {
        $name = isset( $args[0] ) && $args[0] !== '' ? $args[0] : 'world';
        return array(
            'greeting' => 'Hello, ' . $name . '!',
            'time'     => time(),
        );
    }
}
```

**2. Tell ezjscore about it**, `extension/myext/settings/ezjscore.ini.append.php`:

```ini
<?php /* #?ini charset="utf-8"?

[ezjscServer_myext]
Class=myExtServerFunctions

*/ ?>
```

**3. Refresh** the autoloads and the INI cache:

```sh
php bin/php/ezpgenerateautoloads.php --extension
php bin/php/ezcache.php --clear-tag=ini
```

**4. Call it:**

```js
Exp.io.call('myext::hello', ['Ada']).then(function (answer) {
    alert(answer.greeting);       // "Hello, Ada!"
});
```

Errors: throw an exception in the function, and its message comes back as the
error (`kind: 'server'`):

```php
if ( !$node )
{
    throw new Exception( 'No such node' );
}
```

**Who may call it**: users need the `ezjscore/call` policy. Administrators
have it; give it to other roles as needed. To limit a function to some roles,
see `Functions[]` and `PermissionPrFunction` in `ezjscore.ini`.

> [!NOTE]
> **Check permissions inside the function too.** The policy decides who may
> call `myext::anything`. Whether *this* user may read *this* node is your
> function's job: fetch through the API (`eZContentObjectTreeNode::fetch()`
> and `canRead()`), never trust an id just because it came from the page.

> [!NOTE]
> **Return arrays of plain values.** Strings, numbers, booleans and arrays of
> them become JSON on the way out. Escaping for HTML is your decision: encode
> what will be put into the page as HTML, leave alone what will be put in as
> text.

17. Rendering a template from JavaScript
----------------------------------------

Sometimes you want the server to make the HTML: the same template the page
uses, now for one more item. ezjscore can call a template as if it were a
function:

```ini
# extension/myext/settings/ezjscore.ini.append.php
[ezjscServer_myexttpl]
TemplateFunction=true
```

```html
{* extension/myext/design/standard/templates/myexttpl/card.tpl *}
<div class="card">{$arguments[0]|wash}</div>
```

```js
Exp.io.call('myexttpl::card', ['Hello']).then(function (html) {
    $('#cards').append(html);
    Exp.start('#cards');          // start any data-exp-* modules in it
});
```

The call `myexttpl::card` renders `templates/myexttpl/card.tpl`; the
arguments are in `$arguments`. ezjscore ships a working example: the
`ezjsctemplate` group, with `ezjsctemplate::alert`.

> [!NOTE]
> **One template for both.** Use the same `.tpl` file in the page (with
> `{include}`) and from JavaScript, and the markup can never drift apart.

18. Sending forms
-----------------

```js
$('#comment-form').on('submit', function (e) {
    e.preventDefault();
    Exp.io.form(this, { submitter: e.originalEvent.submitter }).then(function (response) {
        $('#comment-form').replaceWith('<p>' + Exp.i18n('Saved.') + '</p>');
    });
});
```

`Exp.io.form(form, options)` sends every field **and file** of the form (as
[`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)) to the
form's `action`, or to `options.url`. It adds the form token when the form has
none. `options.submitter` is the button that was pressed, so its name and value
are sent as a normal submit would. The Promise resolves with the answer (parsed
when it is JSON).

> [!NOTE]
> **Build the form so it works without JavaScript first**, with a real
> `action` and a real submit button. Then the script makes it nicer, and the
> page still works when a script fails.

19. Waiting for the server: polling
-----------------------------------

Some work takes a while on the server: publishing in the background, an
import, a long export. `Exp.io.poll()` asks again until the answer says it is
done:

```js
Exp.io.poll('ezpublishingqueue::status', [objectId, version], {
    every: 1000,                                         // ask every second
    until: function (s) { return s.status === 'finished'; },
    onTick: function (s, n) { $('#state').text(s.status); }
}).then(function (s) {
    window.location.href = s.node_uri;
});
```

- `every`: milliseconds between calls (default 2000).
- `until(answer)`: return `true` when done.
- `max`: the number of calls before giving up (default 150), which rejects with
  `kind: 'timeout'`.
- `onTick(answer, n)`: after each call, for showing progress.
- The first failure stops the polling and rejects.

> [!NOTE]
> `ezpublishingqueue::status` is real: it is how the admin follows
> asynchronous publishing. It answers `queued`, `pending`, `working`,
> `deferred` or `finished`, and when finished also the new node's address
> (`node_uri`).

20. Timeouts and cancelling
---------------------------

**A timeout** gives up after a time:

```js
Exp.io.call('myext::slow', [], { timeout: 5000 });   // rejects with kind 'timeout' after 5 s
```

**Cancelling** stops a call you no longer need, such as the previous search
when the user typed another letter:

```js
var controller = null;

$('#search').on('input', function () {
    if (controller) { controller.abort(); }           // forget the last one
    controller = new AbortController();
    Exp.io.call('myext::search', [this.value], { signal: controller.signal })
        .then(showResults)
        .catch(function (error) {
            if (error.kind !== 'network') { showError(error); }   // a cancelled call rejects as 'network'
        });
});
```

> [!NOTE]
> [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
> is the browser's standard way to cancel things, the same one `fetch()` uses.

21. When things go wrong
------------------------

Every failure rejects with an `Exp.io.Error`:

| `kind` | What happened | What to tell the user |
|---|---|---|
| `signedout` | the session ended (status 401) | "Sign in again" |
| `refused` | not allowed (403) | "You may not do this" |
| `server` | an HTTP error, or the function threw (its message is `message`) | the message |
| `network` | no answer, or cancelled | "No connection" |
| `timeout` | the time ran out | "Try again" |
| `invalid` | wrong arguments; nothing was sent | (a bug in the script) |

Also: `error.status` (the HTTP status, 0 when none), `error.message` (already
translated) and `error.response`.

A pattern worth copying:

```js
function explain(error) {
    if (error.kind === 'signedout') {
        window.location.href = Exp.io.url('user/login');
        return;
    }
    $('#message').text(error.message).prop('hidden', false);
}

Exp.io.call('myext::save', [id]).then(done, explain);
```

> [!NOTE]
> **Always handle the failure.** A call without a `.catch()` or a second
> `.then()` function fails silently: the user clicks, nothing happens, and
> nobody knows why. One `explain()` function for the whole extension is
> enough.

---

Part 4 — Looks
==============

22. Design tokens
-----------------

`exp/core.css` defines the look as CSS custom properties, all named
`--exp-*`:

```css
.my-badge {
    color: var(--exp-ok);
    background: var(--exp-ok-bg);
    border-radius: var(--exp-radius-s);
    transition: opacity var(--exp-speed);
}
```

| Tokens | For |
|---|---|
| `--exp-ink`, `--exp-muted`, `--exp-faint` | text, from strong to light |
| `--exp-line`, `--exp-soft`, `--exp-card` | borders, quiet backgrounds, cards |
| `--exp-accent`, `--exp-accent-dark`, `--exp-accent-ring` | the Exponential orange, its darker shade, its focus ring |
| `--exp-ok`, `--exp-warn`, `--exp-bad`, `--exp-info` and each `-bg` | states and their backgrounds |
| `--exp-radius`, `--exp-radius-s` | corners |
| `--exp-shadow`, `--exp-shadow-up` | a resting and a lifted shadow |
| `--exp-mono` | the monospace font |
| `--exp-speed` | transition time; `0s` for people who asked for less motion |

**Make it yours** by setting them again, for the whole site or one part:

```css
:root { --exp-accent: #0a7c86; --exp-accent-dark: #075d65; }

.dark-panel.exp-scope {
    --exp-ink: #e8edf3; --exp-card: #1b2430; --exp-line: #2e3a48;
}
```

> [!NOTE]
> **Every module coming in later releases uses these tokens.** Change the
> accent once, and the dialogs, tables and date pickers follow. MDN explains
> [custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
> from the start.

23. Utilities
-------------

| Class | Does |
|---|---|
| `.exp-visually-hidden` | hides the element from the eye, keeps it for screen readers |
| `.exp-focus-ring` | the shared keyboard focus ring (also on everything inside `.exp-scope`) |
| `exp-js` (on `<html>`) | set when the API runs; hide what needs scripts without it |

```html
<button class="icon-button exp-focus-ring">
    <span aria-hidden="true">✕</span>
    <span class="exp-visually-hidden">{'Close'|i18n( 'extension/expui' )}</span>
</button>
```

---

Part 5 — Moving older code
==========================

24. `$.ez()` keeps working
--------------------------

Code written for ezjscore's `$.ez()` works on top of the new server calls when
you add `exp::compat`:

```html
{ezscript_require( array( 'exp::core', 'exp::io', 'exp::compat' ) )}
```

```js
$.ez('ezjsc::time', false, function (data) {
    console.log(data.content);
});
```

Same arguments, same jqXHR back (`.done()`, `.fail()`, `.then()`), same
`$.ez.url` and `$.ez.setPreference()`. Move to `Exp.io.call()` when you next
touch the code: it gives you the content directly and clear errors.

25. From YUI
------------

The short version:

| YUI | Exponential UI |
|---|---|
| `YUI().use('node', function (Y) { … })` | `Exp.ready(function ($) { … })` |
| `Y.one('#x')`, `Y.all('.x')` | `$('#x')`, `$('.x')` |
| `node.on('click', fn)` | `$el.on('click', fn)` |
| `Y.io.ez('fn::name', { on: { success } })` | `Exp.io.call('fn::name').then(…)` |
| `Y.JSON.parse(s)` | `JSON.parse(s)` |
| YUI 2 `Dom.addClass(el, 'x')` | `$(el).addClass('x')` |
| YUI 2 `Event.onDOMReady(fn)` | `Exp.ready(fn)` |

The full guide, written for every level of experience, with commands to find
what needs changing and before/after examples for each YUI feature, is
[CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md).

> [!NOTE]
> **98% of sites need to do nothing.** If your own extensions and designs do
> not use YUI, the admin's move is invisible to you. Step 1 of the converting
> guide is one command that tells you.

26. From jQuery 3
-----------------

jQuery 4 removed a few old functions. jQuery Migrate 4 is switched on while
sites move over: it puts most of them back and writes a warning in the
browser's console, naming each old call and where it is.

The changes you will meet most:

| Old | New |
|---|---|
| `$.trim(s)` | `s.trim()` (or `String( s ?? '' ).trim()` when `s` may be empty) |
| `$el.size()` | `$el.length` — **throws** on jQuery 4, Migrate does not bring it back |
| `$.browser` | feature detection — **gone**, Migrate does not bring it back |
| `$el.click(fn)`, `.change(fn)` … | `$el.on('click', fn)` |
| `$el.click()` (no handler) | `$el.trigger('click')` |
| `$el.bind(...)`, `.delegate(...)` | `$el.on(...)` |
| `$el.hover(a, b)` | `$el.on('mouseenter', a).on('mouseleave', b)` |
| `$el.attr('disabled', true)` | `$el.prop('disabled', true)` |
| `$.proxy(fn, obj)` | `fn.bind(obj)` |

Step 6 of [CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md#step-6--jquery-3-code-on-jquery-4)
has the full table, a command that fixes the common ones across a directory,
and the traps to watch for.

> [!NOTE]
> **`.hover()` is not an event.** A search-and-replace that turns
> `.hover(fn)` into `.on('hover', fn)` produces code that never runs. It is
> the one rewrite that needs thinking. The official
> [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/) lists every
> change, and the [jQuery Migrate project](https://github.com/jquery/jquery-migrate)
> explains each warning.

> [!NOTE]
> **Click, don't just load.** Many old calls only run when something is used:
> a button pressed, a dialog opened, a field typed into. Check your pages with
> the console open *while using them*.

---

Part 6 — Quality
================

27. Testing your code
---------------------

**In the browser.** The test runner of `/expui/test` is yours to use. A test
file:

```js
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test;

    test('copy: copies the target', function (t) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = '<button data-exp-copy=\'{"target": "#v"}\'></button><input id="v" value="x">';
        Exp.start(host);
        t.ok(Exp.modules().indexOf('copy') !== -1, 'the module is registered');
    });

    test('myext: the server says hello', function (t) {
        return Exp.io.call('myext::hello', ['Ada']).then(function (answer) {
            t.equal(answer.greeting, 'Hello, Ada!');
        });
    });
}(window, document));
```

Assertions: `t.ok(value)`, `t.equal(a, b)`, `t.deepEqual(a, b)`,
`t.throws(fn)`, and `t.rejects(promise, kind)` for failures you expect. Return
a Promise (or use `async`) for anything that waits.

Run them on a page of your own module with the runner loaded after your code,
a place for test markup, and a place for results:

```html
{exp_config()}
{ezscript( array( 'exp::core', 'exp::io', 'myext/copy.js', 'exp/test/runner.js', 'myext/test/copy.test.js' ) )}
<div id="exp-test-sandbox"></div>
<p id="exp-test-summary"></p>
<ol id="exp-test-results"></ol>
<script>{literal}Exp.ready(function () { ExpTest.run(); });{/literal}</script>
```

The results also land in `window.ExpTestResults`
(`{done, passed, failed, tests}`), so a tool such as
[Playwright](https://playwright.dev/) can open the page and check them
automatically.

**In PHP.** Server functions are plain static methods: test them with
[PHPUnit](https://phpunit.de/) by calling them with an array of arguments.
Exponential UI's own suite (`tests/`) shows a bootstrap that loads the kernel
without a database.

**By hand.** Open your pages with the browser's console open, use every
feature, and look for red errors and `JQMIGRATE:` lines. [TESTING.md](TESTING.md)
has the checklist.

28. Security
------------

What the API does for you:

- **The form token** (from ezformtoken) goes with every POST that `Exp.io`
  and `Exp.prefs` make. You do not have to think about it.
- **The configuration block** is written so nothing in it can break out of its
  `<script>` element.
- **No `eval`**, no inline event handlers in the API: it works under a strict
  [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

What is your job:

- **Put text in as text.** `$el.text(value)` for anything that came from a
  user or the server. Use `.html()` only for HTML you know is safe, such as a
  template your server function rendered.
- **Wash in templates**: `{$value|wash}` in attributes and HTML.
- **Check permissions in server functions** (chapter 16), every time.

> [!NOTE]
> **Loading jQuery from a CDN?** `[ExpUI] JQuery=cdn` loads code.jquery.com's
> copy. The settings carry
> [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
> hashes, so a template writing its own `<script>` tag can make the browser
> refuse a changed file. The local copy, the default, needs none of this.

[SECURITY.md](SECURITY.md) has the full picture and how to report a problem.

29. Speed and deployment
------------------------

- **One request.** Everything in one `ezscript_require()` becomes one packed
  file.
- **Cached for long.** The packed file's name changes when its sources change,
  so browsers can keep it for as long as they like.
- **Per-page values are small.** `{exp_config()}` is a few hundred bytes.

When you deploy a change:

| You changed | Do |
|---|---|
| a `.js` or `.css` file | nothing; the next page gets a new packed file. Clear `template-block` if a cached page head still names the old one |
| a server function (PHP) | reload PHP-FPM; restart persistent workers |
| a `.tpl` | nothing with template caching off; else clear `template` |
| an INI setting | `php bin/php/ezcache.php --clear-tag=ini` |
| what a packer key returns (`ezjscServer_*`) | clear `ezjscore-packer` **and** `template-block` together |

> [!NOTE]
> **Never clear the packer cache alone.** Cached page heads name the packed
> files. Clear the packer without the template blocks and those heads point
> to files that no longer exist: pages lose their scripts and styles until
> `template-block` is cleared too. On Exponential Velocity,
> `exp:velocity deploy --packer` does both, in the right order.

---

Part 7 — The cookbook
=====================

30. Recipes
-----------

Short, complete, ready to adapt. Each assumes `exp::core` and `exp::io` are
loaded.

### Load more

```html
{* in a node's full view: its children, ten at a time *}
<ul id="news" data-exp-load-more='{ldelim}"parent": {$node.node_id}, "step": 10{rdelim}'></ul>
<button type="button" id="news-more">{'Load more'|i18n( 'design/standard' )}</button>
```

```js
Exp.register('load-more', function ($list, o) {
    var offset = 0, $button = Exp.$('#' + $list.attr('id') + '-more');
    function load() {
        $button.prop('disabled', true);
        Exp.io.call('ezjscnode::subtree', [o.parent, o.step, offset]).then(function (r) {
            r.list.forEach(function (node) {
                Exp.$('<li>').append(Exp.$('<a>').attr('href', Exp.io.url(node.url_alias)).html(node.name)).appendTo($list);
            });
            offset += r.count;
            $button.prop('disabled', false).prop('hidden', offset >= r.total_count);
        }, function (e) { $button.prop('disabled', false).text(e.message); });
    }
    $button.on('click', load);
    load();
});
```

### Save without reloading

```js
Exp.ready(function ($) {
    $('#settings-form').on('submit', function (e) {
        e.preventDefault();
        var $status = $('#settings-status').text(Exp.i18n('Loading...'));
        Exp.io.form(this, { submitter: e.originalEvent.submitter })
            .then(function () { $status.text(Exp.i18n('Saved.')); },
                  function (err) { $status.text(err.message); });
    });
});
```

### A panel that remembers

```js
Exp.register('remember-open', function ($el, o) {
    // <details data-exp-remember-open="myext_filters_open"> — the value is the preference's name
    $el.on('toggle', function () { Exp.prefs.set(o.value, this.open ? '1' : '0'); });
});
```

### Search as you type

```js
Exp.register('live-search', function ($input, o) {
    var controller, timer;
    $input.on('input', function () {
        clearTimeout(timer);
        var q = this.value.trim();
        timer = setTimeout(function () {                     // wait for a pause in typing
            if (controller) { controller.abort(); }
            if (q.length < 2) { return; }
            controller = new AbortController();
            Exp.io.call(o.fn, [q], { signal: controller.signal })
                .then(function (html) { Exp.$(o.results).html(html); Exp.start(o.results); })
                .catch(function (e) { if (e.kind !== 'network') { Exp.$(o.results).text(e.message); } });
        }, 250);
    });
});
```

```html
<input type="search" data-exp-live-search='{ldelim}"fn": "myexttpl::results", "results": "#hits"{rdelim}'>
<div id="hits" aria-live="polite"></div>
```

`myexttpl::results` is a template function (chapter 17) that renders the hits
for the search text in `$arguments[0]`.

### Warn before leaving unsaved changes

```js
Exp.register('unsaved-warning', function ($form) {
    var dirty = false;
    $form.on('input change', function () { dirty = true; });
    $form.on('submit', function () { dirty = false; });
    Exp.$(window).on('beforeunload', function (e) {
        if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
});
```

### A shortcut to the search field

```js
Exp.ready(function ($) {
    Exp.keys.bind('/', function () { $('#searchtext').trigger('focus'); return false; });
});
```

> [!NOTE]
> **Recipes are modules on purpose.** Registered once in your extension's
> script, each one is switched on by an attribute in any template, as many
> times as you like, and starts by itself in HTML that arrives later.

---

Part 8 — Ready-made modules
===========================

Modules are features you switch on rather than write: a packer key, a few
options, and they do the work. Each has its own page with every option; these
chapters get you going.

31. Panels that collapse: `exp::collapse`
-----------------------------------------

A filter panel, a side menu, a "more details" box: anything that opens and
closes, and should stay the way the user left it.

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::collapse' ) )}

{def $closed = cond( ezpreference( 'myext_filters_closed' ), 1, 0 )}
<a href="#" id="filters-toggle">Filters</a>
<div id="filters"{if $closed} style="height: 0; overflow: hidden"{/if}>…</div>

<script>
{literal}
Exp.ready(function () {
    Exp.collapse({
        link: '#filters-toggle',
{/literal}
        collapsed: "{$closed}",
{literal}
        elements: [{ selector: '#filters', duration: 0.3,
                     fullStyle: { height: '240px' }, collapsedStyle: { height: '0px' } }],
        pref: { name: 'myext_filters_closed', values: [0, 1] }
    });
});
{/literal}
</script>
```

- `elements` lists what changes, with its styles in each state. Sizes are
  animated, other values set at once, and with reduced motion everything is
  instant.
- `pref` saves the state for the user after each change, and the template reads
  it back with `ezpreference()`.
- The link gets `aria-expanded`, so screen readers know whether the panel is
  open.

> [!NOTE]
> **Already have YUI's `Y.eZ.CollapsibleMenu`?** The configuration is the
> same. Change `new Y.eZ.CollapsibleMenu(...)` to `Exp.collapse(...)`, and the
> `Y.io.ez.setPreference()` callback to `pref`. The admin's right menu and edit
> menu were moved exactly like this. Every option, the instance's methods and
> the before/after: [modules/collapse.md](modules/collapse.md).

32. A toolbar that stays in view: `exp::sticky`
-----------------------------------------------

In the admin it works by itself: the edit forms' toolbar stays at the top while
you scroll, and "go to the top" appears, in every admin design. For a toolbar of
your own:

```js
Exp.ready(function ($) {
    $('#my-toolbar').expSticky({ form: '#my-form', start: '#my-form', className: 'is-stuck', scrollToStart: false });
});
```

```css
#my-toolbar.is-stuck { position: fixed; top: 0; left: 0; right: 0; box-shadow: var(--exp-shadow-up); }
```

Once the top of `start` scrolls under the toolbar, the toolbar gets the class
(`controlbar-fixed` in the admin), and your stylesheet decides what "fixed"
looks like.

> [!NOTE]
> **Why a class and not just `position: sticky`?** For a toolbar alone, CSS's
> `position: sticky` is enough, and needs no script. The class is there because
> other code reads it: ezautosave's preview moves itself when the admin's
> toolbar is fixed. All options are in [modules/sticky.md](modules/sticky.md).

---

Part 9 — Looking ahead
======================

33. Modules that are coming
---------------------------

Exponential UI grows release by release until every YUI feature has its
replacement. What is planned, with the API it will have:

| Module | For | API |
|---|---|---|
| `exp::dialog` | dialogs, confirmations, alerts on the native `<dialog>` | `Exp.dialog.open()`, `.confirm()`, `.alert()` |
| `exp::datatable` | sortable, paged tables (sub-items, tags, newsletters) | `$(table).expDataTable({...})` |
| `exp::datepicker` | date and time fields | `$(fieldset).expDatePicker({fields, time})` |
| `exp::upload` | uploads with drag and drop | `$(el).expUpload({url, multiple, drop})` |
| `exp::autosave` | saving drafts while editing | `$(form).expAutosave()` |
| `exp::sortable`, `exp::tabs`, `exp::timeline`, `exp::gallery`, `exp::carousel`, `exp::rating`, `exp::flyout`, `exp::toggle` | ezflow, the site designs, star ratings and more | see [MODULES.md](MODULES.md) |

[MODULES.md](MODULES.md) shows each one's status and [ROADMAP.md](ROADMAP.md)
the order. As each lands, it gets its own chapter in this book.

> [!NOTE]
> **Built on what the browser already has.** The dialogs will use the native
> [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
> element, the date pickers the browser's own date input where it is good
> enough. Less code to download, better behaviour for screen readers, and less
> to break.

---

Appendices
==========

A. Quick reference card
-----------------------

```text
TEMPLATE
  {exp_config()}                                  configuration (once per page)
  {exp_config( hash( 'prefs', array('a'), 'strings', array('Saved.') ) )}
  {ezscript_require( array( 'exp::core', 'exp::io' ) )}
  {ezcss_require( 'exp/core.css' )}

CORE
  Exp.$                    jQuery 4
  Exp.ready(fn($))         when the page is ready
  Exp.register(name, fn($el, options))      data-exp-<name>
  Exp.start(root, only)    start modules in new HTML
  Exp.config               root, www, siteaccess, call, locale{code,http,firstDay}
  Exp.i18n(text, params)   translated text
  Exp.on / off / emit      page-wide events
  Exp.prefs.get(name, fallback) / .set(name, value) → Promise
  Exp.keys.bind(combo, fn, {inInputs, scope}) → id ; Exp.keys.unbind(id)
  Exp.reducedMotion        true: keep motion to a minimum
  Exp.token()              the form token

SERVER
  Exp.io.call(fn, args, {method, data, timeout, signal}) → Promise(content)
  Exp.io.form(form, {url, submitter}) → Promise(response)
  Exp.io.poll(fn, args, {every, until, max, onTick}) → Promise(content)
  Exp.io.url(path)         a site address
  error.kind               signedout refused server network timeout invalid

CSS
  --exp-ink --exp-muted --exp-faint --exp-line --exp-soft --exp-card
  --exp-accent --exp-accent-dark --exp-accent-ring
  --exp-ok --exp-warn --exp-bad --exp-info (+ -bg)
  --exp-radius --exp-radius-s --exp-shadow --exp-shadow-up --exp-mono --exp-speed
  .exp-visually-hidden  .exp-focus-ring  .exp-scope  html.exp-js
```

B. Troubleshooting
------------------

| You see | It means | Do |
|---|---|---|
| `Exp is not defined` | the script ran before `exp::core`, or the key is missing | list `exp::core` first, and your script after it |
| `/expui/test` is empty | the design list was cached before the extension was active | `php bin/php/ezcache.php --clear-all`, restart persistent workers |
| pages lose styles and menus after clearing a cache | the packer was cleared without `template-block` | clear `template-block` (and `content`) too |
| a call rejects with `kind: 'signedout'` | the session ended | sign in again; send the user to `Exp.io.url('user/login')` |
| a call rejects with `kind: 'server'` and `Not a valid ezjscServerRouter argument: "…"` | ezjscore does not know that group or function: a typo, a missing `[ezjscServer_<group>]`, or an INI cache from before you added it | check the spelling and `ezjscore.ini.append.php`, then `php bin/php/ezcache.php --clear-tag=ini` |
| a call rejects with `kind: 'refused'` | the user lacks the `ezjscore/call` policy | add it to their role |
| `… is not a function` on `.size` or `$.browser` | old jQuery code on jQuery 4 | chapter 26 |
| many `JQMIGRATE:` lines | old jQuery calls, named one by one | fix them with chapter 26, then switch Migrate off |
| a module does nothing | the attribute name does not match the registered name | `data-exp-<name>`, lower case, same spelling; check `Exp.modules()` |
| a click runs its handler twice | the handler is bound twice: once in a module and once more outside it, or by two modules on the same element | bind each handler in one place; each module starts only once per element |

More answers: [FAQ.md](FAQ.md).

C. Glossary
-----------

| Word | Means |
|---|---|
| **ezjscore** | the Exponential extension that packs scripts and answers server calls |
| **packer key** | a name like `exp::core` that stands for one or more files in `ezscript_require()` |
| **server function** | a PHP method that answers `Exp.io.call()`, named `group::function` |
| **call view** | the address `/ezjscore/call/` every server call goes to |
| **form token** | a secret per session that proves a POST came from your own page (ezformtoken) |
| **siteaccess** | one of the installation's sites or admin interfaces, each with its own address and settings |
| **module** (in this book) | behaviour registered with `Exp.register()` and switched on by `data-exp-<name>` |
| **jQuery Migrate** | a helper that puts removed jQuery functions back and warns about each use |
| **design token** | a named design value such as `--exp-accent` |
| **Promise** | an answer that arrives later; `.then()` runs when it does |

D. Further reading
------------------

**This extension**
- [GETTING_STARTED.md](GETTING_STARTED.md) — the ten-minute tour
- [API.md](API.md) — every function, exactly
- [INSTALL.md](INSTALL.md), [CONFIGURATION.md](CONFIGURATION.md) — setting it up
- [CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md) — moving existing code
- [ARCHITECTURE.md](ARCHITECTURE.md) — how it works inside
- [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md), [FAQ.md](FAQ.md)

**jQuery**
- [learn.jquery.com](https://learn.jquery.com/) — learning jQuery from the start
- [api.jquery.com](https://api.jquery.com/) — every function, with examples
- [The jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/)
- [jQuery Migrate](https://github.com/jquery/jquery-migrate)
- [jQuery UI](https://jqueryui.com/)
- [`jQuery.ajax()`](https://api.jquery.com/jQuery.ajax/) — what `Exp.io` uses underneath

**The web platform (MDN)**
- [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) and [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [`data-*` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*)
- [The `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) and [`matchMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
- [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) and [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)

**Accessibility and testing**
- [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Playwright](https://playwright.dev/), [PHPUnit](https://phpunit.de/)

**Exponential**
- [exponential.earth](https://exponential.earth)

---

*Found something unclear, or a recipe you wish were here? Open an issue at
[github.com/se7enxweb/expui](https://github.com/se7enxweb/expui): this book
grows with the questions people ask.*
