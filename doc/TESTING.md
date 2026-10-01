Testing
=======

Exponential UI is tested on two sides, and both suites grow with every module.

The JavaScript: in the browser
------------------------------

**`/expui/test`** (admin) runs the unit tests of every module on a real admin
page — the admin's own jQuery (jQuery 4 shared with `Exp.$` when expui comes
before ezjscore, or jQuery 3 next to it when it comes after) and YUI, a real
session, the real ezjscore endpoint. Results show on the page and in
`window.ExpTestResults`:

```js
{ done: true, passed: 110, failed: 0, tests: [ { name, passed, error, assertions, ms }, … ] }
```

The page loads every packer key and every module stylesheet itself (with
`ezscript`, as a page that uses the API would), so it tests the modules on any
siteaccess the user may open it on. The tests live in
`design/standard/javascript/exp/test/`:

| File | Tests | Covers |
|---|---|---|
| `runner.js` | | the runner: `ExpTest.test(name, fn)`, assertions `ok`, `equal`, `deepEqual`, `throws`, `rejects(promise, kind)`; a test times out after 15 s |
| `core.test.js` | 14 | jQuery 4 next to the page's jQuery, `Exp.config`, `Exp.i18n`, events, `register`/`start`, `keys`, `prefs` (saved and read back), merged configuration blocks, the core loaded once, environment |
| `io.test.js` | 12 | `callString`, `call` (POST, GET, unknown function, invalid, aborted), `poll` (until, gives up), `form` (fields, lists, submitter, token), `url` |
| `compat.test.js` | 4 | `$.ez()` on both jQuerys, callback and jqXHR, GET, single install |
| `collapse.test.js` | 8 | styles at once and animated, `aria-expanded`, the template's state, function values, content, callbacks, the event, the preference, the plugin |
| `sticky.test.js` | 4 | a page without the form, fixing and unfixing, scrolling to the start, the plugin |
| `dialog.test.js` | 15 | the native modal, focus, Escape and close, `dismissible`, Tab, the backdrop, sizes, `confirm`, `alert`, `url`, `form`, templates, events, scripts not run, stacking, `data-exp-dialog` |
| `upload.test.js` | 10 | sizes and types, the chooser, one POST per file, a form's fields, refused files, Cancel, `parallel`, errors, drops, `data-exp-upload` |
| `datatable.test.js` | 25 | helpers, markup, sorting, pagers, every source, messages, selection, column toggling, Table options, menu buttons, inline editing, the filter, the keyboard, the plugin, events |
| `datepicker.test.js` | 10 | `showDatePicker()`, filling the fields, times, the selected date, months and limits, the keyboard, the first day, closing, the plugin, the icon |
| `autosave.test.js` | 8 | the form state, saves and no-change, extra and forced saves, errors, `stop()`, leaving a field, `enabled`, `beforeSerialize`, the preview |
| | **110** | |

The form, upload and dialog tests post to **`expui/test/echo`** (the test view
with its `echo` action), which answers with the fields and files it received.

Automated: a Playwright script signs in, opens the page, waits for
`ExpTestResults.done`, prints every result, then reloads the page and checks that
the preference the tests saved came back from the server.

The PHP: PHPUnit
----------------

```sh
cd extension/expui
php ../../vendor/bin/phpunit -c phpunit.xml.dist
# another installation's kernel:
EXPONENTIAL_ROOT=/path/to/exponential php /path/to/phpunit -c phpunit.xml.dist
```

No database, no request: the bootstrap loads the kernel classes and the
extension's own settings only.

| Test | Tests | Covers |
|---|---|---|
| `ServerFunctionsTest` | 18 | the files `exp::core` stands for (local, CDN, with and without Migrate), their order, every module key putting its file in front, the cache times the packer needs (`exp::core` and every module), the inline snippets, the page configuration and its escaping |
| `TemplateOperatorTest` | 3 | `{exp_config()}` with and without options |
| `PageJqueryTest` | 6 | `ezjsc::jquery` as expui sets it: jQuery 4 and Migrate 4, local and from the CDN; the kernel's `jquery()` adding Migrate right after jQuery, and only when it is named; the boot reusing a page's jQuery 4 |
| `ShippedFilesTest` | 12 | the settings ezjscore and the kernel read; the files behind `ezjsc::jquery`, `jqueryMigrate` and `jqueryUI` (jQuery 4, Migrate 4, jQuery UI 1.14) and the same files as `exp::core`'s; the jQuery and jQuery UI files against their CDN integrity hashes; the files the packer keys `exp::core` and every module name; the admin loading every module and the stylesheets it names; every module's and test's JavaScript parses (when `node` is installed); every text in every catalogue; the versions agree |
| | **39** | |

Checking your own pages after the switch
----------------------------------------

The two suites test Exponential UI. Whether *your* pages are ready for jQuery 4
is checked on your pages, after activating expui before ezjscore:

1. Open each page that has scripts of yours, with the browser's console open.
   Look for errors (red) and for `JQMIGRATE:` lines: each names an old call
   and where it is. Only one, `JQMIGRATE: Migrate is installed …`, is expected.
2. Use what the scripts do, not only the page load: click the buttons, open
   the dialogs and popups, type into the fields that suggest, drag what can be
   dragged. Most old calls only run when something is used.
3. Edit pages: choose a language when asked, and leave with **Discard**, so no
   draft stays behind.
4. Fix what you find with [step 6 of the conversion guide](CONVERTING_YUI_to_EXPUI.md#step-6--jquery-3-code-on-jquery-4)
   and check again. When no page shows a `JQMIGRATE:` line any more, Migrate can
   be switched off ([CONFIGURATION.md](CONFIGURATION.md)).

Writing tests for a module
--------------------------

1. Add `design/standard/javascript/exp/test/<module>.test.js`:

   ```js
   (function (window, document) {
       'use strict';
       var Exp = window.Exp, test = window.ExpTest.test;
       test('mymodule: starts from data-exp-mymodule', function (t) {
           var host = document.getElementById('exp-test-sandbox');
           host.innerHTML = '<div id="x" data-exp-mymodule=\'{"a": 1}\'></div>';
           Exp.start(host);
           t.ok(document.getElementById('x').classList.contains('is-ready'));
       });
       test('mymodule: talks to the server', function (t) {
           return Exp.io.call('mymodule::thing', [1]).then(function (c) { t.equal(c.ok, true); });
       });
   }(window, document));
   ```

2. Add it to the `ezscript( array( … ) )` list in
   `design/standard/templates/expui/test.tpl`.
3. Put its server side in a PHPUnit test under `tests/unit/`.
4. Open `/expui/test`; run PHPUnit.

`#exp-test-sandbox` is the place to put markup; `#exp-test-input` is a text
field for keyboard tests.
