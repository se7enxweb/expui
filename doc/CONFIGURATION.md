Configuration
=============

Defaults ship in `extension/expui/settings/expui.ini.append.php`; change them in
`settings/override/expui.ini.append.php`. Clear the INI cache afterwards
(`php bin/php/ezcache.php --clear-tag=ini`) and the packer cache when the
scripts change (`--clear-id=ezjscore-packer,template-block`).

[ExpUI]
-------

| Setting | Default | Meaning |
|---|---|---|
| `JQuery` | `local` | Where jQuery 4 comes from. `local`: the extension's copy (no third-party request, works offline and behind a proxy). `cdn`: code.jquery.com. |
| `LocalScripts[jquery]` | `/lib/jquery/jquery-4.0.0.min.js` | The local jQuery, relative to the design directory. |
| `LocalScripts[migrate]` | `/lib/jquery/jquery-migrate-4.0.2.js` | The local jQuery Migrate — the build that **reports** each old API it meets. |
| `ExternalScripts[jquery]` | `https://code.jquery.com/jquery-4.0.0.min.js` | The CDN jQuery. |
| `ExternalScripts[migrate]` | `https://code.jquery.com/jquery-migrate-4.0.2.min.js` | The CDN Migrate. Note: this build is **muted** (no console warnings). |
| `ExternalIntegrity[jquery]`, `[migrate]` | sha384 hashes | Subresource Integrity of the CDN files, for templates that write their own `<script>` tags. The jQuery hash is the local file's too (the same file). |
| `Migrate` | `enabled` | jQuery Migrate 4 on top of jQuery 4. Keep it on while YUI and jQuery 3 code is being moved (it restores removed APIs and warns about each use); switch it off when your pages show no warnings. |
| `Strings[]` | the API's texts (45) | Texts handed to `Exp.i18n()` on every page, translated in the `extension/expui` context. Add your own module's texts here or per page with `{exp_config( hash( 'strings', … ) )}`. |

`Strings[]` holds the 45 interface texts of the core and the modules, each
translated in `translations/ger-DE` (and listed in `translations/untranslated`
for new languages):

| For | Texts |
|---|---|
| everything | `Close`, `Cancel`, `OK`, `Loading...` |
| server calls (`Exp.io`, and the modules that talk to the server) | `You are no longer signed in. Sign in again and repeat this.`, `The server answered with an error (HTTP %status).`, `No answer from the server.` |
| `exp::datepicker` | `Previous month`, `Next month`, `Choose a date` |
| `exp::datatable` | `No records found.`, `Data error.`, `Click to sort ascending`, `Click to sort descending`, `Sorted by %column, ascending`, `Sorted by %column, descending`, `Pages`, `Page %page`, `Page %page of %pages`, `First page`, `Previous page`, `Next page`, `Last page`, `Table actions`, `Table options`, `Number of items per page:`, `Visible table columns:`, `Custom`, `Please enter a valid number between 1 and %max`, `Select all`, `Select %name`, `Filter`, `Press Enter to edit` |
| `exp::upload` | `Select files`, `Select a file`, `or drop them here`, `or drop it here`, `Cancel the upload of %name`, `Waiting`, `Uploading`, `Done`, `Failed`, `Canceled`, `The file is too large (%size, at most %max).`, `This type of file is not accepted.` |

A text left out of the list is shown in English; `%name`-style placeholders are
filled by `Exp.i18n(text, params)`.

jQuery next to another jQuery is not a setting: when the page already has
jQuery 4, Exponential UI uses that one; when it has an older jQuery, it keeps
jQuery 4 as `Exp.$` and gives the page its own `jQuery` and `$` back; when it has
none, jQuery 4 is the page's jQuery too.

ezjscore.ini (`settings/ezjscore.ini.append.php`)
--------------------------------------------------

`[eZJSCore]`, which the packer keys `ezjsc::jquery` and `ezjsc::jqueryUI` read.
These win only while expui is listed **before** ezjscore in `ActiveExtensions`
([INSTALL.md](INSTALL.md#switch-it-on)).

| Setting | Value | What it is |
|---|---|---|
| `LocalScripts[jquery]` | `/lib/jquery/jquery-4.0.0.min.js` | jQuery for `ezjsc::jquery` |
| `LocalScripts[jqueryMigrate]` | `/lib/jquery/jquery-migrate-4.0.2.js` | loaded right after it; leave it empty to load jQuery alone |
| `LocalScripts[jqueryUI]` | `/lib/jquery-ui/jquery-ui-1.14.2.min.js` | jQuery UI for `ezjsc::jqueryUI` |
| `ExternalScripts[...]` | code.jquery.com | the same files from the CDN, when ezjscore's `LoadFromCDN=enabled` |

`[ExpUI] Migrate` switches Migrate for `exp::core`; for `ezjsc::jquery` it is
`LocalScripts[jqueryMigrate]` (and `ExternalScripts[jqueryMigrate]`). Turn both
off together once your pages show no Migrate warnings.

design.ini (`settings/design.ini.append.php`)
---------------------------------------------

What every admin design (admin, admin2, admin3) loads on every page, after the
kernel's own lists:

| Setting | Values |
|---|---|
| `[JavaScriptSettings] BackendJavaScriptList[]` | `exp::core::shared`, `exp::io`, `exp::collapse`, `exp::sticky`, `exp::dialog`, `exp::upload`, `exp::datatable`, `exp::datepicker`, `exp::autosave` |
| `[StylesheetSettings] BackendCSSFileList[]` | `exp/core.css`, `exp/dialog.css`, `exp/upload.css`, `exp/datatable.css`, `exp/datepicker.css`, `exp/autosave.css` |
| `[ExtensionSettings] DesignExtensions[]` | `expui` (its `design/standard` with the scripts, styles, the test page and the `page_head_exp.tpl` hook) |

The scripts come behind `ezjsc::jquery`, so `exp::core::shared` uses the page's
jQuery 4. After changing these lists, clear the INI, packer and template-block
caches together (`--clear-tag=ini`, `--clear-id=ezjscore-packer,template-block`).

The packer keys
---------------

Registered in `ezjscore.ini` (`[ezjscServer_exp] Class=expUIServerFunctions`):

| Key | Adds to the page |
|---|---|
| `exp::core` | jQuery 4, Migrate 4 (when enabled), the core |
| `exp::core::shared` | the same, without jQuery and Migrate when `ezjsc::jquery` earlier in the list loads the same jQuery release |
| `exp::io` | `Exp.io` (after `exp::core`) |
| `exp::compat` | `$.ez()` over `Exp.io` (after `exp::io`) |
| `exp::collapse`, `exp::sticky` | the admin shell's modules (after `exp::core`) |
| `exp::dialog`, `exp::upload`, `exp::datatable`, `exp::datepicker`, `exp::autosave` | the admin content's modules (after `exp::core`; the ones that talk to the server after `exp::io`) |

The module keys are the names in `expUIServerFunctions::MODULES`; each puts
`exp/<name>.js` into the pack. Use them in templates (`ezscript_require`,
`ezscript`) and in `design.ini` lists (`JavaScriptList[]`,
`BackendJavaScriptList[]`, `FrontendJavaScriptList[]`). Stylesheets:
`ezcss_require( array( 'exp/core.css', 'exp/dialog.css' ) )` or
`CSSFileList[]=exp/core.css`.

`{exp_config()}`
---------------

```html
{exp_config()}
{exp_config( hash( 'prefs', array( 'admin_left_menu_size' ), 'strings', array( 'Saved', '%count items' ) ) )}
```

| Option | |
|---|---|
| `prefs` | preference names whose values `Exp.prefs.get()` needs (letters, digits, `_`, `.`, `-`; others are ignored) |
| `strings` | more texts for `Exp.i18n()` on this page |

It writes one `<script type="application/json" id="exp-config">` block with the
addresses, the siteaccess, its locale, the texts and the preferences. Values are
escaped so nothing in them can end the block. A page may have several: the
admin designs write one in their `<head>`, and a template can add its own for
its preferences and texts. The core merges them in page order (configuration
deeply, texts and preferences by name); blocks further down than the scripts
are merged when the page is ready.

These values are deliberately **not** inside the packed script files: the packer
caches those by file and address, and two siteaccesses on one address (host
matching) would otherwise share one siteaccess's locale and translations.

Permissions
-----------

| Policy | Allows |
|---|---|
| `expui/test` | the test page `expui/test` (it saves a test preference for the user running it) |

The API itself needs no policy: it uses the server functions and preferences the
user may use anyway.
