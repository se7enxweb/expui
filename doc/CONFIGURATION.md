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
| `Strings[]` | the API's texts | Texts handed to `Exp.i18n()` on every page, translated in the `extension/expui` context. Add your own module's texts here or per page with `{exp_config( hash( 'strings', … ) )}`. |

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

The packer keys
---------------

Registered in `ezjscore.ini` (`[ezjscServer_exp] Class=expUIServerFunctions`):

| Key | Adds to the page |
|---|---|
| `exp::core` | jQuery 4, Migrate 4 (when enabled), the core |
| `exp::io` | `Exp.io` (after `exp::core`) |
| `exp::compat` | `$.ez()` over `Exp.io` (after `exp::io`) |

Use them in templates (`ezscript_require`, `ezscript`) and in `design.ini` lists
(`JavaScriptList[]`, `BackendJavaScriptList[]`, `FrontendJavaScriptList[]`).
Stylesheet: `ezcss_require( 'exp/core.css' )` or `CSSFileList[]=exp/core.css`.

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
addresses, the siteaccess, its locale, the texts and the preferences. Once per
page. Values are escaped so nothing in them can end the block.

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
