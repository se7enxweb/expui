<?php /* #?ini charset="utf-8"?

[ExtensionSettings]
DesignExtensions[]=expui

# The admin designs (admin, admin2, admin3) load these after the kernel's own list, behind ezjsc::jquery:
# exp::core::shared uses the page's jQuery 4 instead of loading a second copy; exp::collapse replaces YUI's
# ezcollapsiblemenu in the admin templates; exp::sticky replaces fixed_toolbar.js (which stands aside when it runs).
# The page configuration they read comes from page_head_exp.tpl ({exp_config()}).
[JavaScriptSettings]
BackendJavaScriptList[]=exp::core::shared
BackendJavaScriptList[]=exp::collapse
BackendJavaScriptList[]=exp::sticky

*/ ?>
