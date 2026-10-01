<?php /* #?ini charset="utf-8"?

[ExtensionSettings]
DesignExtensions[]=expui

# The admin designs (admin, admin2, admin3) load these after the kernel's own list, behind ezjsc::jquery:
# exp::core::shared uses the page's jQuery 4 instead of loading a second copy; exp::io makes the server calls;
# exp::collapse replaces YUI's ezcollapsiblemenu in the admin templates; exp::sticky replaces fixed_toolbar.js (which
# stands aside when it runs); exp::dialog, exp::upload, exp::datatable, exp::datepicker and exp::autosave are the
# modules the admin's tables, uploads, date fields and autosave run on.
# The page configuration they read comes from page_head_exp.tpl ({exp_config()}).
[JavaScriptSettings]
BackendJavaScriptList[]=exp::core::shared
BackendJavaScriptList[]=exp::io
BackendJavaScriptList[]=exp::collapse
BackendJavaScriptList[]=exp::sticky
BackendJavaScriptList[]=exp::dialog
BackendJavaScriptList[]=exp::upload
BackendJavaScriptList[]=exp::datatable
BackendJavaScriptList[]=exp::datepicker
BackendJavaScriptList[]=exp::autosave

# The design tokens and the modules' styles, packed with the admin's own stylesheets.
[StylesheetSettings]
BackendCSSFileList[]=exp/core.css
BackendCSSFileList[]=exp/dialog.css
BackendCSSFileList[]=exp/upload.css
BackendCSSFileList[]=exp/datatable.css
BackendCSSFileList[]=exp/datepicker.css
BackendCSSFileList[]=exp/autosave.css

*/ ?>
