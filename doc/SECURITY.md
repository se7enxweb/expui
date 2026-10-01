Security
========

What the API does
-----------------

- **Form tokens.** Every POST it makes — `Exp.io.call()`, `Exp.io.form()`,
  `Exp.prefs.set()`, `$.ez()` through `exp::compat` — carries the page's form
  token (ezformtoken, read from `#ezxform_token_js`). `Exp.io.form()` adds it
  when the form has none.
- **Checked arguments.** `Exp.io.call()` only sends `class::function` names of
  letters, digits and `_`, and refuses arguments that contain `::` or the call
  separator, so one call can never turn into another. Preference names are
  checked on both sides.
- **A configuration block that cannot be broken out of.** `{exp_config()}`
  escapes `<`, `>`, `&`, `'` and `"` inside its JSON, so no translated text or
  preference value can end the `<script>` element.
- **No `eval`, no inline handlers.** The modules read options from `data-`
  attributes and JSON, which makes a strict Content Security Policy possible.
- **No third-party requests by default.** jQuery 4 is served from the
  installation (`[ExpUI] JQuery=local`). With `cdn`, the files are code.jquery.com's,
  and `[ExpUI] ExternalIntegrity` has their Subresource Integrity hashes.
- **Clear failures.** A session that ended, a refused call and a server error
  reject with their own `kind` (`signedout`, `refused`, `server`), so a page can
  say so instead of failing silently.
- **Nothing kept between requests.** The PHP side keeps no state in statics; on
  a persistent-worker server one siteaccess's values never reach another.
- **Uploads and autosave carry the token too.** `exp::upload` adds the form
  token to each file's POST when the fields have none (`token: false` when they
  carry it already), and `exp::autosave` to each draft it posts.
- **Dialogs do not run the scripts they show.** HTML put into an
  `exp::dialog` (a string, or what `url` loads) is inserted without running its
  `<script>` elements, as YUI's modal window did; only `scripts: true` runs
  them. It is still HTML, inline handlers (`onclick`, `onerror`) included, so
  it must come from your own templates. The text of `Exp.dialog.confirm()` and
  `alert()`, and every title and button label, is written as text, never as
  HTML.
- **Tables write values as text.** `exp::datatable` writes a cell's value with
  `.text()`; only a column's own `render()` that returns a string, and labels
  given with `html: true`, put HTML in the table. The upload list, the date
  picker and the autosave preview's texts are written as text as well.

What the API does not do
------------------------

- It does not decide who may call a server function: ezjscore's permission
  settings (`[ezjscServer_<name>] Functions`, `PermissionPrFunction`) and the
  policies do, exactly as for `$.ez()` and YUI.
- It does not escape what you put into the page: use `.text()` for text,
  `.html()` only with HTML you trust (the server's own templates). The same goes
  for a datatable column's `render()` returning a string, a dialog's HTML
  `content` and `scripts: true`.
- It does not check uploads for the server. `maxSize` and `accept` spare the
  user a useless upload; the server must still check the size, the type and
  the user's rights for every file it receives.

Recommendations
---------------

- Render HTML on the server (a template server function) and insert it with
  `.html()`; insert user-supplied values with `.text()`.
- Keep `[ExpUI] JQuery=local` unless you have a reason for the CDN.
- Switch `[ExpUI] Migrate` off once your pages show no Migrate warnings: Migrate
  restores old jQuery behaviour that jQuery 4 removed for good reasons.

Reporting a vulnerability
-------------------------

Please write to **info@se7enx.com** rather than opening a public issue. We answer
within a few days and credit you in the release notes unless you prefer
otherwise.
