exp::datepicker
===============

A calendar for date and date/time fields, keyboard-friendly and in the page's
language. Available since 1.0.0.1. Replaces YUI 2's `Calendar` and
`ezdatepicker.js`.

In the admin and the site designs: nothing to do
------------------------------------------------

The date and date/time fields of the admin (admin, admin2, admin3) and of the
ezwebin and ezdemo designs open this calendar from their calendar icon. Every
admin design loads `exp::datepicker` and `exp/datepicker.css`; the ezwebin and
ezdemo date templates load them themselves (with `{exp_config()}` and
`exp::core::shared`). The date templates load YUI's calendar only when
Exponential UI is not there.

It works the way YUI's calendar did:

- the icon opens the calendar under the fields;
- choosing a day fills the year, month and day fields. Numbers are written
  without a leading zero, as before, so what the form posts does not change;
- if the time fields are empty, they become 12:00;
- the calendar closes, and the year field gets the focus;
- dates before 1 January 1970 cannot be chosen.

And a little more:

- it opens on the date the fields already hold, not always on the current
  month;
- the week starts on the siteaccess's first day of the week (Monday or
  Sunday, from its locale), where YUI's always started on Sunday;
- the names of the months and days are in the page's language;
- it works with the keyboard, the icon included.

> [!NOTE]
> **Tested against YUI.** In the admin, admin2 and admin3 designs and on the
> front end, on Exponential Velocity and on PHP-FPM, the same clicks were made
> in YUI's calendar and in this one, and the results compared: the same field
> values, the same way of closing, the focus on the same field.

In your own templates
---------------------

```html
{exp_config()}
{ezscript_require( array( 'exp::core', 'exp::datepicker' ) )}
{ezcss_require( array( 'exp/core.css', 'exp/datepicker.css' ) )}

<fieldset id="event-start">
    <input name="start_year" size="5"> <input name="start_month" size="3"> <input name="start_day" size="3">
    <input name="start_hour" size="3"> <input name="start_minute" size="3">
</fieldset>
```

```js
Exp.ready(function ($) {
    $('#event-start').expDatePicker({
        fields: { year: '[name=start_year]', month: '[name=start_month]', day: '[name=start_day]',
                  hour: '[name=start_hour]', minute: '[name=start_minute]' }
    });
});
```

A "Choose a date" button appears after the day field. Give your own with
`button: '#my-icon'`. There is no `data-exp-*` attribute for it: the fields
must be named, so it is started from code.

Options
-------

| Option | Default | |
|---|---|---|
| `fields` | — | `year`, `month`, `day`, optional `hour`, `minute`: selectors inside the element |
| `button` | a new button after the day field | what opens the calendar |
| `min` | `'1970-01-01'` | the first date that can be chosen (`YYYY-MM-DD`) |
| `max` | none | the last date that can be chosen |
| `firstDay` | the siteaccess's (`Exp.config.locale.firstDay`) | `0` Sunday, `1` Monday |

The calls
---------

| Call | |
|---|---|
| `Exp.datepicker.open({ fields, anchor, container, min, max, firstDay, onSelect })` | opens one now. `fields`: elements, jQuery or selectors; `anchor`: what it opens from and gives the focus back to; `container`: where it is drawn (default: after the anchor); `onSelect(date)` after a day was chosen. Returns `{ close(), element }`, or `null` when the fields are not found |
| `Exp.datepicker.close()` | closes the open calendar |
| `Exp.datepicker.isOpen()` | whether one is open (there is one at a time) |
| `showDatePicker( base, id, datatype )` | what the date templates' calendar icon calls; opens the calendar for the fields named `<base>_<datatype>_year_<id>` and so on, in `<base>_<datatype>_cal_container_<id>` |

`$(el).data('expDatePicker')` holds `{ button, fields }`.

Events
------

Page-wide, with `Exp.on()`:

| Event | Data |
|---|---|
| `exp:datepicker:open` | `{ fields }` |
| `exp:datepicker:select` | `{ date: 'YYYY-MM-DD', fields }` |
| `exp:datepicker:close` | `{ fields }` |

Keyboard and screen readers
---------------------------

| Key | Does |
|---|---|
| Arrows | a day back or on, a week up or down |
| Page Up / Page Down | a month (with Shift: a year) |
| Home / End | the first or last day of the week |
| Enter / Space | choose the day |
| Escape | close, and give the focus back to the icon |

The calendar icon of the templates is reachable with Tab and opens with Enter
or Space; it gets `role="button"` and the label "Choose a date". The calendar
is a non-modal `role="dialog"` named by its month title, the days a
`role="grid"` of buttons, each labelled with its full date. Today says
`aria-current="date"`, the chosen day `aria-pressed="true"`. The title is an
`aria-live` region, so changing the month is read out. A click outside the
calendar closes it.

Styles
------

`exp/datepicker.css`, with the `--exp-*` tokens: `.exp-datepicker`,
`.exp-datepicker-head`, `.exp-datepicker-title`, `.exp-datepicker-prev`,
`-next`, `-close`, `.exp-datepicker-grid`, `.exp-datepicker-day`
(`.is-other-month`, `.is-today`, `.is-selected`), `.exp-datepicker-button`.

Texts
-----

`Previous month`, `Next month`, `Choose a date` and `Close` come from
`[ExpUI] Strings`; the names of the months and days from the browser's `Intl`,
in the siteaccess's language.

From YUI
--------

Nothing to change in templates that use the standard markup: an icon calling
`showDatePicker( base, id, datatype )`, with fields named
`<base>_<datatype>_year_<id>` and so on. `exp::datepicker` provides
`showDatePicker()`.

A template of your own that loads YUI's calendar should load it only without
Exponential UI, as the kernel's templates now do:

```js
(function () {
    if ( window.Exp && window.Exp.datepicker ) { return; }   // Exponential UI's calendar is here
    // … the YUILoader code that inserts ezdatepicker.js …
})();
```

Tests
-----

`design/standard/javascript/exp/test/datepicker.test.js`, 10 tests on
`/expui/test`:

- `showDatePicker()` opening in the template's container;
- filling the fields and the 12:00 default;
- keeping a time that was set, and a date field without time;
- opening on the date the fields hold;
- previous and next month, and the 1970 limit;
- the keyboard;
- the first day of the week;
- closing on an outside click;
- `$.fn.expDatePicker`;
- the icon with the keyboard.

The date fields are also tested by use, as the note at the top says.
