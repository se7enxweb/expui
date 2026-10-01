exp::upload
===========

Files uploaded with a progress bar each, a Cancel button each, several at once,
and a drop zone. Available since 1.0.0.1. Replaces YUI 3's uploader
(ezmultiupload) and the `io-upload-iframe` step of the admin's relation upload
(`ezajaxuploader`).

In the admin: nothing to do
---------------------------

With Exponential UI active, every admin design (admin, admin2, admin3) loads
`exp::upload` and `exp/upload.css`, and these use it:

- the "Upload a file" of object relation fields
  (`ezobjectrelation_ajaxuploader.tpl`, `ezobjectrelationlist_ajaxuploader.tpl`,
  with `design/admin/javascript/expajaxuploader.js`);
- ezmultiupload's page (`ezmultiupload/upload/<node>`).

Each template uses Exponential UI when it is there and its YUI version
otherwise. A few things work better than with YUI; they are listed in
[From YUI](#from-yui) below.

> [!NOTE]
> **Tested against YUI.** In the admin, admin2 and admin3 designs, on
> Exponential Velocity and on PHP-FPM, with real small files, the relation
> upload and ezmultiupload were recorded step by step with the YUI version and
> with this one, and the records compared: every server call with its fields
> and files, what the editor sees, the relations stored. Then the progress and
> Cancel of a slowed-down upload, a drop, and the chooser reached with Tab were
> tried.

In your own templates
---------------------

On admin pages the module is loaded already. Elsewhere:

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io', 'exp::upload' ) )}
{ezcss_require( array( 'exp/core.css', 'exp/upload.css' ) )}

<div data-exp-upload='{ldelim}"url": "{'myext/upload'|ezurl( 'no' )}", "multiple": true, "drop": true{rdelim}'></div>
```

The page shows a "Select files" button and "or drop them here". Choose three
files: each gets a row with its name, its size, a progress bar and Cancel, and
they are POSTed one by one (one request per file, the field `file`, with the
form token). Each row says "Done" when the server has answered.

From code, with the answers:

```js
Exp.ready(function ($) {
    $('#uploads').expUpload({
        url: Exp.io.url('myext/upload'),
        name: 'Filedata',
        multiple: true,
        drop: true,
        maxSize: 20 * 1024 * 1024,
        accept: 'image/*,.pdf',
        data: { UploadButton: 'Upload' },
        onDone: function (response, file) { $('#results').append($('<li>').text(file.name)); }
    });
});
```

> [!NOTE]
> **The server sees what a form would send.** Each file is a
> `multipart/form-data` POST with the file under `name` and the other fields
> before it, so an Exponential view that reads `eZHTTPFile::fetch( 'Filedata' )`
> (or `$_FILES`) works unchanged.

The element can be:

- **a container** (a `<div>`): the chooser (a label with the file input, so it is
  reached with Tab and opened with Enter or Space), the drop hint (with `drop`)
  and the list are built inside it;
- **an `<input type="file">`**, a form's own file field: it stays the chooser,
  and the list goes after it.

Options
-------

| Option | Default | |
|---|---|---|
| `url` | (required) | where each file is POSTed |
| `name` | the input's `name`, else `'file'` | the file's field name |
| `multiple` | `false` | several files at once; `false`: a new choice replaces a file still waiting |
| `accept` | none | what can be chosen: `'image/*,.pdf'`, or a list such as ezmultiupload's `['*.jpg', '*.png']`; `*.*` takes anything. Passed to the browser's chooser and checked again for dropped files |
| `drop` | `false` | `true`: the element is a drop zone too; or a selector of another element to be one |
| `maxSize` | `0` | bytes; a larger file is listed as refused, with the reason, and never sent (`0`: no limit) |
| `data` | none | more POST fields: an object, `[{ name, value }]`, or `function (file) { return {…}; }` |
| `form` | none | a form whose fields are posted with each file, in the form's order, the file in the place of its input |
| `token` | `true` | add the form token (`ezxform_token`) when the fields have none; `false` when they carry it |
| `auto` | `true` | upload as soon as files are chosen; `false`: call `start()` (a form's own Upload button) |
| `parallel` | `1` | files sent at the same time |
| `responseType` | `'auto'` | `'json'` (parsed; not JSON is a failure), `'text'`, or `'auto'` (parsed when the answer is JSON) |
| `headers` | `{}` | more request headers |
| `list` | `true` | `false`: the list is kept for screen readers only (a page that shows progress its own way) |
| `input` | | an existing `<input type="file">` to use as the chooser |
| `texts` | | the visible texts, to pass translated ones from the template: `select`, `drop`, `cancel`, `cancelFile` (`%name`), `waiting`, `uploading`, `done`, `failed`, `canceled`, `tooLarge` (`%size`, `%max`), `wrongType` |
| `onAdd(file)`, `onRefuse(file)`, `onStart(file)`, `onProgress(file)`, `onDone(response, file)`, `onFail(error, file)`, `onCancel(file)`, `onComplete(summary)` | | the events below, as callbacks |

The instance
------------

```js
var up = $('#uploads').expUpload('instance');   // or $('#uploads').data('expUpload')
up.add(fileList);        // a FileList or an array of File: listed, refused ones with the reason; started when auto
up.start();              // sends the waiting files; a Promise of the summary when all are finished
up.cancel(file);         // one file (the entry or its id); up.cancel() cancels every file waiting or uploading
up.files();              // every entry: { id, name, size, type, status, loaded, total, percent, response, error }
up.progress();           // this round: { loaded, total, percent, count, done }
up.clear();              // removes the finished rows (done, failed, canceled, refused)
up.disable(); up.enable();
up.destroy();            // cancels what runs, removes what it built
$('#uploads').expUpload('start' | 'cancel' | 'clear' | 'enable' | 'disable' | 'destroy');
```

`status` is `queued`, `uploading`, `done`, `failed`, `canceled` or `refused`; each
row has the class `is-<status>`. A failure's `error` is an `Exp.io.Error`
(`kind`: `server` with the HTTP status, `refused` 403, `signedout`, `network`,
`timeout`, `invalid` for an answer that is not the JSON asked for).

`Exp.upload.size(1536)` gives `"1.5 kB"` (in the page's language),
`Exp.upload.accepted(file, 'image/*')` the type check.

Events
------

On the element (they bubble) and page-wide with `Exp.on()`. The data always has
`upload` (the instance); every event but `complete` also has `file` (the entry):

| Event | More data | When |
|---|---|---|
| `exp:upload:add` | | a file is listed to be sent |
| `exp:upload:refuse` | `reason` | too large or not accepted |
| `exp:upload:start` | | its request starts |
| `exp:upload:progress` | `loaded`, `total`, `percent`, `overall` (`progress()`) | while it is sent |
| `exp:upload:done` | `response` | the server answered (2xx) |
| `exp:upload:fail` | `error` | an error status, no answer, or not the JSON asked for |
| `exp:upload:cancel` | | canceled |
| `exp:upload:complete` | `files`, `done`, `failed`, `canceled` | every file of the round is finished |

```js
$('#uploads').on('exp:upload:complete', function (e, s) { if (!s.failed) { location.reload(); } });
```

Keyboard and screen readers
---------------------------

- The chooser is the browser's own file input inside a visible label: Tab reaches
  it, Enter or Space opens the file dialog, and the focus ring shows on the label.
- Each row's Cancel is a button labelled "Cancel the upload of <name>".
- The list is an `aria-live="polite"` region: names, "Uploading 40%", "Done" and
  the reasons are read as they change. Each progress bar is a `<progress>`
  labelled with the file name.
- A drop zone is an addition: everything it does can be done with the chooser.

Styles
------

`exp/upload.css`, with the `--exp-*` tokens: `.exp-upload`, `.exp-upload-zone`,
`.exp-upload-select`, `.exp-upload-hint`, `.exp-upload-drop` (`.is-over` while files
are dragged over it), `.exp-upload-list`, `.exp-upload-file` (`.is-<status>`),
`.exp-upload-name`, `-size`, `-progress`, `-status`, `-cancel`; `.is-disabled` on
the element while disabled. On a phone each row puts its bar on its own line.

Texts
-----

`Select files`, `Select a file`, `or drop them here`, `or drop it here`,
`Cancel`, `Cancel the upload of %name`, `Waiting`, `Uploading`, `Done`,
`Failed`, `Canceled`, `The file is too large (%size, at most %max).`,
`This type of file is not accepted.` and the server errors come from
`[ExpUI] Strings` through `Exp.i18n()`; `texts` overrides them.

From YUI
--------

### ezmultiupload (the YUI 3 uploader)

Before (`ezmultiupload/upload.tpl` with `ezmultiupload.js`):

```js
YUI(config).use('ezmultiupload', function (Y) {
    Y.ez.MultiUpload.cfg = {
        uploadURL: '/admin/ezmultiupload/upload/327',
        uploadVars: { '<session name>': '<session id>', UploadButton: 'Upload', ezxform_token: '…' },
        allFilesRecived: 'All files received.', uploadCanceled: 'Upload canceled.', thumbnailCreated: 'Thumbnail created.',
        selectButtonLabel: 'Select files', multipleFiles: true
    };
    Y.ez.MultiUpload.init();     // Y.Uploader: fileselect, uploadstart, uploadprogress, totaluploadprogress, uploadcomplete
});
```

After (the same template, when Exponential UI is there):

```js
$('#uploadButtonOverlay').expUpload({
    url: cfg.uploadURL, name: 'Filedata', multiple: true, drop: true, parallel: 2,
    data: cfg.uploadVars, token: false, responseType: 'text', texts: cfg.texts
});
// exp:upload:add      -> fileselect (a new round: the progress box shown, the bar at 0, Cancel shown)
// exp:upload:progress -> uploadprogress and totaluploadprogress (i/n, the file name, the bar)
// exp:upload:done     -> uploadcomplete (the thumbnail from the server's answer)
// exp:upload:complete -> "All files received.", n/n, the bar full, Cancel hidden
// #cancelUploadButton -> up.cancel(): "Upload canceled."
```

The requests are the same: one POST per file to `ezmultiupload/upload/<node>`,
with the session name and id, `UploadButton=Upload`, `ezxform_token` and the file
as `Filedata`, two at a time, as YUI's `simLimit`. The page keeps its markup and
its styles (`#multiuploadProgress`, `#thumbnails`, `.thumbnail-block`). The
deliberate differences:

- each file has its own row with a progress bar and a Cancel button;
- a drop zone;
- after Cancel, the next files are uploaded. YUI's uploader kept its stopped queue
  and uploaded nothing more until the page was loaded again;
- "All files received." is written when the last file of the round is in, not
  after the first one; Cancel stays visible until then;
- an upload error, or an answer that is not JSON, is shown in a message dialog
  (`Exp.dialog.alert`) and on the file's row, instead of the browser's `alert()`.

### The relation upload (`ezajaxuploader.js`, `io-upload-iframe`)

YUI posted step 1's form into a hidden iframe. Now the form's file field is an
`expUpload` with `form`, so the same fields go in the same order
(`UploadFile`, `AjaxUploadHandlerData[…]`, `ezxform_token`, `UploadName`) to the
same address (`ezjscore/call/ezajaxuploader::upload::<handler>?ContentType=html`),
and the upload shows its progress and can be canceled:

```js
$file.expUpload({
    url: Exp.config.call + 'ezajaxuploader::upload::ezobjectrelation?ContentType=html',
    name: 'UploadFile', form: $form[0], auto: false, multiple: false, token: false, responseType: 'text',
    onDone: function (text) { /* the call view's HTML-encoded JSON: decoded, then step 2 */ }
});
// the form's "Upload the file" button: up.start()
```

The whole relation upload (the dialog, the three steps, the browsing for a
location, the new object added to the relation table) is
`design/admin/javascript/expajaxuploader.js`, `$.fn.expAjaxUploader`, with the
configuration of the YUI version.

Tests
-----

`design/standard/javascript/exp/test/upload.test.js`, 10 tests on `/expui/test`,
against `expui/test/echo` (which answers with the fields and files it got):

- `size()` and `accepted()`;
- the chooser built in a container (label, input, `multiple`, `accept`), the drop hint, the hidden list;
- one POST per file, the data first and the file last, the form token; the events and callbacks;
- a form's fields in their order with the file in its place; `token: false`;
- files too large or of the wrong type refused and not sent;
- Cancel while uploading;
- `parallel`; a single-file chooser replacing a waiting file;
- a server error failing the file with its status; JSON answers parsed;
- dropped files; nothing while disabled;
- `data-exp-upload`.

The relation upload and ezmultiupload are also tested by use, as the note at the
top says.
