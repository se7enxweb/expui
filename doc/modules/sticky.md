exp::sticky
===========

A toolbar that stays in view while the page scrolls, and a "go to the top"
link. Available since 1.0.0.0. Replaces the admin's `fixed_toolbar.js` (YUI 3
`event`, `node-screen`, `node-style`, `selector-css3`, `transition`).

In the admin: nothing to do
---------------------------

With Exponential UI active, every admin design (admin, admin2, admin3) loads
`exp::sticky`. It wires the edit forms' toolbar, `#controlbar-top` over
`#editform` or `#ClassEdit`, when the page is ready. `fixed_toolbar.js` stands
aside when it finds `Exp.sticky`, so there is always exactly one.

It does what `fixed_toolbar.js` did, in the same order:

1. On load, when the page is above the form, it scrolls to the form and
   focuses the first text field.
2. Scrolled past the form's start, the toolbar gets the class
   `controlbar-fixed`: the admin's stylesheet fixes it to the top, and other
   extensions, such as ezautosave's preview, read the class.
3. Further down, the "go to the top" link (`.scroll-to-top`) fades in.
4. Back above the start, the class is removed and the link fades out.

> [!NOTE]
> **In admin3** the toolbar sits above the columns, so the "fixed" position is
> never reached. That was true of `fixed_toolbar.js` too: there the toolbar
> stays where it is, and only the "go to the top" link appears.

In your own templates
---------------------

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::sticky' ) )}
```

```js
Exp.ready(function ($) {
    $('#my-toolbar').expSticky({
        form: '#my-form',            // only on pages with this form
        start: '#my-form',           // fixed once this element's top scrolls under the toolbar
        className: 'is-stuck',       // the class it gets while fixed: style it in your CSS
        toTop: '#back-to-top',
        scrollToStart: false         // do not jump to the form on load
    });
});
```

```css
#my-toolbar.is-stuck { position: fixed; top: 0; left: 0; right: 0; z-index: 10; box-shadow: var(--exp-shadow-up); }
```

> [!NOTE]
> **Only need the toolbar to stay in view?** CSS can do it alone:
> `position: sticky; top: 0`. Use `exp::sticky` when something else must know
> the state (a class to read), or for the admin's behaviour.

Options
-------

| Option | Default | |
|---|---|---|
| `form` | `'#editform, #ClassEdit'` | only on pages with this form |
| `start` | `'#columns'` | the toolbar is fixed once this element's top scrolls under it |
| `className` | `'controlbar-fixed'` | the class while fixed |
| `toTop` | `'.scroll-to-top'` | the "go to the top" link; a click on it hides it |
| `scrollToStart` | `true` | on load: scroll to the start, focus the form's first text field |
| `toTopOpacity` | `0.6` | the link's opacity when shown |
| `fade` | `500` | the link's fade, in ms (0 with reduced motion) |

The instance
------------

`Exp.sticky.start(el, options)` returns it, and `$(el).data('expSticky')`
holds it. It has `active` (`false` when the page has no such form), `formY`
(the scroll position where it fixes) and `onScroll()`.

`Exp.sticky.admin()` is `Exp.sticky.start('#controlbar-top')` with the
defaults: what `exp::sticky` runs when the page is ready.

Events
------

None: the class on the toolbar is the state other code reads.

Keyboard and screen readers
---------------------------

Nothing changes in the toolbar itself: its buttons stay where Tab finds them.
With `scrollToStart` the focus starts in the form's first text field, as with
`fixed_toolbar.js`. The link's fade follows `prefers-reduced-motion`.

From YUI
--------

Nothing to convert in the admin. A design of your own that copied
`fixed_toolbar.js` replaces the copy with one call:

```js
Exp.ready(function ($) { $('#controlbar-top').expSticky(); });
```

Tests
-----

`design/standard/javascript/exp/test/sticky.test.js`, 4 tests on
`/expui/test`:

- a page without the form;
- fixing and unfixing around the start, and the "go to the top" link;
- scrolling to the start and focusing the first field;
- `$.fn.expSticky`.

The admin's edit toolbar is also tested by use in the admin, admin2 and admin3
designs.
