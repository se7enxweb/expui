FAQ
===

### Do I have to change my site?

Almost certainly not. Run the one command in
[CONVERTING_YUI_to_EXPUI.md](CONVERTING_YUI_to_EXPUI.md#step-1--do-you-need-to-do-anything):
if it prints nothing for your own extensions and designs, there is nothing to do.

### Will my pages break when I install it?

That depends on where you list it. **Before ezjscore**, every page that loads
`ezjsc::jquery` or `ezjsc::jqueryUI` gets jQuery 4 and jQuery UI 1.14, with
jQuery Migrate 4 restoring what jQuery 4 removed and naming each old call in
the console. The admin's own code has been moved and tested. Your own jQuery 3
code usually keeps working under Migrate; the console tells you what to change
([step 6](CONVERTING_YUI_to_EXPUI.md#step-6--jquery-3-code-on-jquery-4)).
**After ezjscore**, pages get the jQuery your ezjscore ships: jQuery 4 with a
quiet Migrate in current Exponential, jQuery 3 in older versions. In every
order, the admin designs also get the configuration block and the admin's
collapsible menus and edit toolbar on Exponential UI. They behave as before
and were tested by use in admin, admin2 and admin3.

### The page already has jQuery 3. Do they conflict?

No. Exponential UI keeps jQuery 4 as `Exp.$` and gives the page its own `jQuery`
and `$` back. Your jQuery 3 code and plugins keep working; code written for the
API uses `Exp.$` or the `$` of `Exp.ready()`. This happens with an older
ezjscore (one that ships jQuery 3) and expui listed after it.

### Which order should `ActiveExtensions` have?

With the current ezjscore (it ships jQuery 4): expui **before** ezjscore, so
the console reports every old jQuery call of yours. With an older ezjscore
(jQuery 3): expui **after** ezjscore, until you update Exponential. See the
table in [INSTALL.md](INSTALL.md#switch-it-on).

### My jQuery 3 plugin breaks with "is not a function" on jQuery 4.

It calls something jQuery 3 already removed and Migrate does not bring back,
typically `.size()` (use `.length`) or `$.browser` (test the feature instead).
Migrate's warnings and the replacements are in
[step 6](CONVERTING_YUI_to_EXPUI.md#step-6--jquery-3-code-on-jquery-4).

### `/expui/test` shows an empty page.

The design base or template-override cache still has the list from before the
extension was active: `php bin/php/ezcache.php --clear-all`, and restart
persistent workers.

### `/expui/test` says "Exp.$ is set" failed.

The packed script did not contain jQuery 4. Clear the packer cache and the
template blocks together:
`php bin/php/ezcache.php --clear-id=ezjscore-packer,template-block`.

### After clearing the packer cache, admin pages lose their styles and menus.

Cached page heads still point to packed files that were removed. Clear
`template-block` (and `content`, and your HTTP or reverse-proxy cache) whenever
you clear `ezjscore-packer`.

### Exp.io.call rejects with kind "signedout".

The admin session ended. Sign in again; your page can catch the error and say
so (`error.kind === 'signedout'`).

### Exp.io.call rejects with kind "server" and a message.

That is the server function's own `error_text` — for example an unknown
function, a missing argument, or a permission it checks itself.

### I see many "JQMIGRATE" warnings in the console.

That is jQuery Migrate reporting old jQuery calls on the page — usually the
page's own jQuery 3 plugins, not the API. They are the list of what to change
before the page moves to jQuery 4 ([step 6](CONVERTING_YUI_to_EXPUI.md#step-6--jquery-3-code-on-jquery-4)).
Switch Migrate off (`[ExpUI] Migrate=disabled`) once there are none.

### Can I load jQuery 4 from a CDN?

`[ExpUI] JQuery=cdn` (code.jquery.com). The local copy is the default: no
third-party request, works offline and behind proxies.

### Does it work with Exponential Velocity?

Yes; it keeps no state between requests and its test suite runs on Velocity and
on PHP-FPM.

### Where is YUI removed?

In the last phase of the [roadmap](ROADMAP.md), after every feature that used it
runs on Exponential UI. It is announced in the changelog ahead of time.
