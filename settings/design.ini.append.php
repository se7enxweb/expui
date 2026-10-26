<?php /* #?ini charset="utf-8"?

[ExtensionSettings]
DesignExtensions[]=expui

# No scripts on every admin4 page: admin4 and admin4l load jQuery only on the pages that request it, and the modules
# only where a template requests them, outside any cache-block, for example
#   {ezscript_require( array( 'exp::core::shared', 'exp::io', 'exp::datatable' ) )}
# The modules run without jQuery; only exp::compat needs it ('ezjsc::jquery' in front). (doc/CONFIGURATION.md)
# The older admin designs (admin, admin3) still load every module on every page: their page_head_script.tpl reads
# ClassicBackendJavaScriptList[] after jQuery and BackendJavaScriptList[]; admin4 and admin4l do not read it.
# The page configuration the modules read comes from page_head_exp.tpl ({exp_config()}).
[JavaScriptSettings]
ClassicBackendJavaScriptList[]=exp::core::shared
ClassicBackendJavaScriptList[]=exp::io
ClassicBackendJavaScriptList[]=exp::collapse
ClassicBackendJavaScriptList[]=exp::sticky
ClassicBackendJavaScriptList[]=exp::dialog
ClassicBackendJavaScriptList[]=exp::upload
ClassicBackendJavaScriptList[]=exp::datatable
ClassicBackendJavaScriptList[]=exp::datepicker
ClassicBackendJavaScriptList[]=exp::autosave

# The design tokens and the modules' styles, packed with the admin's own stylesheets.
[StylesheetSettings]
BackendCSSFileList[]=exp/core.css
BackendCSSFileList[]=exp/dialog.css
BackendCSSFileList[]=exp/upload.css
BackendCSSFileList[]=exp/datatable.css
BackendCSSFileList[]=exp/datepicker.css
BackendCSSFileList[]=exp/autosave.css

*/ ?>
