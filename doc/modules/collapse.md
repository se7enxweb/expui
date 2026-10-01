exp::collapse
=============

Menus and panels that collapse and expand, and remember it per user.
Available since 1.0.0.0. Replaces YUI 3's `ezcollapsiblemenu` (`Y.eZ.CollapsibleMenu`).

In the admin: nothing to do
---------------------------

With Exponential UI active, every admin design loads `exp::collapse`, and the
admin's collapsible menus run on it:

- the right menu, in the admin and admin2 designs;
- the edit page's object information menu, in the admin design. admin3 keeps
  that menu switched off; its template has the Exponential UI version
  commented out, ready to switch on.

They collapse, expand and remember their state as the YUI versions did, with
the same preference (`admin_right_menu_show` for the right menu). Without
Exponential UI the right menu's link still works: it is a plain
`user/preferences/set/...` address that reloads the page.

In your own templates
---------------------

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::collapse' ) )}

{def $collapsed = cond( ezpreference( 'myext_panel_collapsed' ), 1, 0 )}
<a href="#" id="panel-toggle">Filters</a>
<div id="panel"{if $collapsed} style="height: 0; overflow: hidden"{/if}>…</div>

<script>
{literal}
Exp.ready(function () {
    Exp.collapse({
        link: '#panel-toggle',
{/literal}
        collapsed: "{$collapsed}",
{literal}
        elements: [{ selector: '#panel', duration: 0.3,
                     fullStyle: { height: '240px' }, collapsedStyle: { height: '0px' } }],
        pref: { name: 'myext_panel_collapsed', values: [0, 1] }
    });
});
{/literal}
</script>
```

Click the link and the panel closes. Reload the page and it is still closed:
the template read the preference with `ezpreference()`, and the panel was
rendered closed.

> [!NOTE]
> **Render the starting state on the server**, as above: the page then shows
> the right state at once, with no jump when the script starts. `collapsed`
> tells the script which state that is.

Options
-------

| Option | Type | |
|---|---|---|
| `link` | selector or element | what collapses and expands it on click; it gets `aria-expanded` |
| `collapsed` | `0`/`1`, `"0"`/`"1"` | the state the page was made in |
| `content` | `[expanded, collapsed]` or `false` | the link's HTML for each state; `false` (the default) leaves it alone |
| `elements` | array | what changes, see below |
| `pref` | `{ name, values }` | the preference saved after each change: `values[collapsed]` (default `[0, 1]`) |
| `callback` | function | after each change; `this` is the instance |
| `beforecollapse`, `aftercollapse`, `beforeuncollapse`, `afteruncollapse` | functions | around each change; `after*` when the first element's animation ends |

Each entry of `elements`:

| | |
|---|---|
| `selector` | the element |
| `duration` | seconds |
| `fullStyle` | its styles when expanded |
| `collapsedStyle` | its styles when collapsed |

A style value may be a **function**, called at the moment of the change, for
sizes that depend on the page. Sizes (`px`, `em`, `rem`, `%`, plain numbers)
are **animated**. Other values (`no-repeat`, `unset`) are **set at once**.
For people who asked their system for less motion, everything is set at once.

The instance
------------

```js
var menu = Exp.collapse({ link: '#panel-toggle', elements: [{ selector: '#panel', fullStyle: { height: '240px' }, collapsedStyle: { height: '0px' } }] });
menu.collapse();  menu.uncollapse();  menu.expand();  menu.toggle();
menu.conf.collapsed;                   // 0 or 1
Exp.$('#panel-toggle').data('expCollapse') === menu;
```

`$('.toggle').expCollapse(conf)` sets one up on each element, with `link`
being that element.

Events
------

| Event | Data |
|---|---|
| `exp:collapse` | `{ link, collapsed }`, after each change (page-wide, `Exp.on()`) |

```js
Exp.on('exp:collapse', function (e, data) { console.log(data.link.id, data.collapsed); });
```

Keyboard and screen readers
---------------------------

Use a real link or button as `link`: it is reached with Tab and pressed with
Enter (or Space for a button). `aria-expanded` tells screen readers whether
the panel is open. The link's `href` stays as the fallback without
JavaScript.

From YUI
--------

Before:

```js
YUI(YUI3_config).use('ezcollapsiblemenu', 'event', 'io-ez', function (Y) {
    Y.on('domready', function () {
        new Y.eZ.CollapsibleMenu({
            link: '#rightmenu-showhide',
            collapsed: 0,
            elements: [{ selector: '#rightmenu', duration: 0.4,
                         fullStyle: { width: '201px' }, collapsedStyle: { width: '18px' } }],
            callback: function () {
                Y.io.ez.setPreference('admin_right_menu_show', this.conf.collapsed ? 0 : 1);
            }
        });
    });
});
```

After:

```js
Exp.ready(function () {
    Exp.collapse({
        link: '#rightmenu-showhide',
        collapsed: 0,
        elements: [{ selector: '#rightmenu', duration: 0.4,
                     fullStyle: { width: '201px' }, collapsedStyle: { width: '18px' } }],
        pref: { name: 'admin_right_menu_show', values: [1, 0] }
    });
});
```

The configuration is the same. Change the constructor, and replace the
preference callback with `pref` (or keep a `callback` that calls
`Exp.prefs.set()`). A style function that used `Y.one(...)` uses `Exp.$(...)`:
`Y.one('#leftmenu').get('clientWidth')` becomes
`Exp.$('#leftmenu')[0].clientWidth`.

Tests
-----

`design/standard/javascript/exp/test/collapse.test.js`, 8 tests on
`/expui/test`:

- the two styles, at once and animated;
- the link and `aria-expanded`;
- `"1"` from a template;
- function values and values set at once;
- the link content, callbacks and the event;
- the saved preference;
- `$.fn.expCollapse`.

The admin menus are also tested by use in the admin, admin2 and admin3 designs.
