<?php /* #?ini charset="utf-8"?

# The exp:: packer keys ({ezscript_require( array( 'exp::core', 'exp::io' ) )}), as ezjsc::yui3 and ezjsc::jquery
[ezjscServer_exp]
Class=expUIServerFunctions

# ezjsc::jquery (the admin's and the designs' jQuery) is jQuery 4, with jQuery Migrate 4 while code moves to it:
# one jQuery per page, shared with Exp.$. Migrate restores what jQuery 4 removed and warns in the browser console
# about each use; empty LocalScripts[jqueryMigrate] (and ExternalScripts[jqueryMigrate]) to load jQuery 4 alone.
[eZJSCore]
LocalScripts[jquery]=/lib/jquery/jquery-4.0.0.min.js
LocalScripts[jqueryMigrate]=/lib/jquery/jquery-migrate-4.0.2.js
ExternalScripts[jquery]=https://code.jquery.com/jquery-4.0.0.min.js
ExternalScripts[jqueryMigrate]=https://code.jquery.com/jquery-migrate-4.0.2.min.js
# ezjsc::jqueryUI: jQuery UI 1.14.2, which supports jQuery 4 (ezjscore's own is 1.10.3, from 2013)
LocalScripts[jqueryUI]=/lib/jquery-ui/jquery-ui-1.14.2.min.js
ExternalScripts[jqueryUI]=https://code.jquery.com/ui/1.14.2/jquery-ui.min.js

*/ ?>
