Modules
=======

Each interactive feature of the admin and the site designs gets one module: a
packer key, a jQuery 4 plugin and/or `Exp.*` API, its CSS, its translations, its
tests and its page in these docs. A module replaces the YUI code of its feature
with the **same behaviour** — nothing a user could do before is lost.

Status: **available** (in this release, documented, tested), **next** (being
built), **planned** (the API is defined in the [roadmap](ROADMAP.md); the YUI
version keeps working until it lands).

| Module | Status | Replaces | API |
|---|---|---|---|
| `exp::core` | available (1.0.0.0) | YUI 3 `node`, `event`, `YUI().use()`, YUI 2 `Dom`, `Event`, `Element`, `lang.JSON`, `Cookie`, `KeyListener`, YUILoader | [API.md](API.md#exp-core-expcore) |
| `exp::io` | available (1.0.0.0) | YUI 3 `io-ez`, `io-form`, `json-parse`, YUI 2 `Connect` | [API.md](API.md#expio-expio) |
| `exp::compat` | available (1.0.0.0) | — (keeps `$.ez()` working over `Exp.io`) | [API.md](API.md#expcompat) |
| `exp::collapse` | available (1.0.0.0) | `ezcollapsiblemenu` (the admin's right menu and edit menu, in admin, admin2 and admin3) | [API.md](API.md#expcollapse) |
| `exp::sticky` | available (1.0.0.0) | `fixed_toolbar.js` (the edit forms' toolbar) | [API.md](API.md#expsticky) |
| `exp::dialog` | planned | YUI 2 `Dialog`, `SimpleDialog`, YUI 3 `ezmodalwindow` | `Exp.dialog.open()`, `.confirm()`, `.alert()`, `.form()` |
| `exp::datatable` | planned | YUI 2 `DataTable`, `Paginator`, `TextboxCellEditor`, `DataSource`, `Button` (sub-items, tags, newsletter lists) | `$(table).expDataTable({...})` |
| `exp::datepicker` | planned | YUI 2 `Calendar`, `CalendarGroup`, `ezdatepicker.js` | `$(fieldset).expDatePicker({fields, time})` |
| `exp::upload` | planned | `ezajaxuploader`, `ezmultiupload` | `$(el).expUpload({url, multiple, drop})` |
| `exp::autosave` | planned | `ezautosubmit`, `ezcontentpreview` | `$(form).expAutosave()`, `$(el).expPreview()` |
| `exp::sortable` | planned | YUI 2 DragDrop, YUI 3 `dd-*` (ezflow blocks, ezwt sorting) | `$(list).expSortable({items, handle, save})` |
| `exp::tabs` | planned | YUI 2 `TabView` (ezflow zones) | `$(el).expTabs({remember})` |
| `exp::timeline` | planned | ezflow timeline (YUI 2 `Slider`, `CalendarGroup`) | `$(el).expTimeline({from, to})` |
| `exp::gallery`, `exp::carousel` | planned | ezdemo galleries, ezflow carousel | `$(el).expGallery()`, `$(el).expCarousel()` |
| `exp::rating` | planned | `ezstarrating_yui3.js` | `$(el).expRating({fn})` |
| `exp::flyout`, `exp::toggle`, `exp::anim` | planned | ezdemo fly-outs, class toggles, transitions, YUI `anim`/`transition` | `$(el).expFlyout()`, `$(el).expToggle()`, `Exp.anim()` |
| `exp::crop` | planned | Jcrop in ezie | `$(img).expCrop({...})` |

When a module lands, its row turns to *available* and gets its own page here
(`doc/modules/<name>.md`) with first steps, every option, events, keyboard use,
styling and the tests that cover it.
