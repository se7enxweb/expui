exp::autosave
=============

Drafts that save themselves while you edit, and a live preview of the draft.
Available since 1.0.0.1. Replaces YUI 3's `ezautosubmit` (`Y.eZ.AutoSubmit`) and
`ezcontentpreview` (`Y.eZ.ContentPreview`), which the ezautosave extension
uses.

With ezautosave: nothing to do
------------------------------

With Exponential UI active, ezautosave's templates use it: its admin template
(admin, admin2, admin3, where every admin design loads `exp::autosave`) and its
ezwebin template on the front end (which loads it itself). In both:

- the draft is saved every `Interval` seconds of `autosave.ini`, and when you
  leave a field (`TrackUserInput`);
- a save only happens when something changed;
- the toolbar says "The draft is being saved", then "Draft saved at … (n
  minutes ago)", or the error;
- the Store draft button is hidden (`HideStoreDraftButton`);
- the draft is saved when you leave the page.

In the admin, also the draft's preview: the preview link opens it in the edit
page. It saves first when there are unsaved changes, follows the siteaccess
you choose, and closes with its close link.

It posts the same form, to the same address, with the same fields as the YUI
version. One thing works better: before reading the form it asks the rich text
editors (TinyMCE) to save into it, as the form's own submit does. So the draft
gets exactly what the editor shows, and the editor rewriting its own text
never causes a second save of the same draft.

> [!NOTE]
> **Tested against YUI.** In the admin, admin2 and admin3 designs and on the
> front end, on Exponential Velocity and on PHP-FPM, the same edit page was
> used with the YUI version and with this one, and the results compared. Both:
> - posted the same 67 fields to the same address;
> - showed the same messages;
> - hid the same button;
> - in the admin, opened, filled and closed the preview in the same way.
>
> The YUI version saved the same draft a second time after TinyMCE rewrote the
> textarea; this one does not.

In your own templates
---------------------

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io', 'exp::collapse', 'exp::autosave' ) )}
```

(`exp::collapse` is only needed for the preview.)

```js
Exp.ready(function ($) {
    var as = new Exp.autosave.AutoSubmit({
        form: '#my-form',
        action: Exp.io.url('ezjscore/call/myext::savedraft'),   // receives the form's fields and files (POST)
        interval: 120,                 // seconds between saves
        trackUserInput: true,          // also when a field loses the focus
        ignoreClass: 'no-autosave'     // fields with this class do not count as a change
    });
    as.on('beforesave', function () { $('#status').text(Exp.i18n('Loading...')); });
    as.on('success', function (e) { $('#status').text('Saved'); /* e.json: the server's JSON */ });
    as.on('error', function (e) { $('#status').text('Not saved'); });
    as.start();
});
```

Or `$('#my-form').expAutosave({ action: … })`; the instance is in
`$('#my-form').data('expAutosave')`, and `Exp.autosave.instances[<form id>]`.
There is no `data-exp-*` attribute: the address is the template's to give.

Options
-------

| Option | Default | |
|---|---|---|
| `form` | — | the form |
| `action` | — | where the form is posted. The answer must be JSON; an `error_text` in it, or an answer that is not JSON, is an error |
| `interval` | `300` | seconds between two saves |
| `trackUserInput` | `true` | also save when a field (`input`, `select`, `textarea`, `iframe`) loses the focus |
| `ignoreClass` | `false` | fields with this class do not count as a change, but they are posted |
| `enabled` | always | a function asked when the page is ready (`this` is the instance); `false` keeps autosave off |
| `beforeSerialize` | TinyMCE's `triggerSave()` | called before each save reads the form |

The instance
------------

| Method | |
|---|---|
| `start()` | starts it: the form's state now, a save every interval, on leaving a field; the form's own submit stops it |
| `stop()` | stops it, and cancels a save on its way (`abort`) |
| `submit(fields)` | saves now if the form changed; `fields`: more data as `name=value&name=value`, which also counts as a change |
| `on(event, fn)` | `init`, `beforesave`, `success`, `error`, `abort`, `nochange`; `fn(e)` with `e.type` and, for `success` and `error`, `e.json` |

`Exp.emit('autosubmit:forcesave')` saves every autosave on the page now, with
`AutoSubmitForced=<time>`. `Exp.autosave.serializeForm(form, ignoreClass)` is
the form's state as the comparison sees it.

The preview
-----------

```js
var preview = new Exp.autosave.Preview({
    texts: { loading: 'Loading...', error: 'An error occurred.', preview: 'Preview' },
    topPosition: '42px'                        // the toolbar's height: the preview starts below it
});
preview.init();                                // adds the link and the preview place to buttonPlace
preview.setContent(html);                      // the preview's markup (the iframe and its toolbar)
preview.loading(); preview.error(text); preview.close();
```

Or `$('#my-toolbar').expPreview({ … })`: `buttonPlace` is that element, `init()`
runs at once, and the instance is in `$('#my-toolbar').data('expPreview')`.

| Option | Default |
|---|---|
| `buttonPlace` | `'#controlbar-top .button-right'` |
| `place`, `preview`, `element` | `'#content-preview'`, `'#preview-iframe'`, `'#preview-link'` |
| `texts` | `{ loading, preview, error }`, inserted as text |
| `topPosition` | `'0px'` |
| `previewTemplate`, `elementTemplate` | ezcontentpreview.js's markup |

It opens and closes on `exp::collapse`. Opening it with unsaved changes emits
`autosubmit:forcesave`. In the preview, the siteaccess selector reloads the
iframe and the close link closes it.

Events
------

Each event of `on()` is also emitted page-wide, with `Exp.on()`:

| Event | Data |
|---|---|
| `exp:autosave:init`, `:beforesave`, `:abort`, `:nochange` | `{ form }` |
| `exp:autosave:success`, `:error` | `{ form, json }` |

Keyboard and screen readers
---------------------------

Nothing to learn: saving happens by itself, and the preview link is a link of
the toolbar. Its animations follow `prefers-reduced-motion`.

From YUI
--------

| YUI | Exponential UI |
|---|---|
| `new Y.eZ.AutoSubmit({ … })` | `new Exp.autosave.AutoSubmit({ … })` |
| `new Y.eZ.ContentPreview({ … })` | `new Exp.autosave.Preview({ … })` |
| `Y.fire('autosubmit:forcesave')` | `Exp.emit('autosubmit:forcesave')` |
| `place.setContent(html)` | `place.html(html)` |
| `Y.later(60000, this, fn, [], true)` | `setInterval(fn, 60000)` |
| `timer.cancel()` | `clearInterval(timer)` |

The configuration and the events are the same. ezautosave's two templates show
the complete move: the Exponential UI branch is followed by the untouched YUI
one.

Tests
-----

`design/standard/javascript/exp/test/autosave.test.js`, 8 tests on
`/expui/test`:

- the form state (ignored fields, boxes, buttons);
- saving a change, with the fields posted;
- no change and ignored fields;
- extra fields and forced saves;
- an answer that is not JSON;
- `stop()` and abort;
- leaving a field, `enabled`, and `beforeSerialize`;
- the preview: opening, the forced save, content, the error, closing.

ezautosave is also tested by use, as the note at the top says.
