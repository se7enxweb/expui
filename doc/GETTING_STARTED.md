Getting started
===============

Ten minutes from "installed" to your first page that talks to the server
through the new API.

1. Check that it works
----------------------

After [installing](INSTALL.md), open the admin and go to **`/expui/test`**
(for example `https://example.com/admin/expui/test`). The page runs every unit
test of the API on a real admin page. It should end with:

> **110 passed, 0 failed**

If it does not, the failing test's name says what is wrong; see the
[FAQ](FAQ.md).

2. Load the API on a page
-------------------------

In any template — a pagelayout, a node view, a module view — put these two lines
**in this order**:

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::io' ) )}
```

- `{exp_config()}` writes the page's configuration (addresses, siteaccess,
  locale, translated texts) as a small JSON block. Put it before the scripts
  (in the `<head>` of your pagelayout is ideal; the admin designs have it
  already). A template may add another for its own preferences or texts: the
  blocks are merged.
- `exp::core` loads jQuery 4 and the `Exp` core; `exp::io` adds the server calls.

When the page already has jQuery 4 (the admin does, with expui activated before
ezjscore), the API uses that one. When it has an older jQuery, the page keeps it
and the API uses its own jQuery 4, `Exp.$`. Either way, write `Exp.$` in your
code and it works.

3. Run code when the page is ready
----------------------------------

```html
<script>
Exp.ready(function ($) {
    // $ is jQuery 4 here, whatever jQuery the rest of the page uses
    $('#hello').text('Hello from jQuery ' + $.fn.jquery);
});
</script>
<p id="hello"></p>
```

4. Call the server
------------------

Every ezjscore server function (the ones you already use with `$.ez()` or YUI's
`io-ez`) is called with `Exp.io.call()`:

```js
Exp.io.call('ezjsc::time').then(function (time) {
    console.log('Server time: ' + time);
}).catch(function (error) {
    console.log(error.kind, error.message);   // signedout, refused, server, network, timeout, invalid
});
```

With arguments:

```js
// ezjscnode::subtree with node 2, 10 items, offset 0
Exp.io.call('ezjscnode::subtree', [2, 10, 0]).then(function (content) { /* … */ });
```

5. Post a form without leaving the page
---------------------------------------

```js
$('#my-form').on('submit', function (e) {
    e.preventDefault();
    Exp.io.form(this, { submitter: e.originalEvent.submitter }).then(function (response) {
        $('#result').text('Saved');
    });
});
```

The form token is added for you.

6. Remember a choice for the user
---------------------------------

```html
{exp_config( hash( 'prefs', array( 'mysite_show_help' ) ) )}
```

```js
var show = Exp.prefs.get('mysite_show_help', '1') === '1';
$('#help').toggle(show);
$('#toggle-help').on('click', function () {
    show = !show;
    $('#help').toggle(show);
    Exp.prefs.set('mysite_show_help', show ? '1' : '0');   // saved for the signed-in user
});
```

7. Start behaviour from HTML, without inline scripts
----------------------------------------------------

```js
// once, in a script file of your design
Exp.register('greet', function ($el, options) {
    $el.text('Hello, ' + (options.name || 'world'));
});
```

```html
<span data-exp-greet='{"name": "Exponential"}'></span>
```

Every element with `data-exp-greet` is started once when the page is ready.
After inserting HTML with AJAX, call `Exp.start(container)`.

8. Translate your texts
-----------------------

```html
{exp_config( hash( 'strings', array( 'Saved', '%count items' ) ) )}
```

```js
Exp.i18n('Saved');                          // "Gespeichert" on a German siteaccess
Exp.i18n('%count items', { '%count': 3 });  // "3 items"
```

The texts are translated in the `extension/expui` context; add them to your
extension's translation files.

9. Use a ready-made module
--------------------------

The modules do the bigger jobs for you. A question before a button of your
form submits it, without a line of script (OK submits the form with that
button, Cancel does nothing):

```html
{ezscript_require( array( 'exp::core', 'exp::dialog' ) )}
{ezcss_require( array( 'exp/core.css', 'exp/dialog.css' ) )}

<input type="submit" class="button" name="RemoveButton" value="Remove"
       data-exp-dialog='{"confirm": "Remove the selected items?", "danger": true}' />
```

On admin pages every module is loaded already. The others: tables
(`exp::datatable`), uploads (`exp::upload`), a calendar for date fields
(`exp::datepicker`), autosave (`exp::autosave`), collapsible panels
(`exp::collapse`) and a sticky toolbar (`exp::sticky`), each with its page in
[`modules/`](MODULES.md).

Next
----

- **[Using Exponential UI](USEING_EXPUI.md)**, the book: every feature with
  examples, writing your own server functions, styling, testing and recipes.
- The full [API reference](API.md).
- [Modules](MODULES.md): the modules available now, and the ones still to come.
- Moving old code: [CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md).
