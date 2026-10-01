Installation
============

Requirements
------------

| Need | Check |
|---|---|
| Exponential 6 with ezjscore active | admin, Setup, Extensions: `ezjscore` is ticked |
| PHP 7.4 or later | `php -v` |
| A current browser | Chrome, Edge, Firefox, Safari (and mobile) |

Nothing else: jQuery 4 and jQuery Migrate 4 come with the extension.

Install
-------

```sh
composer require se7enxweb/expui
```

(or download a release from https://github.com/se7enxweb/expui/releases and
unpack it as `extension/expui/`).

Switch it on
------------

In `settings/override/site.ini.append.php`, **before ezjscore**:

```ini
[ExtensionSettings]
ActiveExtensions[]=expui
ActiveExtensions[]=ezjscore
```

**Which jQuery your pages get** depends on your Exponential's ezjscore and on this
order. Of two active extensions that set the same setting, the one listed first
wins; Exponential UI sets ezjscore's `LocalScripts` and `ExternalScripts` for
`jquery`, `jqueryMigrate` and `jqueryUI`.

| Your ezjscore | expui **before** ezjscore (recommended) | expui **after** ezjscore |
|---|---|---|
| ships jQuery 4 (current Exponential) | jQuery 4.0.0 with the **reporting** Migrate 4 (names every old call in the console), jQuery UI 1.14.2 | jQuery 4.0.0 with ezjscore's **quiet** Migrate 4, jQuery UI 1.14.2 |
| ships jQuery 3 (older Exponential) | jQuery 4.0.0 **without** Migrate: an ezjscore this old does not load it, so old calls fail instead of warning. Not recommended | ezjscore's jQuery 3; the API brings its own jQuery 4 next to it (`Exp.$`). **Use this order with an older ezjscore** |

The API and the page share one jQuery 4 whenever the page has one. With the
current ezjscore, before is the recommended order while you move your own
code, because the console then tells you what to change. With an older
ezjscore, keep expui after ezjscore until you update Exponential. To see which
ezjscore you have:

```sh
grep -h '^LocalScripts\[jquery\]' extension/ezjscore/settings/ezjscore.ini
```

`jquery-4.0.0.min.js` is the current one. With an older ezjscore, run Step 1 of
[CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md#step-1--do-you-need-to-do-anything)
before you put expui first; it tells you whether your own code needs anything.

Then:

```sh
php bin/php/ezpgenerateautoloads.php --extension
php bin/php/ezcache.php --clear-all
```

On a persistent-worker server (Exponential Velocity and similar) restart the
workers too, so they load the new classes.

`--clear-all` matters: a new extension's design directory is only found once the
*design base* cache is cleared, and a new template only once the
*template-override* cache is.

Check it
--------

Open **`/expui/test`** in the admin. Every unit test of the API runs there; the
page should say **all passed** (110 tests in 1.0.0.1). The page needs the `expui/test`
policy; administrators have it.

From the shell, the PHP side:

```sh
cd extension/expui
php ../../vendor/bin/phpunit -c phpunit.xml.dist
```

What it changes
---------------

**In every admin design** (admin, admin2, admin3, and designs built on them),
whatever the order:

- the page's `<head>` gets the configuration block: the kernel's hook template
  `page_head_exp.tpl` is empty, and Exponential UI's copy writes
  `{exp_config()}`;
- the admin's script list (`[JavaScriptSettings] BackendJavaScriptList[]` in
  `design.ini`) gets `exp::core::shared`, `exp::io`, `exp::collapse`,
  `exp::sticky`, `exp::dialog`, `exp::upload`, `exp::datatable`,
  `exp::datepicker` and `exp::autosave`, and its stylesheet list
  (`[StylesheetSettings] BackendCSSFileList[]`) the modules' stylesheets with
  `exp/core.css`:
  - the core uses the page's jQuery 4 instead of loading a second copy;
  - the admin's collapsible menus run on `exp::collapse` instead of YUI's
    `ezcollapsiblemenu`;
  - the edit forms' toolbar runs on `exp::sticky`, and `fixed_toolbar.js`
    stands aside;
  - the sub-items table and eztags' children table run on `exp::datatable`;
  - the relation upload ("Upload a file" of object relation fields) runs on
    `exp::dialog` and `exp::upload`, and ezmultiupload's page on `exp::upload`;
  - the date and date/time fields open `exp::datepicker`'s calendar;
  - ezautosave's autosave and draft preview run on `exp::autosave`;
  - asynchronous publishing's status page (`content/queued.tpl`, which loads
    its keys itself) checks the status on `Exp.io`.

  Each module behaves as before (the deliberate differences are on its page)
  and is tested by use in each design. Each template keeps its YUI version for
  when Exponential UI is not active.

On the front end, the ezwebin and ezdemo date templates and ezwebin's
autosave template load the modules they need themselves.

With the menus and the toolbar, the admin's own jQuery code and that of the
extensions it uses (eztags, ezoe, ezie, xrowmetadata, ezstarrating,
cjw_newsletter) has been moved to jQuery 4. Tested by use, with no error and no
Migrate warning:

- the node tabs and their on/off switch;
- the header search;
- the class list and the extension list;
- the tags dashboard and the tag fields (suggestions while typing);
- the rich text editor's link popup;
- collapsible attribute groups;
- the image editor (opening, a server-side tool, undo, the selection tool,
  quitting without saving);
- the right menu and the edit page's object menu (collapsing, remembered per
  user);
- the edit toolbar (fixed while scrolling, "go to the top");
- since 1.0.0.1, compared with their YUI versions as well: the sub-items table
  and eztags' children table, the relation upload and ezmultiupload, the date
  and date/time fields, and ezautosave's autosave and preview.

The list grows in [CHANGELOG.md](CHANGELOG.md).

It also adds:

- the packer keys `exp::core`, `exp::core::shared`, `exp::io`, `exp::compat`,
  `exp::collapse`, `exp::sticky`, `exp::dialog`, `exp::upload`,
  `exp::datatable`, `exp::datepicker`, `exp::autosave` (used where a template
  or the admin's list asks for them);
- the template operator `{exp_config()}`;
- the module `expui` with the test page;
- the design directory `extension/expui/design/standard` (files under `exp/`,
  `lib/jquery/` and `lib/jquery-ui/`, and the `page_head_exp.tpl` hook).

**Migrate with `ezjsc::jquery` needs an ezjscore that knows `jqueryMigrate`.**
Older ezjscore versions load only the `jquery` file and ignore it; pages then
get jQuery 4 without Migrate, and old calls fail instead of warning. To see
which one you have:

```sh
grep -c jqueryMigrate extension/ezjscore/classes/ezjscserverfunctionsjs.php
```

`0` means the old one: keep expui after ezjscore until you update Exponential.

Upgrade
-------

```sh
composer update se7enxweb/expui
php bin/php/ezcache.php --clear-id=ezjscore-packer,template,template-block,ini
```

Read [CHANGELOG.md](CHANGELOG.md) first.

Clearing `ezjscore-packer` removes the packed script files; clear
`template-block` (and your HTTP caches) in the same step, so no cached page
still points to a removed file.

Remove
------

Take `ActiveExtensions[]=expui` out, then `composer remove se7enxweb/expui` and
`php bin/php/ezcache.php --clear-all`. Templates that call `{exp_config()}` or
the `exp::` keys must be changed first.
