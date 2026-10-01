Architecture
============

```
extension/expui/
├── autoloads/eztemplateautoload.php     the exp_config() operator
├── classes/
│   ├── expuiserverfunctions.php         the exp:: packer keys; the page configuration
│   └── expuitemplateoperators.php       {exp_config()}
├── design/standard/
│   ├── javascript/exp/
│   │   ├── core.js                      Exp: config, i18n, events, modules, prefs, keys
│   │   ├── io.js                        Exp.io: call, form, poll, url
│   │   ├── compat.js                    $.ez() over Exp.io
│   │   ├── collapse.js, sticky.js       the admin shell's modules
│   │   ├── dialog.js, upload.js,        the admin content's modules
│   │   │   datatable.js, datepicker.js,
│   │   │   autosave.js
│   │   └── test/                        the browser unit tests and their runner
│   ├── lib/jquery/                      jQuery 4.0.0, jQuery Migrate 4.0.2 (+ their licences)
│   ├── lib/jquery-ui/                   jQuery UI 1.14.2, for ezjsc::jqueryUI
│   ├── stylesheets/exp/                 core.css (the design tokens) and one stylesheet per module
│   └── templates/                       expui/test.tpl (the test page), page_head_exp.tpl (the admin head hook)
├── modules/expui/                       module.php, test.php (the test page, an echo for form tests)
├── settings/                            expui.ini, ezjscore.ini, module.ini, design.ini, site.ini
├── tests/                               PHPUnit: bootstrap and unit tests
├── translations/                        eng-US, ger-DE, untranslated
└── doc/                                 this documentation
```

How a page gets the API
-----------------------

1. The template writes `{exp_config()}`: `expUIServerFunctions::configScript()`
   puts the page's configuration into a JSON block.
2. `{ezscript_require( array( 'exp::core', 'exp::io' ) )}` goes to ezjscore's
   packer. For `exp::core` the packer asks `expUIServerFunctions::getCacheTime()`,
   gets `-1` ("adds files, run now") and calls `core()`, which puts these in
   front of the rest of the pack:

   | # | Part | What it does |
   |---|---|---|
   | 1 | `exp::before` (inline) | remembers the page's `jQuery` and `$`, if any |
   | 2 | `lib/jquery/jquery-4.0.0.min.js` | jQuery 4 becomes `window.jQuery` for a moment |
   | 3 | `lib/jquery/jquery-migrate-4.0.2.js` | (while `Migrate=enabled`) attaches to it |
   | 4 | `exp::boot` (inline) | checks it is jQuery 4, keeps it as `Exp.$`; if the page had another jQuery, `noConflict(true)` gives the page its `jQuery` and `$` back |
   | 5 | `exp/core.js` | the core, on `Exp.$` |

   `exp::io`, `exp::compat` and the module keys (the names in
   `expUIServerFunctions::MODULES`) add their file the same way. The inline parts
   have a file time, so the packer caches them inside the pack, in order.
3. The packer writes one file (`var/<site>/cache/public/javascript/<hash>.js`)
   and the page loads it.
4. The core reads the configuration block (at once, or when the page is ready if
   the block comes after the scripts), starts every `data-exp-*` module, and
   `Exp.ready()` callbacks run.

One jQuery, or two
------------------

Exponential UI sets ezjscore's script settings for `jquery`, `jqueryMigrate` and
`jqueryUI` in its own `settings/ezjscore.ini.append.php`. Of two active
extensions that set the same setting, the one listed first in
`ActiveExtensions` wins, so the order decides:

- **expui before ezjscore** (the recommended order): `ezjsc::jquery` loads
  jQuery 4.0.0 and jQuery Migrate 4, and `ezjsc::jqueryUI` jQuery UI 1.14.2. When
  `exp::core` comes after them, its boot sees that the page's jQuery is already
  a 4.x, drops the copy it brought (`noConflict(true)`), and uses the page's:
  one jQuery, `Exp.$ === window.jQuery`, `Exp.jQueryShared` is `true`, and every
  plugin is shared.
- **expui after ezjscore**, with the current ezjscore: ezjscore's own settings
  win, and they name the same jQuery 4.0.0 release (with its quiet Migrate
  build). One jQuery, shared as above. `exp::core::shared` recognises the
  release by its file name, so either copy counts.
- **expui after an older ezjscore** (one that ships jQuery 3.7.1): a page has
  two:

  | | jQuery 3 | jQuery 4 |
  |---|---|---|
  | Name | `window.jQuery`, `window.$` | `Exp.$` (and the `$` of `Exp.ready()`) |
  | Plugins | the page's (eztags, ezoe …) | the Exponential UI modules |
  | Talks to ezjscore | `$.ez()` (ezjscore's, or `exp::compat`'s) | `Exp.io` |

  They never see each other's plugins; `Exp.jQueryShared` is `false`.

Module code is the same in both cases: it uses `Exp.$`.

ezjscore loads Migrate together with jQuery only from the version whose
`ezjscServerFunctionsJs::jquery()` adds the `jqueryMigrate` file; an older one
loads jQuery 4 alone.

The admin designs
-----------------

Exponential UI reaches every admin design (admin, admin2, admin3) through two
kernel mechanisms, without overriding any of their templates:

- **The head hook.** Each admin design's `page_head_script.tpl` includes
  `design:page_head_exp.tpl` before its scripts. The kernel's copy, in
  `design/standard`, is empty. Exponential UI's copy, in its own
  `design/standard`, writes `{exp_config()}`, and wins because extension design
  directories are searched before the kernel's for each design.
- **The script and stylesheet lists.** `design.ini` `[JavaScriptSettings]
  BackendJavaScriptList[]` is the admin's packed script list, and
  `[StylesheetSettings] BackendCSSFileList[]` its packed stylesheet list.
  `settings/design.ini.append.php` appends `exp::core::shared`, `exp::io` and
  every module key to the first, behind `ezjsc::jquery`, and `exp/core.css`
  with the modules' stylesheets to the second
  ([CONFIGURATION.md](CONFIGURATION.md#designini-settingsdesigniniappendphp)).

The admin templates that use a module test for it first
(`if (window.Exp && window.Exp.collapse)`, `Exp.$.fn.expDataTable`,
`window.Exp.datepicker`, `window.Exp.autosave` …) and keep their YUI code in
the other branch, so each feature has exactly one owner on a page. Without
Exponential UI, the right menu's link still works: it is a plain
`user/preferences/set/...` address that reloads the page. `fixed_toolbar.js`
returns at once when `Exp.sticky` is there, and `showDatePicker()` is defined
by `exp::datepicker` when it is on the page, so the date templates' icon opens
its calendar.

Templates outside the admin's lists load what they need themselves: the
ezwebin and ezdemo date templates, ezwebin's autosave template and
asynchronous publishing's `content/queued.tpl` write `{exp_config()}` and ask
for `ezjsc::jquery`, `exp::core::shared` and their modules when expui is
active.

**Configuration blocks are merged.** The admin head writes one block, and a
template may add its own (`{exp_config( hash( 'prefs', … ) )}`) anywhere. The
core reads every `script#exp-config` (and `[data-exp-config]`) in page order and
merges them: configuration deeply, texts and preferences by name. Blocks
further down the page than the scripts are merged when the page is ready. A
preference set with `Exp.prefs.set()` since the page loaded is not overwritten
by the page's older value.

**The core runs once per page.** When a template asks for `exp::core` again on
a page that has it already, the second copy returns at once, so events and
modules registered with the first are kept. The jQuery a second
`exp::core` brings is dropped by its boot (`noConflict(true)`), and the page
keeps its own.

Server calls
------------

`Exp.io.call('class::function', [a, b])` posts
`ezjscServer_function_arguments=class::function::a::b` and `ezxform_token` to
`<root>/ezjscore/call/`, asking for JSON. The call view answers
`{error_text, content}`; `content` resolves the Promise, a non-empty
`error_text` rejects it (`kind: server`). This is the contract YUI's `io-ez` and
`$.ez()` use, so every existing server function works unchanged.

Writing a module
----------------

```js
(function (window) {
    'use strict';
    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    function MyThing($el, options) { /* … */ }

    $.fn.expMyThing = function (options) {                  // from code
        return this.each(function () { new MyThing($(this), options || {}); });
    };
    Exp.register('my-thing', function ($el, options) {      // from data-exp-my-thing
        $el.expMyThing(options);
    });
}(window));
```

Then: a server function `myThing()` in `expUIServerFunctions` that adds its file,
its name in `expUIServerFunctions::MODULES` (so `getCacheTime()` returns `-1`
for it), its CSS under
`stylesheets/exp/`, its texts in `[ExpUI] Strings` and the translations, its
tests (see [TESTING.md](TESTING.md)), its page in `doc/modules/`.

Rules every module keeps: jQuery 4 only; native elements first; works without
JavaScript where the page did before; started from `data-exp-*`; accessible
(ARIA, keyboard, focus); no `eval` or inline handlers; translated; Promises and
namespaced events (`exp:<module>:<what>`); styled with the `--exp-*` tokens
under `.exp-*` classes; no state in PHP statics.
