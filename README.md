Exponential UI
==============

**The modern, supportable JavaScript API of Exponential: jQuery 4, a small `Exp`
namespace, and one module per interactive feature of the admin and the site
designs.** It replaces YUI 2 and YUI 3 feature by feature, without removing a
single feature on the way.

[![License: GPL v2 or later](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)](LICENSE.md)
[![jQuery 4](https://img.shields.io/badge/jQuery-4.0-0769ad.svg)](https://jquery.com)
[![Exponential 6](https://img.shields.io/badge/Exponential-6-f26a21.svg)](https://exponential.earth)

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io' ) )}

<script>
Exp.ready(function ($) {
    Exp.io.call('ezjscnode::subtree', [2, 10, 0]).then(function (content) {
        $('#news').html(content);
    }, function (error) {
        $('#news').text(error.message);   // signed out, refused, server error, no answer: said, not swallowed
    });
});
</script>
```

Why
---

- **One library instead of three.** Exponential shipped YUI 2.8, YUI 3.17 and
  jQuery 3 side by side, 47 MB of it end-of-life. Exponential UI is jQuery 4 plus
  a few small, focused modules.
- **Native first.** `<dialog>`, `<input type=date>`, `fetch`-style Promises, CSS
  transitions, `position: sticky`: where the browser does the job, the module
  uses it, and jQuery holds it together.
- **One jQuery, the current one.** Activated before ezjscore, Exponential UI
  moves `ezjsc::jquery` and `ezjsc::jqueryUI` to jQuery 4 and jQuery UI 1.14,
  and the admin's own code has been moved with them. jQuery Migrate stays on
  while you move yours and names every old call in the console.
- **Your code keeps working.** YUI stays where it is until each of its features
  has been rebuilt, and the features already rebuilt (the admin's collapsible
  menus and edit toolbar, the sub-items and tags tables, the relation upload
  and ezmultiupload, the date fields, autosave and its preview) behave as
  before in every admin design: admin, admin2 and admin3. Each keeps its YUI
  version for when Exponential UI is not active. On an older Exponential whose ezjscore still ships
  jQuery 3, activate Exponential UI after ezjscore: pages keep jQuery 3, and
  the API runs next to it on its own jQuery 4 (`Exp.$`). `$.ez()` keeps working
  on top of the new server calls.
- **Built to last.** Every module is accessible, translated, themeable with CSS
  custom properties, safe under a strict Content Security Policy, and covered by
  unit tests in the browser and in PHPUnit.

What is in it today (1.0.0.1)
-----------------------------

| Packer key | Gives you |
|---|---|
| `exp::core` | jQuery 4 (as `Exp.$`), `Exp.config`, `Exp.i18n()`, `Exp.on()`/`emit()`, `Exp.register()`/`start()` for `data-exp-*` modules, `Exp.ready()`, `Exp.prefs`, `Exp.keys`, `Exp.reducedMotion` |
| `exp::io` | `Exp.io.call()`, `.form()`, `.poll()`, `.url()` — server calls through ezjscore, Promise based, with clear errors |
| `exp::compat` | `$.ez()` on the page's jQuery and on `Exp.$`, as a wrapper over `Exp.io` |
| `exp::collapse` | `Exp.collapse()`, `$.fn.expCollapse`: menus and panels that collapse, remembered per user (the admin's right menu and edit menu use it) |
| `exp::sticky` | `Exp.sticky`, `$.fn.expSticky`: a toolbar that stays in view while scrolling, and "go to the top" (the admin's edit forms use it) |
| `exp::dialog` | `Exp.dialog.open()`, `.confirm()`, `.alert()`, `.form()`, `data-exp-dialog`: modal dialogs on the native `<dialog>` (the relation upload uses it) |
| `exp::upload` | `$.fn.expUpload`, `data-exp-upload`: uploads with a progress bar and Cancel per file, several files, drop zones (the relation upload and ezmultiupload use it) |
| `exp::datatable` | `$.fn.expDataTable`, `data-exp-datatable`: sortable, paged tables with selection, menus, inline editing and Table options (the sub-items table and eztags' children table use it) |
| `exp::datepicker` | `$.fn.expDatePicker`, `Exp.datepicker`: a calendar for date and date/time fields (the admin's, ezwebin's and ezdemo's date fields use it) |
| `exp::autosave` | `Exp.autosave.AutoSubmit`, `Exp.autosave.Preview`: drafts saved while editing, and their preview (ezautosave uses it) |
| `{exp_config()}` | the page's configuration, translations and preferences for the modules |

Each module has its page in [doc/MODULES.md](doc/MODULES.md). The modules that
take over the remaining YUI widgets (ezflow's tabs, drag and drop and timeline,
the site designs' galleries, fly-outs and star rating …) land release by
release; the [roadmap](doc/ROADMAP.md) says which and when.

Get started
-----------

```sh
composer require se7enxweb/expui
```

Switch it on before ezjscore (`settings/override/site.ini.append.php`):

```ini
[ExtensionSettings]
ActiveExtensions[]=expui
ActiveExtensions[]=ezjscore
```

Current Exponential ships jQuery 4 in ezjscore, and either order gives every
page jQuery 4; before ezjscore adds the Migrate build that names each old call
in the console. On an older Exponential, list it after ezjscore.
[INSTALL.md](doc/INSTALL.md#switch-it-on) has the table.

```sh
php bin/php/ezpgenerateautoloads.php --extension
php bin/php/ezcache.php --clear-all
```

Open `/expui/test` in the admin: every unit test of the API runs there, on a real
admin page, and should say *110 passed, 0 failed*. Then follow
[doc/GETTING_STARTED.md](doc/GETTING_STARTED.md).

Documentation
-------------

| Guide | For |
|---|---|
| **[Using Exponential UI](doc/USEING_EXPUI.md)** | **The book**: everything, from your first page to your own modules, server functions, styles and tests, with recipes and Notes. Start here. |
| [Getting started](doc/GETTING_STARTED.md) | Your first page with the API, step by step. |
| [Installation](doc/INSTALL.md) | Requirements, installing, activating, checking, upgrading, removing. |
| [API reference](doc/API.md) | Every function of `Exp`, `Exp.io`, `Exp.prefs`, `Exp.keys`, the compat layer and the modules, with examples. |
| [Modules](doc/MODULES.md) | Each module: what it replaces, its status, and its own page (`doc/modules/`). |
| [Converting YUI to Exponential UI](doc/CONVERTING_YUI_to_EXPUI.md) | Do you need to change anything? (Most sites: no.) If you do: every YUI call and its replacement, step by step, with commands. |
| [Configuration](doc/CONFIGURATION.md) | `expui.ini` and its texts, what the admin designs load (`design.ini`), the packer keys, `{exp_config()}`. |
| [Testing](doc/TESTING.md) | Running the tests, writing tests for your own modules. |
| [Security](doc/SECURITY.md) | What the API does to stay safe, and what you should do. |
| [Architecture](doc/ARCHITECTURE.md) | How it is built: files, loading, jQuery side by side, the server functions. |
| [FAQ](doc/FAQ.md) | The questions that come up first. |
| [Roadmap](doc/ROADMAP.md) | What lands next. |
| [Changelog](doc/CHANGELOG.md) | What changed in each release. |
| [Contributing](CONTRIBUTING.md) | Reporting problems, adding a module, translating. |

Requirements
------------

- Exponential 6 with ezjscore (the kernel's).
- PHP 7.4 or later (tested up to PHP 8.5).
- Browsers: the evergreen browsers jQuery 4 supports (Chrome, Edge, Firefox,
  Safari, and their mobile versions).
- Runs under PHP-FPM and persistent-worker servers such as Exponential Velocity.

License
-------

GNU General Public License v2.0 (or any later version), see
[LICENSE.md](LICENSE.md). jQuery and jQuery Migrate are © OpenJS Foundation and
other contributors, MIT License (`design/standard/lib/jquery/LICENSE-*.txt`).

Issues: https://github.com/se7enxweb/expui/issues
