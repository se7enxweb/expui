Modules
=======

Each interactive feature of the admin and the site designs gets one module: a
packer key, a jQuery 4 plugin and/or `Exp.*` API, its CSS, its translations, its
tests and its page in these docs. A module replaces the YUI code of its feature
with the **same behaviour** — nothing a user could do before is lost.

Status: **available** (in this release, documented, tested), **next** (being
built), **planned** (the API is defined in the [roadmap](ROADMAP.md); the YUI
version keeps working until it lands).

Available
---------

| Module | Since | Replaces | Reference |
|---|---|---|---|
| `exp::core` | 1.0.0.0 | YUI 3 `node`, `event`, `YUI().use()`, YUI 2 `Dom`, `Event`, `Element`, `lang.JSON`, `Cookie`, `KeyListener`, YUILoader | [API.md](API.md#exp-core-expcore) |
| `exp::io` | 1.0.0.0 | YUI 3 `io-ez`, `io-form`, `json-parse`, YUI 2 `Connect` | [API.md](API.md#expio-expio) |
| `exp::compat` | 1.0.0.0 | — (keeps `$.ez()` working over `Exp.io`) | [API.md](API.md#expcompat) |
| `exp::collapse` | 1.0.0.0 | `ezcollapsiblemenu` (the admin's right menu and edit menu) | [modules/collapse.md](modules/collapse.md) |
| `exp::sticky` | 1.0.0.0 | `fixed_toolbar.js` (the edit forms' toolbar) | [modules/sticky.md](modules/sticky.md) |
| `exp::dialog` | 1.0.0.1 | YUI 2 `Dialog`, `SimpleDialog`, YUI 3 `ezmodalwindow` (the relation upload's dialog, ezmultiupload's messages) | [modules/dialog.md](modules/dialog.md) |
| `exp::upload` | 1.0.0.1 | `ezajaxuploader`'s upload step, ezmultiupload's YUI 3 uploader | [modules/upload.md](modules/upload.md) |
| `exp::datatable` | 1.0.0.1 | YUI 2 `DataTable`, `Paginator`, `TextboxCellEditor`, `DataSource`, `Button`, `SimpleDialog`, `Cookie`, `KeyListener` (the admin's sub-items table, eztags' children table) | [modules/datatable.md](modules/datatable.md) |
| `exp::datepicker` | 1.0.0.1 | YUI 2 `Calendar`, `ezdatepicker.js` (the date and date/time fields of admin, admin2, admin3, ezwebin, ezdemo) | [modules/datepicker.md](modules/datepicker.md) |
| `exp::autosave` | 1.0.0.1 | `ezautosubmit`, `ezcontentpreview` (ezautosave's autosave and draft preview) | [modules/autosave.md](modules/autosave.md) |

Every available module but `exp::compat` is loaded on every admin page (admin,
admin2, admin3) through `design.ini` `BackendJavaScriptList` (the core as
`exp::core::shared`), with the stylesheets in `BackendCSSFileList` ([CONFIGURATION.md](CONFIGURATION.md#designini-settingsdesigniniappendphp)).
Elsewhere a template asks for the keys it needs.

Planned
-------

| Module | Replaces | API |
|---|---|---|
| `exp::sortable` | YUI 2 DragDrop, YUI 3 `dd-*` (ezflow blocks, ezwt sorting) | `$(list).expSortable({items, handle, save})` |
| `exp::tabs` | YUI 2 `TabView` (ezflow zones) | `$(el).expTabs({remember})` |
| `exp::timeline` | ezflow timeline (YUI 2 `Slider`, `CalendarGroup`) | `$(el).expTimeline({from, to})` |
| `exp::gallery`, `exp::carousel` | ezdemo galleries, ezflow carousel | `$(el).expGallery()`, `$(el).expCarousel()` |
| `exp::rating` | `ezstarrating_yui3.js` | `$(el).expRating({fn})` |
| `exp::flyout`, `exp::toggle`, `exp::anim` | ezdemo fly-outs, class toggles, transitions, YUI `anim`/`transition` | `$(el).expFlyout()`, `$(el).expToggle()`, `Exp.anim()` |
| `exp::crop` | Jcrop in ezie | `$(img).expCrop({...})` |

When a module lands, it moves to *Available* and gets its own page here
(`doc/modules/<name>.md`): what it replaces, what changes in the admin, your own
use with an example, every option, method and event, keyboard use, styling,
the move from YUI and the tests that cover it.
