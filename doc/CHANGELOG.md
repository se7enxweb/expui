Changelog
=========

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
