exp::dialog
===========

Modal dialogs on the browser's own `<dialog>` element: a question, a message, a
form, or any content, with the focus kept inside and given back afterwards.
Available since 1.0.0.1. Replaces YUI 2's `Dialog` and `SimpleDialog` and YUI 3's
`ezmodalwindow` (`Y.eZ.ModalWindow`).

In the admin: nothing to do
---------------------------

With Exponential UI active, every admin design (admin, admin2, admin3) loads
`exp::dialog` and `exp/dialog.css`, and these use it:

- the "Upload a file" dialog of object relation fields
  (`ezobjectrelation_ajaxuploader.tpl`, `ezobjectrelationlist_ajaxuploader.tpl`,
  with `design/admin/javascript/expajaxuploader.js`), which used YUI's modal
  window;
- the messages of ezmultiupload's upload page (an upload error, an answer that
  is not JSON), which used the browser's `alert()`.

Both fall back to their YUI versions when Exponential UI is not there.

> [!NOTE]
> **Tested against YUI.** In the admin, admin2 and admin3 designs, on
> Exponential Velocity and on PHP-FPM, the relation upload was recorded step
> by step with YUI's modal window and with this dialog, and the records
> compared: the same server calls with the same fields, the same steps on
> screen, the same relations stored. The dialogs were also used with the
> keyboard and the mouse, with no console errors and no jQuery Migrate
> warnings.

In your own templates
---------------------

On admin pages the module is loaded already. Elsewhere:

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io', 'exp::dialog' ) )}
{ezcss_require( array( 'exp/core.css', 'exp/dialog.css' ) )}

<form id="remove-form" method="post" action={'myext/remove'|ezurl}>
    …
    <a href="#" id="remove">Remove</a>
</form>

<script>
{literal}
Exp.ready(function ($) {
    $('#remove').on('click', function (e) {
        e.preventDefault();
        Exp.dialog.confirm('Remove the selected items?', { okLabel: 'Remove', danger: true }).then(function (ok) {
            if (ok) { $('#remove-form').trigger('submit'); }
        });
    });
});
{/literal}
</script>
```

Click the link: a dialog asks the question, the page behind it cannot be used,
the focus is on Cancel (the safe answer, because `danger` is set). Remove, Cancel,
Escape or the close button answer it, and the focus goes back to the link.

The same without any script, from the template alone:

```html
<input type="submit" class="button" name="RemoveButton" value="Remove"
       data-exp-dialog='{"confirm": "Remove the selected items?", "danger": true}' />
```

OK submits the form with that button, exactly as a click would have; Cancel does
nothing.

> [!NOTE]
> **Every call returns a Promise** of the answer, so the code that follows reads
> in order. A dialog closed without an answer (Escape, the close button, the
> backdrop) resolves with `null`, a confirmation with `false`: a dismissed
> dialog never leaves a Promise waiting.

The calls
---------

```js
Exp.dialog.open({ title, content | url | template, buttons, size, onClose })  // -> Promise<value>   (dismissed: null)
Exp.dialog.confirm(text, { okLabel, cancelLabel, danger })                     // -> Promise<boolean>
Exp.dialog.alert(text, { okLabel, title })                                     // -> Promise<undefined>
Exp.dialog.form(url, { title })                                                // -> Promise<the server's answer>  (dismissed: null)
Exp.dialog.create(options)                                                     // -> a dialog, not opened yet
```

Each Promise carries the dialog as `.dialog`, for code that needs it while it is
open (`p.dialog.setContent(…)`, `p.dialog.close('done')`).

### `Exp.dialog.open(options)`

```js
Exp.dialog.open({
    title: 'Choose a colour',
    content: '<p>…</p>',
    buttons: [
        { label: 'Cancel', value: null },
        { label: 'Use it', value: 'use', primary: true }
    ]
}).then(function (value) { /* 'use', or null */ });
```

| Option | Default | |
|---|---|---|
| `title` | `''` | the heading, as text; it names the dialog (`aria-labelledby`). Without one, the body names it |
| `content` | | an HTML string (from the server or a template), an element, jQuery, a fragment, or a function returning one |
| `url` | | instead of `content`: loaded with GET (`method`, `data` for others) while the dialog shows it is busy |
| `template` | | instead of `content`: a `<template>` (its content is cloned) or any element (its children are cloned) |
| `buttons` | `[]` | footer buttons, see below; none: no footer |
| `size` | `'m'` | `'s'`, `'m'`, `'l'`, `'xl'` (26, 42, 56, 76 rem, never wider than the window) |
| `width` | | a width instead: a number in pixels, or any CSS length |
| `className` | | more classes on the `<dialog>` |
| `dismissible` | `true` | `false`: no close button, Escape does nothing; only a button (or `close()`) ends it |
| `closeOnBackdrop` | `false` | `true`: a click beside the dialog dismisses it |
| `closeSelector` | | elements inside that dismiss it when clicked (`'.window-cancel'` for content made for the old modal window) |
| `initialFocus` | | a selector of the element to focus first |
| `role` | `'dialog'` | `'alertdialog'` for a question that needs an answer (what `confirm` and `alert` use) |
| `describedBy` | | the id of the element that describes it (`aria-describedby`) |
| `labelledBy` | | without a title: the id of the element that names it (default: the body) |
| `keep` | `false` | `true`: the element stays in the page after closing, to be opened again |
| `scripts` | `false` | HTML content (a string, or what `url` loads) is inserted without running its `<script>` elements, as YUI's modal window did; `true` runs them (jQuery's `html()`) |
| `onOpen(dialog)` | | after it opened |
| `onClose(value, dialog)` | | after it closed, before the Promise resolves |

Each button:

| | |
|---|---|
| `label` | its text (default: the value) |
| `value` | what the Promise resolves with (default `null`) |
| `primary` | the main action: highlighted, and focused when the body has nothing to focus |
| `danger` | a destructive action: in the danger colour |
| `name` | its `name` attribute (for `initialFocus: 'button[name="ok"]'`) |
| `action(dialog, event)` | called first; returning `false` keeps the dialog open |
| `close` | `false`: the button never closes it (an `action` does what is needed) |

Inside the content, any element with `data-exp-dialog-close` closes the dialog
when clicked, with the attribute's value (`data-exp-dialog-close="yes"`), or
`null` when it is empty.

### `Exp.dialog.confirm(text, options)`

```js
Exp.dialog.confirm('Discard the draft?', { okLabel: 'Discard', cancelLabel: 'Keep editing', danger: true })
    .then(function (ok) { if (ok) { … } });
```

| Option | Default | |
|---|---|---|
| `okLabel`, `cancelLabel` | `OK`, `Cancel` (translated) | the two buttons |
| `danger` | `false` | OK in the danger colour, and the focus starts on Cancel |
| `title` | none | a heading; without one, the text names the dialog |
| `size` | `'s'` | |
| `onClose(value)` | | |

`true` for OK, `false` for Cancel, Escape and the close button. The text is shown
as text: HTML in it is not made into elements. The dialog is an `alertdialog`
described by its text, so a screen reader reads the question at once.

### `Exp.dialog.alert(text, options)`

A message with one OK button (`okLabel`, `title`, `size`, `onClose` as above).
Resolves with `undefined` however it is closed.

### `Exp.dialog.form(url, options)`

```js
Exp.dialog.form(Exp.io.url('myext/rename/' + id), { title: 'Rename' }).then(function (answer) {
    if (answer) { location.reload(); }
});
```

Loads the address into the dialog. When the form in it is submitted (a button,
or Enter in a field), the form is posted with `Exp.io.form()`: its fields, its
files, the button that submitted it, and the form token. The dialog closes and
the Promise resolves with the server's answer (parsed when it is JSON).

| Option | | |
|---|---|---|
| `title`, `size`, `width`, … | | as for `open` |
| `content` | | a form given directly instead of an address (`url` then `null`) |
| `action` | | where to post, instead of the form's own `action` |
| `onResponse(answer, dialog)` | | returning `false` keeps the dialog open: for an answer that is the form again, with the errors marked (`dialog.setContent(answer)`) |

A failed post shows the error at the top of the dialog (`role="alert"`) and the
dialog stays open, so nothing typed is lost. Needs `exp::io`.

### `Exp.dialog.create(options)`

The dialog without opening it: `var d = Exp.dialog.create({ … }); d.open().then(…)`.

The instance
------------

```js
var d = Exp.dialog.create({ title: 'Upload' });
d.open();                      // a Promise of the value it is closed with
d.close('done');               // closes with a value (no argument: null)
d.setTitle('Step 2');          // as text
d.setContent('<form>…</form>');// HTML, an element or jQuery; Exp.start() runs on it
d.setButtons([{ label: 'OK', value: true, primary: true }]);
d.load(url, { method, data }); // HTML from the server into the body; a Promise
d.busy(true);                  // dimmed body, a spinner, aria-busy="true", "Loading..." for screen readers
d.error('Not saved.');         // a message above the body, role="alert"; '' hides it
d.destroy();                   // closes it and removes it from the page
d.isOpen; d.value; d.element; d.$body;
Exp.$(d.element).data('expDialog') === d;
```

`Exp.dialog.current()` is the dialog on top (or `null`), `Exp.dialog.closeAll()`
dismisses every open one. A dialog opened from a dialog stacks above it.

Events
------

On the `<dialog>` element (they bubble) and page-wide with `Exp.on()`:

| Event | Data |
|---|---|
| `exp:dialog:open` | `{ dialog }` |
| `exp:dialog:close` | `{ dialog, value }` |

```js
Exp.on('exp:dialog:close', function (e, data) { console.log(data.dialog.id, data.value); });
```

From markup
-----------

`data-exp-dialog` on a link or a button, started on page load (and by
`Exp.start()` after inserting HTML):

| Value | A click |
|---|---|
| `{"confirm": "Remove it?", "danger": true}` | asks first; OK follows the link, or submits the form with this button |
| `{"title": "Rename", "form": true}` | opens the link's address as `Exp.dialog.form()` |
| `{"title": "Help", "template": "#help"}` | opens the template's content |
| `{"title": "Details"}` | opens the link's address (or `"url"`) in a dialog |

The other options of the tables above can be added (`"size": "l"`, `"okLabel"`).
Without JavaScript the link and the button do what they did before.

Keyboard and screen readers
---------------------------

- The page behind is inert while a dialog is open (`showModal()`): it cannot be
  clicked, focused or read.
- **Tab** and **Shift+Tab** go round inside the dialog: from the last element to
  the first and back.
- **Escape** dismisses it (unless `dismissible: false`); **Enter** presses the
  focused button.
- The focus starts on `initialFocus`, an `[autofocus]` element, the first field
  of the body, the primary button, or the close button, in that order (Cancel for
  a `danger` confirmation), and goes back to the element that had it before.
- `aria-labelledby` names the title (or the text), `aria-describedby` the text of
  a confirmation or message; `role="alertdialog"` for those two.
- The close button is labelled "Close" in the page's language.
- Opening uses a short fade (none with `prefers-reduced-motion`).

Styles
------

`exp/dialog.css`, with the `--exp-*` tokens: `.exp-dialog` (`--s`, `--m`, `--l`,
`--xl`, `--busy`, `--confirm`, `--alert`, `--form`, `--danger`), `.exp-dialog-header`,
`.exp-dialog-title`, `.exp-dialog-close`, `.exp-dialog-error`, `.exp-dialog-body`,
`.exp-dialog-footer`, `.exp-dialog-button` (`.is-primary`, `.is-danger`). The
backdrop is the element's `::backdrop`. On a phone the dialog takes the width of
the screen and the buttons share the footer.

Texts
-----

`Close`, `OK`, `Cancel`, `Loading...`, and the server errors (`The server answered
with an error (HTTP %status).`, `No answer from the server.`) come from
`[ExpUI] Strings` through `Exp.i18n()`. The texts you pass (titles, labels,
questions) are yours to translate in the template (`|i18n( … )|wash( 'javascript' )`).

From YUI
--------

### The admin's modal window (`ezmodalwindow.js`)

Before:

```js
YUI(YUI3_config).use('ezmodalwindow', function (Y) {
    var win = new Y.eZ.ModalWindow({ window: '#my-modal-window', centered: false, xy: ['centered', 50], width: 650 });
    win.setTitle('Upload a file');
    win.setContent(html);
    win.onClose(cleanup, this);
    win.open();
    // …
    win.close();
});
```

with the window's markup in the template (`<div id="my-modal-window" class="modal-window">…`)
and `#overlay-mask` in the pagelayout.

After:

```js
var d = Exp.dialog.create({ title: 'Upload a file', width: 650, closeSelector: '.window-cancel', onClose: cleanup });
d.setContent(html);
d.open();
// …
d.close();
```

No markup in the template and no mask: the browser's top layer and `::backdrop`
do that. `getContentNode()` is `d.$body`; `isOpen` is the same. `.window-close`
became the dialog's own close button, and `closeSelector` keeps `.window-cancel`
links in old content working. The content is emptied on close because the
dialog is removed (`keep: true` keeps it).

### YUI 2 `SimpleDialog` (a question with buttons)

Before:

```js
var dlg = new YAHOO.widget.SimpleDialog('confirm', { modal: true, fixedcenter: true, visible: false, text: 'Remove?',
    buttons: [{ text: 'Yes', handler: function () { this.hide(); remove(); }, isDefault: true },
              { text: 'No', handler: function () { this.hide(); } }] });
dlg.render(document.body);
dlg.show();
```

After:

```js
Exp.dialog.confirm('Remove?', { okLabel: 'Yes', cancelLabel: 'No' }).then(function (ok) { if (ok) { remove(); } });
```

Tests
-----

`design/standard/javascript/exp/test/dialog.test.js`, 15 tests on `/expui/test`:

- a native modal, named by its title, the focus inside and back on the opener;
- Escape and the close button (translated label) answer `null`; `dismissible: false`;
- Tab and Shift+Tab go round inside;
- the backdrop only with `closeOnBackdrop`; size, width, classes, `data-exp-dialog-close`, `closeSelector`;
- `confirm`: `true`/`false`, the focus on Cancel for `danger`, `alertdialog` described by the text;
- `alert`: one button, the text as text;
- `url`: busy while loading, the answer in the body, an error shown when it fails;
- `form`: posted with `Exp.io.form`, `onResponse` keeping it open;
- template content, button actions, the events, `create()`;
- scripts in HTML content not run unless `scripts: true`;
- stacked dialogs, `closeAll()`;
- `data-exp-dialog` asking before submitting with the same button;
- no dialog left open at the end.

The dialogs are also tested by use in the admin, admin2 and admin3 designs, on
Exponential Velocity and on PHP-FPM, as the note at the top says.
