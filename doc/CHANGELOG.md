Changelog
=========

Unreleased
----------

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
