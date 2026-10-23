Changelog
=========

Unreleased
----------

Changed
- The modules are no longer on every admin4 page: `design.ini` has no
  `BackendJavaScriptList[]` entry of Exponential UI any more. A template that
  uses a module requests it, with `exp::core::shared` first (and
  `ezjsc::jquery` in front only where its own code needs jQuery), through
  `ezscript_require()` outside any cache-block
  ([CONFIGURATION.md](CONFIGURATION.md#designini-settingsdesigniniappendphp)).
  The older admin designs (admin, admin3) still load every module on every
  page, now through `ClassicBackendJavaScriptList[]`. Needs Exponential 6.0.15,
  whose `design.ini` has that list and whose admin4 templates request their
  modules.

1.0.0.15 (2026-10-23)
---------------------

Added
- Exponential UI runs without jQuery. `exp::core::shared` on a page that
  requests no `ezjsc::jquery` brings none: the boot leaves `Exp.$` unset (no
  error), and `exp::core`, `exp::io` and `exp::datatable` run on plain
  JavaScript with the same API. Where jQuery 4 is on the page, they run on it
  exactly as before. [API.md](API.md#without-jquery)
- `exp::core`: `Exp.util.extend()`, `param()`, `isPlainObject()` (jQuery's
  rules; jQuery's own functions when it is there) and `Exp.util.request()`, a
  request as `jQuery.ajax()` sends it, on `fetch`. Without jQuery
  `Exp.config.jquery` is `null`, `Exp.ready()` hands over `undefined`, and
  `Exp.register()` modules get the element itself.
- `exp::io` without jQuery: the same requests through `fetch` (address,
  method, fields, form token, `Accept` and `X-Requested-With`, cookies for the
  same origin, timeouts, aborting) and the same answers and `Exp.io.Error`
  kinds; `Exp.io.raw()` then returns a Promise with `abort()`.
- `exp::datatable` is written on the DOM: `Exp.datatable.create(el, options)`
  sets up a table without jQuery (callbacks get elements: `render(row, td)`),
  `Exp.datatable.get(el)` finds one, the parts are there as elements
  (`table.body`, `table.pagers` …) and `table.rowData(tr)` gives a row. The
  events on the element are also `CustomEvent`s (the data in
  `event.detail`). `$.fn.expDataTable` stays, registered on `Exp.$` (and with
  `Exp.datatable.install(jQuery)` on a jQuery loaded later): the same markup,
  callbacks with jQuery objects, the jQuery properties (`$table`, `$body` …),
  `$.data(tr, 'expRow')`, listeners bound through jQuery so `.trigger()`
  reaches them. [modules/datatable.md](modules/datatable.md#without-jquery)
- `expui/test`: `ExpTest.bare()`, a frame without jQuery, and 7 tests of the
  plain JavaScript path. [TESTING.md](TESTING.md)
- `exp::collapse`, `exp::sticky`, `exp::dialog`, `exp::upload`,
  `exp::datepicker` and `exp::autosave` run without jQuery as well, with the
  same markup, classes, ARIA, keyboard, focus, animations and requests. Where
  jQuery 4 is on the page they run on it exactly as before: listeners bound
  through it (`.trigger()` reaches them), its `.animate()`, `.html()` and
  `$.ajax()`, the parts in jQuery, the plugins. New entry points that take
  elements: `Exp.upload.create()`, `Exp.datepicker.create()` and, to find an
  instance, `Exp.collapse.get()`, `Exp.sticky.get()`, `Exp.dialog.get()`,
  `Exp.upload.get()`, `Exp.datepicker.get()`; `Exp.sticky.start()`,
  `Exp.collapse()`, `Exp.dialog.*` and `Exp.autosave.*` take elements as
  before. The parts are there as elements (`dialog.body`, `upload.listElement`,
  a file's `row`, `preview.placeElement` …), in jQuery too while the page has
  it (`$body`, `$list`, `$row`, `preview.place` …). The events on the dialog
  and the upload element are also `CustomEvent`s (each listener hears one
  once); without jQuery the date picker's fields get a native `change` event
  and the events hand over elements. `Exp.<module>.install(jQuery)` puts the
  plugins on a jQuery loaded later. [API.md](API.md#without-jquery)
- `exp::core`: `Exp.util.css()`, `Exp.util.animate()` and `Exp.util.stop()`,
  jQuery's `.css()`, `.animate()` (`'show'`/`'hide'` for the fades) and
  `.stop()` by its rules and timing, for the modules without jQuery.
- `expui/test`: 11 tests of the plain JavaScript path of these modules, and
  `ExpTest.bare()` loads them (136 tests). [TESTING.md](TESTING.md)

Changed
- `exp::compat`, the one module that needs jQuery, says so in the browser
  console when the page has none, instead of setting nothing up silently.
- `dialog.body` is the body element; it was the same jQuery object as
  `dialog.$body`, which stays.
- A module file loaded twice keeps its first copy (and its open dialogs,
  uploads and toolbars) instead of setting up a second one.
- When the boot finds a jQuery that is not a 4.x, the core now runs without
  jQuery instead of not at all (the console still says which jQuery it found).

Fixed
- `exp::datatable`: while the `CustomEvent` of a table event is dispatched,
  only the table's own jQuery listeners are told it was triggered already, so
  each listener hears each event once and other jQuery handlers on the page
  are not held back. [modules/datatable.md](modules/datatable.md#events)
- `expui/test`: the `Exp.io` test without jQuery compares what reaches the
  server (the `expui/test/echo` answer) with what jQuery sends, instead of
  only what the client built.

1.0.0.14 (2026-10-20)
---------------------

Added
- Translations in French, Ukrainian, Arabic, Persian, Pashto and Kurdish (Kurmanji) (pull requests #1, #2 and
  #5). Pull request #4 (the ten languages of 1.0.0.13) is merged too; their released wording is kept.

Fixed
- `exp::datatable`: right to left (Arabic, Hebrew, Persian) the full pager puts first and previous at the right
  and next and last at the left, as the top pager and admin4's mirrored arrows already did (pull request #3).
  The groups float to `inline-start` and `inline-end`, so a left to right table inside a right to left page keeps
  its order; browsers without those values use the `[dir="rtl"]` rules. A browser test covers all three cases.
  [modules/datatable.md](modules/datatable.md#styles)

1.0.0.13 (2026-10-19)
---------------------

Added
- Translations in Croatian, Czech, Danish, Dutch, Italian, Norwegian, Polish, Brazilian Portuguese, Swedish and Turkish.

1.0.0.12 (2026-10-18)
---------------------

Updated
- `exp::sticky`: `scrollToStart` focuses the form's first text field without
  scrolling again (`focus({ preventScroll: true })`). On a page with
  `scroll-padding-top`, such as admin4's and admin4l's fixed header, the focus
  scrolled the field to the middle of the window and undid the scroll to the
  start; the test "scrolls to the start and focuses the first text field" failed
  there. [modules/sticky.md](modules/sticky.md)

1.0.0.11 (2026-10-18)
---------------------

Updated
- `expui/test` under an enforced Content Security Policy without
  `'unsafe-inline'`: the three tests that need inline scripts (a dialog with
  `scripts: true`, the classic `onclick` calendar icon by click and by keyboard)
  report "N/A under enforced CSP" with the reason instead of failing; they still
  run where the policy allows inline scripts. The runner has `t.skip(reason)`,
  `t.needsInlineScripts(what)` and `ExpTest.inlineScripts()`, and
  `ExpTestResults` counts `skipped`. The dialog test is split: "not run by
  default" runs under every policy. [TESTING.md](TESTING.md)
- The version in `Exp.version` and `expUIServerFunctions::VERSION` agrees with
  `ezinfo.php` and `extension.xml` again (they still said 1.0.0.8).

1.0.0.10 (2026-10-17)
---------------------

Updated
- `expui/test`: the tests start from a file, `exp/test/start.js`, instead of an
  inline script, so the test page runs under a Content Security Policy without
  `unsafe-inline`. [TESTING.md](TESTING.md)

1.0.0.8 (2026-10-16)
--------------------

Updated
- `exp::sticky`: the "go to the top" link is shown at an opacity of 0.85
  (`toTopOpacity`, was 0.6). At 0.6 the page showed through so much that its
  white text on the admin's ink color fell to a contrast of 4.18:1, below the
  4.5:1 that text needs. [modules/sticky.md](modules/sticky.md)

1.0.0.7 (2026-10-16)
--------------------

Updated
- `exp::collapse`: a link that is no control by itself (an `<a>` without
  `href`, a `<span>`) and has no role of its own gets `role="button"` and
  `tabindex="0"`, and Enter and Space toggle it. The autosave preview's link is
  such a link: it is now reached with the keyboard, and its `aria-expanded` is
  allowed on it. [modules/collapse.md](modules/collapse.md)

1.0.0.4 (2026-10-02)
--------------------

Added
- `exp::datatable`: ordered columns (`columnToggle.ordered`, `setShown()`,
  `moveColumn()`, `shownColumns()`), with an order list in Table options that
  takes drag and drop or up and down buttons; columns in groups, a column
  filter, presets (`tableOptions.presets`) and footer buttons
  (`tableOptions.buttons`) in Table options; columns that copy their value on a
  click (`copy`), aligned columns (`align`), descriptions (`title`), and
  `remote` columns that load the rows again when shown. Used by the admin's
  sub items table for the subitems column registry.
  [modules/datatable.md](modules/datatable.md)

1.0.0.1 (2026-10-01)
--------------------

Phase 3 of the [roadmap](ROADMAP.md), the admin's content. Five modules take
over the YUI widgets the admin uses for its content: the sub-items and tags
tables, dialogs, uploads, date fields, and autosave with its preview. Each one
was compared with its YUI version in the admin, admin2 and admin3 designs, on
Exponential Velocity and on PHP-FPM, and each template keeps its YUI version as
the fallback when Exponential UI is not active.

Added
- `exp::dialog`: `Exp.dialog.open()`, `confirm()`, `alert()`, `form()`,
  `create()`, `current()`, `closeAll()` and `data-exp-dialog`, on the native
  `<dialog>`: the page behind inert, the focus kept inside and given back,
  Escape and the close button answering `null`, HTML content inserted without
  running its scripts unless asked. With `exp/dialog.css`.
  [modules/dialog.md](modules/dialog.md)
- `exp::upload`: `$.fn.expUpload`, `Exp.upload` and `data-exp-upload`: one
  request per file with a progress bar and Cancel each, several files at once,
  drop zones, size and type checks, a form's fields posted in their order with
  the file. With `exp/upload.css`. [modules/upload.md](modules/upload.md)
- `exp::datatable`: `$.fn.expDataTable`, `Exp.datatable` and
  `data-exp-datatable`: sorting, paging with YUI Paginator's rules, a request
  cache, selection with shift ranges, column toggling saved by callback or
  preference, inline editing, ARIA menu buttons, the "Table options" dialog, a
  filter, the keyboard in the rows. Escape on a menu button closes a menu
  opened with the mouse, and a table wider than its column scrolls sideways
  inside `.exp-dt-scroll` instead of running over the next column. With
  `exp/datatable.css`. [modules/datatable.md](modules/datatable.md)
- `exp::datepicker`: `$.fn.expDatePicker`, `Exp.datepicker` and
  `window.showDatePicker()`: the calendar of the date and date/time fields,
  filling them as `ezdatepicker.js` did, opening on the date they hold,
  starting the week on the siteaccess's first day, in the page's language,
  usable with the keyboard. With `exp/datepicker.css`.
  [modules/datepicker.md](modules/datepicker.md)
- `exp::autosave`: `Exp.autosave.AutoSubmit`, `Exp.autosave.Preview`,
  `$.fn.expAutosave` and `$.fn.expPreview`, with the configuration and events
  of `Y.eZ.AutoSubmit` and `Y.eZ.ContentPreview`. TinyMCE saves into the form
  before each save is read, so a draft is no longer saved twice after the
  editor rewrote its textarea. [modules/autosave.md](modules/autosave.md)
- 38 more interface texts in `[ExpUI] Strings` (45 in all), translated into
  German.
- The browser tests of the five modules on `/expui/test` (dialog 15, upload
  10, datatable 25, datepicker 10, autosave 8): 110 tests in all.

Updated
- The admin designs (admin, admin2, admin3) load `exp::dialog`,
  `exp::upload`, `exp::datatable`, `exp::datepicker` and `exp::autosave`
  through `BackendJavaScriptList`, and the modules' stylesheets with
  `exp/core.css` through `BackendCSSFileList`.
- `expUIServerFunctions::MODULES` lists the module packer keys; each one adds
  its file to the pack. The PHPUnit suite checks every module key, its cache
  time and that the admin loads it and its stylesheets (39 tests).
- `exp::datatable`'s `paging.alwaysVisible: false` hides the pagers while
  everything fits on one page, as YUI Paginator's option did; it was accepted
  but had no effect.
- `exp::datepicker`'s own calendar button shows an SVG icon instead of an
  emoji, and `exp::autosave`'s default error text reads "An error occurred".

Moved to Exponential UI with it (outside this extension; they ship with their
own packages)
- The admin's sub-items table (`children.tpl`, `children_detailed.tpl`, with
  `ezajaxsubitems_expdatatable.js`) and eztags' children table
  (`$.fn.eZTagsChildrenExp`) on `exp::datatable`.
- The "Upload a file" of object relation fields
  (`ezobjectrelation_ajaxuploader.tpl`, `ezobjectrelationlist_ajaxuploader.tpl`,
  with `expajaxuploader.js`) on `exp::dialog` and `exp::upload`, and
  ezmultiupload's upload page on `exp::upload`, with its messages in
  `Exp.dialog.alert()`.
- The date and date/time fields of admin, admin2, admin3, ezwebin and ezdemo
  on `exp::datepicker`.
- ezautosave's admin and ezwebin templates on `exp::autosave`.
- Asynchronous publishing's status page (`content/queued.tpl` with
  `ezasynchronouspublishing.js`) checks the publishing status on `Exp.io`, with
  the same server call, messages and timing as its YUI version.
- The layout editor and the layouts admin pages run on ezjscore's jQuery 4 too,
  so the whole admin now runs on one jQuery 4.

Notes
- YUI stays loaded: every template above still has its YUI version, used when
  Exponential UI is not active.
- Deliberate differences from YUI are listed on each module's page: the
  uploads (a row per file, a drop zone, the next files sent after Cancel, the
  summary written when the last file is in), the calendar (it opens on the date
  the fields hold and starts the week on the siteaccess's first day), autosave
  (no second save after TinyMCE rewrote the textarea).
- Upgrading from 1.0.0.0: clear the `ezjscore-packer`, `template`,
  `template-block` and `ini` caches together ([INSTALL.md](INSTALL.md#upgrade)),
  so the admin's script list and its cached page heads name the new packed
  files.

1.0.0.0 (2026-10-01)
--------------------

The first public release. jQuery 4 for Exponential, the `Exp` API that replaces YUI
feature by feature, the admin on one jQuery 4 in every admin design, and the
first two modules (collapsible menus, the sticky edit toolbar). The rest of the
YUI replacement follows release by release; see [ROADMAP.md](ROADMAP.md).

Added
- jQuery 4.0.0 and jQuery Migrate 4.0.2, local by default, code.jquery.com with
  Subresource Integrity on request; kept as `Exp.$` next to a page's own jQuery,
  which gets its `jQuery` and `$` back.
- `exp::core`: `Exp.config`, `Exp.i18n()`, `Exp.on()`/`off()`/`emit()`,
  `Exp.register()`/`start()`/`modules()` for `data-exp-*` modules,
  `Exp.ready()`, `Exp.prefs.get()`/`set()`, `Exp.keys.bind()`/`unbind()`,
  `Exp.reducedMotion`, `Exp.token()`, the `exp-js` class.
- `exp::io`: `Exp.io.call()`, `form()`, `poll()`, `url()`, `raw()`,
  `callString()`, `Exp.io.Error` with `kind` (`signedout`, `refused`, `server`,
  `network`, `timeout`, `invalid`).
- `exp::compat`: `$.ez()` over `Exp.io` on both jQuerys.
- `{exp_config()}`: the page's configuration, texts and preferences.
- `exp/core.css`: the `--exp-*` design tokens and utilities.
- `ezjsc::jquery` and `ezjsc::jqueryUI` on jQuery 4.0.0 (with the reporting
  jQuery Migrate 4.0.2) and jQuery UI 1.14.2 when expui is activated before
  ezjscore: one jQuery per page, shared with `Exp.$`. (Current Exponential's
  ezjscore ships the same releases itself, with the quiet Migrate build.)
- `exp::collapse`: `Exp.collapse()` and `$.fn.expCollapse`, collapsible menus
  and panels remembered per user, with the configuration of YUI's
  `Y.eZ.CollapsibleMenu`. The admin's right menu and the edit page's object
  menu use it.
- `exp::sticky`: `Exp.sticky` and `$.fn.expSticky`, the edit forms' toolbar
  that stays in view and the "go to the top" link, with the behaviour of
  `fixed_toolbar.js` and its `controlbar-fixed` class.
- `exp::core::shared`: the core without its own jQuery when `ezjsc::jquery`
  already loads the same release.
- The admin designs (admin, admin2, admin3) load the configuration through the
  kernel's `page_head_exp.tpl` hook, and `exp::core::shared`, `exp::collapse`
  and `exp::sticky` through `BackendJavaScriptList`.
- The core merges every `{exp_config()}` block on a page, and runs once per
  page however often `exp::core` is asked for.
- The test page `expui/test` (43 browser unit tests) and the PHPUnit suite
  (38 tests).

Moved to jQuery 4 with it (outside this extension; they ship with their own
packages)
- ezjscore (in the kernel) ships jQuery 4.0.0, jQuery Migrate 4.0.2 (quiet build)
  and jQuery UI 1.14.2 and names them for `ezjsc::jquery` and `ezjsc::jqueryUI`;
  its CDN entries, which still named jQuery 1.10.2, name the same releases.
- The admin designs without YUI for the shell: the right menu (admin, admin2)
  and the edit page's object menu (admin; the commented-out copy in admin3) on
  `Exp.collapse()`, and the edit toolbar on `exp::sticky`.
- The admin design: node tabs and their on/off switch, the class list and
  class editor, the role policy editor, translations, locations, ordering and
  details tabs, the extension list, the object relation search, the left menu's
  width control.
- eztags: jsTree 3.3.17, the tag field, the modal dialogs, the translations tab,
  the children list's filter.
- ezoe (the rich text editor): its popups and tag dialogs, including the
  `.size()` calls jQuery 3 had already removed.
- ezie (the image editor) with its colour picker and Jcrop selection tool,
  xrowmetadata, ezstarrating, cjw_newsletter, and the edit templates of ezwebin
  and ezdemo.
- The sub-items table's actions and the eztags children list's actions submit
  their forms with `.trigger('submit')`.
- Tested by use, with no error and no Migrate warning: the node tabs and their
  on/off switch, the header search, the class list, the extension list, the
  tags dashboard, the tags fields' suggestions, the rich text editor's link
  popup, collapsible attribute groups, and the image editor (a server-side
  tool, undo, the selection tool, quitting without saving).
- Translations: English and German.
- Documentation: the book "Using Exponential UI" (`doc/USEING_EXPUI.md`, every
  example tested in a browser and through the template engine), getting
  started, installation, API, modules, converting YUI,
  configuration, testing, security, architecture, FAQ, roadmap.
