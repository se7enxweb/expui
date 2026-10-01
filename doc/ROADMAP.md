Roadmap
=======

Exponential UI replaces YUI feature by feature. **No feature is removed**: each
one is rebuilt on the API, checked against its YUI version (same results, same
server calls, same saved settings, keyboard, every admin design: admin, admin2
and admin3), and only then
switched over. YUI stays loaded until the last phase.

| Phase | Lands | Status |
|---|---|---|
| 0 | The foundation: jQuery 4 next to the page's jQuery, `Exp` core, `Exp.io`, `$.ez()` compat, `{exp_config()}`, tokens, the test page and PHPUnit suite, these docs | **done (1.0.0.0)** |
| 1 | The admin and the extensions' jQuery 3 code on jQuery 4 (one jQuery per page); jQuery UI 1.14; replacements for old plugins | **done (1.0.0.0)**: one jQuery 4 per admin page, jQuery UI 1.14, jsTree 3.3.17; no errors and no Migrate warnings on the admin pages, also while the tabs, tag fields, rich text editor popups and image editor are used. Jcrop (the image editor's selection) needed three small changes, not a replacement; magnific-popup is not loaded by any template |
| 2 | The admin shell: collapsible menus (`exp::collapse`), the sticky edit toolbar (`exp::sticky`) | **done (1.0.0.0)**: in admin, admin2 and admin3, tested by use in each; the configuration block and the scripts reach every admin design through the kernel's head hook and script list |
| 3 | Admin content: the sub-items and tags tables (`exp::datatable`), date fields (`exp::datepicker`), uploads and dialogs (`exp::upload`, `exp::dialog`), asynchronous publishing's status page (on `Exp.io`), autosave and preview (`exp::autosave`) | **done (1.0.0.1)**: in admin, admin2 and admin3 (the date fields also in the ezwebin and ezdemo front ends, autosave also in ezwebin's), each module compared with its YUI version on Exponential Velocity and on PHP-FPM; every template keeps its YUI version as the fallback. The layout editor and the layouts admin pages moved to ezjscore's jQuery 4 in the same cycle, so the whole admin runs on one jQuery 4 |
| 4 | ezflow: zone tabs, block drag and drop, schedule and push dialogs, timeline, block AJAX features | planned |
| 5 | The site designs: galleries, fly-outs, toggles, the website toolbar's sorting, star rating | planned |
| 6 | The styles written for YUI widgets, rebuilt on the `--exp-*` tokens | planned |
| 7 | YUI removed: no `ezjsc::yui2`/`yui3` left, the old keys log a deprecation, the YUI files deleted, Migrate off | planned |
| 8 | YUI gone everywhere: every module documented in `doc/modules/`, the full test suites, the releases of every extension that changed | planned |

Each phase's modules are listed in [MODULES.md](MODULES.md) with their API.
