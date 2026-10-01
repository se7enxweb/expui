<?php /* #?ini charset="utf-8"?

[ExpUI]
# Where jQuery 4 comes from: local (this extension's design/standard/lib/jquery/) or cdn (code.jquery.com,
# with Subresource Integrity). Local is the default: no third-party request, works offline and behind a proxy.
JQuery=local
LocalScripts[]
LocalScripts[jquery]=/lib/jquery/jquery-4.0.0.min.js
LocalScripts[migrate]=/lib/jquery/jquery-migrate-4.0.2.js
# The CDN copies and their sha384 hashes. Note: the CDN build of Migrate is muted (no console warnings);
# the local copy reports every removed or changed API, which is what porting needs.
ExternalScripts[]
ExternalScripts[jquery]=https://code.jquery.com/jquery-4.0.0.min.js
ExternalScripts[migrate]=https://code.jquery.com/jquery-migrate-4.0.2.min.js
ExternalIntegrity[]
ExternalIntegrity[jquery]=sha384-fgGyf7Mo7DURSOMnOy7ed+dkq5Job205Gnzu6QIg0BOHKaqt4D76Dt8VlDCzcMHV
ExternalIntegrity[migrate]=sha384-j1JGhEtpRFQa6jnqPcEWt92tLBipLPhYYJxOL/bmH3VrUmV++ZHPOXLcrjVMkuo6
ExternalIntegrity[jqueryUI]=sha384-tBcEcHGtNy7/Mx08+YxuvQ6v6s0N2jgehtFiT+bLtGwTj/txXtB/L5GqXfggm5sS

# jQuery Migrate 4 on top of jQuery 4: enabled while YUI and jQuery 3 code is ported (it restores some
# removed APIs and warns in the browser console about each use), disabled when the port is done.
Migrate=enabled

# While another jQuery (the admin's jQuery 3 from ezjsc::jquery) is on the page, jQuery 4 is kept as Exp.$ and
# the page's jQuery and $ are given back to it (jQuery.noConflict(true)), so existing code keeps its jQuery.
# When jQuery 4 is the only jQuery, it is the page's jQuery and $ as well. Nothing to set: this is automatic.

# Texts the modules show, translated in the extension/expui context and handed to Exp.i18n().
Strings[]
Strings[]=Close
Strings[]=Cancel
Strings[]=OK
Strings[]=Loading...
Strings[]=You are no longer signed in. Sign in again and repeat this.
Strings[]=The server answered with an error (HTTP %status).
Strings[]=No answer from the server.
Strings[]=Previous month
Strings[]=Next month
Strings[]=Choose a date
Strings[]=No records found.
Strings[]=Data error.
Strings[]=Click to sort ascending
Strings[]=Click to sort descending
Strings[]=Sorted by %column, ascending
Strings[]=Sorted by %column, descending
Strings[]=Pages
Strings[]=Page %page
Strings[]=Page %page of %pages
Strings[]=First page
Strings[]=Previous page
Strings[]=Next page
Strings[]=Last page
Strings[]=Table actions
Strings[]=Table options
Strings[]=Number of items per page:
Strings[]=Visible table columns:
Strings[]=Custom
Strings[]=Please enter a valid number between 1 and %max
Strings[]=Select all
Strings[]=Select %name
Strings[]=Filter
Strings[]=Press Enter to edit
Strings[]=Select files
Strings[]=Select a file
Strings[]=or drop them here
Strings[]=or drop it here
Strings[]=Cancel the upload of %name
Strings[]=Waiting
Strings[]=Uploading
Strings[]=Done
Strings[]=Failed
Strings[]=Canceled
Strings[]=The file is too large (%size, at most %max).
Strings[]=This type of file is not accepted.

*/ ?>
