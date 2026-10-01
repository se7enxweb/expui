/*!
 * Exponential UI (expui) datepicker — a calendar for the date and date/time fields, without YUI.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by exp::datepicker after exp::core. Replaces YUI 2's Calendar and ezdatepicker.js:
 *
 *   $(fieldset).expDatePicker({
 *       fields: { year: 'input[name$="_year_7"]', month: …, day: …, hour: …, minute: … },  the existing inputs stay
 *       button: '#calendar-icon',          what opens the calendar (default: a button added after the day field)
 *       min: '1970-01-01', max: null,      the dates that can be chosen (YYYY-MM-DD)
 *       firstDay: Exp.config.locale.firstDay   0 = Sunday, 1 = Monday
 *   });
 *   Exp.datepicker.open({ fields, anchor, container, min, max, firstDay, onSelect })   open one now
 *
 * Choosing a day fills the year, month and day fields as ezdatepicker.js did (numbers, no leading zero), sets the
 * hour to 12 and the minute to 00 when they are empty, closes the calendar and focuses the year field. The fields
 * keep their names, so what the form posts does not change.
 *
 * window.showDatePicker( base, id, datatype ), the function the date templates' calendar icon calls, opens this
 * calendar; the templates load YUI's only when Exponential UI is not there.
 *
 * Keyboard: arrows move a day or a week, Page Up / Page Down a month, Home / End the start or end of the week,
 * Enter or Space chooses, Escape closes and gives the focus back. The names of the months and days are the page
 * language's (Intl).
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp;
    if (!Exp || !Exp.$) { return; }
    var $ = Exp.$;

    var open = null;   // the calendar on the page (one at a time)

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function parse(s) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function sameDay(a, b) { return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
    function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
    function addMonths(d, n) {
        var t = new Date(d.getFullYear(), d.getMonth() + n, 1);
        var last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
        return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
    }

    function locale() { return (Exp.config.locale && Exp.config.locale.http) || 'en-GB'; }
    function format(d, opts) {
        try { return new Intl.DateTimeFormat(locale(), opts).format(d); } catch (e) { return new Intl.DateTimeFormat('en-GB', opts).format(d); }
    }

    /** The date the fields hold, or null. */
    function fromFields(f) {
        var y = parseInt(f.year.val(), 10), m = parseInt(f.month.val(), 10), d = parseInt(f.day.val(), 10);
        if (!y || !m || !d) { return null; }
        var date = new Date(y, m - 1, d);
        return date.getMonth() === m - 1 ? date : null;
    }

    function close(giveFocus) {
        if (!open) { return; }
        var o = open;
        open = null;
        $(document).off('.expdatepicker');
        o.$el.remove();
        if (o.$container) { o.$container.css('display', 'none'); }
        if (giveFocus && o.anchor && o.anchor.focus) { o.anchor.focus(); }
        Exp.emit('exp:datepicker:close', { fields: o.fields });
    }

    /**
     * Opens the calendar. opts: fields (jQuery objects or selectors: year, month, day, optional hour, minute),
     * anchor (the element it opens from, which gets the focus back), container (where it is drawn; default: after the
     * anchor), min, max (YYYY-MM-DD), firstDay, onSelect(date).
     */
    function openPicker(opts) {
        close(false);
        var f = {};
        ['year', 'month', 'day', 'hour', 'minute'].forEach(function (k) { f[k] = $(opts.fields[k]).first(); });
        if (!f.year.length || !f.month.length || !f.day.length) { return null; }
        var min = parse(opts.min === undefined ? '1970-01-01' : opts.min), max = parse(opts.max);
        var firstDay = opts.firstDay === undefined ? (Exp.config.locale && Exp.config.locale.firstDay) || 0 : +opts.firstDay;
        var selected = fromFields(f), today = new Date();
        var focus = selected || today;
        if (min && focus < min) { focus = min; }
        if (max && focus > max) { focus = max; }

        var $el = $('<div class="exp-datepicker" role="dialog" aria-modal="false"></div>');
        var titleId = 'exp-datepicker-title-' + Date.now();
        $el.attr('aria-labelledby', titleId);
        var $head = $('<div class="exp-datepicker-head"></div>');
        var $prev = $('<button type="button" class="exp-datepicker-prev"></button>').attr('aria-label', Exp.i18n('Previous month')).text('‹');
        var $title = $('<div class="exp-datepicker-title" aria-live="polite"></div>').attr('id', titleId);
        var $next = $('<button type="button" class="exp-datepicker-next"></button>').attr('aria-label', Exp.i18n('Next month')).text('›');
        var $close = $('<button type="button" class="exp-datepicker-close"></button>').attr('aria-label', Exp.i18n('Close')).text('×');
        $head.append($prev, $title, $next, $close);
        var $grid = $('<table class="exp-datepicker-grid" role="grid"></table>').attr('aria-labelledby', titleId);
        $el.append($head, $grid);

        function allowed(d) { return !(min && d < min) && !(max && d > max); }

        function draw() {
            $title.text(format(focus, { month: 'long', year: 'numeric' }));
            var first = new Date(focus.getFullYear(), focus.getMonth(), 1);
            var start = addDays(first, -((first.getDay() - firstDay + 7) % 7));
            var html = $('<thead><tr></tr></thead>'), $tr = html.find('tr');
            for (var i = 0; i < 7; i++) {
                var wd = addDays(start, i);
                $('<th scope="col"></th>').attr('abbr', format(wd, { weekday: 'long' })).text(format(wd, { weekday: 'short' })).appendTo($tr);
            }
            var $body = $('<tbody></tbody>');
            for (var w = 0; w < 6; w++) {
                var $row = $('<tr></tr>').appendTo($body);
                for (var j = 0; j < 7; j++) {
                    var day = addDays(start, w * 7 + j);
                    var $b = $('<button type="button" class="exp-datepicker-day"></button>').text(day.getDate()).attr('data-date', iso(day))
                        .attr('aria-label', format(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
                        .attr('tabindex', sameDay(day, focus) ? '0' : '-1');
                    if (day.getMonth() !== focus.getMonth()) { $b.addClass('is-other-month'); }
                    if (sameDay(day, today)) { $b.addClass('is-today').attr('aria-current', 'date'); }
                    if (sameDay(day, selected)) { $b.addClass('is-selected').attr('aria-pressed', 'true'); }
                    if (!allowed(day)) { $b.prop('disabled', true); }
                    $('<td role="gridcell"></td>').append($b).appendTo($row);
                }
            }
            $grid.empty().append(html, $body);
            $prev.prop('disabled', !!min && new Date(focus.getFullYear(), focus.getMonth(), 0) < min);
            $next.prop('disabled', !!max && new Date(focus.getFullYear(), focus.getMonth() + 1, 1) > max);
        }
        function focusDay() { $grid.find('button[data-date="' + iso(focus) + '"]').trigger('focus'); }
        function move(d) {
            if (min && d < min) { d = min; }
            if (max && d > max) { d = max; }
            var redraw = d.getMonth() !== focus.getMonth() || d.getFullYear() !== focus.getFullYear();
            focus = d;
            if (redraw) { draw(); } else {
                $grid.find('button.exp-datepicker-day').attr('tabindex', '-1');
                $grid.find('button[data-date="' + iso(focus) + '"]').attr('tabindex', '0');
            }
            focusDay();
        }
        function choose(d) {
            if (!allowed(d)) { return; }
            // as ezdatepicker.js: numbers without leading zeros, 12:00 when no time was set
            f.year.val(d.getFullYear()).trigger('change');
            f.month.val(d.getMonth() + 1).trigger('change');
            f.day.val(d.getDate()).trigger('change');
            if (f.hour.length && String(f.hour.val()) === '') { f.hour.val('12').trigger('change'); }
            if (f.minute.length && String(f.minute.val()) === '') { f.minute.val('00').trigger('change'); }
            var fields = open ? open.fields : f;
            close(false);
            f.year.trigger('focus');
            if (opts.onSelect) { opts.onSelect(d); }
            Exp.emit('exp:datepicker:select', { date: iso(d), fields: fields });
        }

        $prev.on('click', function () { focus = addMonths(focus, -1); draw(); $prev.trigger('focus'); });
        $next.on('click', function () { focus = addMonths(focus, 1); draw(); $next.trigger('focus'); });
        $close.on('click', function () { close(true); });
        $grid.on('click', 'button.exp-datepicker-day', function () { choose(parse(this.getAttribute('data-date'))); });
        $el.on('keydown', function (e) {
            var k = e.key;
            if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
            if (!$(e.target).hasClass('exp-datepicker-day')) { return; }
            var map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
            if (map[k] !== undefined) { e.preventDefault(); move(addDays(focus, map[k])); }
            else if (k === 'PageUp') { e.preventDefault(); move(addMonths(focus, e.shiftKey ? -12 : -1)); }
            else if (k === 'PageDown') { e.preventDefault(); move(addMonths(focus, e.shiftKey ? 12 : 1)); }
            else if (k === 'Home') { e.preventDefault(); move(addDays(focus, -((focus.getDay() - firstDay + 7) % 7))); }
            else if (k === 'End') { e.preventDefault(); move(addDays(focus, 6 - ((focus.getDay() - firstDay + 7) % 7))); }
            else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(focus); }
        });

        var $container = opts.container ? $(opts.container).first() : $();
        if ($container.length) {
            $container.empty().append($el).css('display', 'block');
        } else {
            $el.insertAfter($(opts.anchor || f.day).first());
        }
        open = { $el: $el, $container: $container.length ? $container : null, anchor: opts.anchor ? $(opts.anchor)[0] : f.day[0], fields: f };
        draw();
        focusDay();
        // a click outside closes it, as YUI's close button and losing the calendar did
        window.setTimeout(function () {
            $(document).on('mousedown.expdatepicker', function (e) {
                if (open && !$.contains(open.$el[0], e.target) && e.target !== open.anchor) { close(false); }
            });
        }, 0);
        Exp.emit('exp:datepicker:open', { fields: f });
        return { close: function () { close(true); }, element: $el[0] };
    }

    Exp.datepicker = { open: openPicker, close: function () { close(true); }, isOpen: function () { return !!open; } };

    $.fn.expDatePicker = function (options) {
        return this.each(function () {
            var $box = $(this), o = $.extend({ min: '1970-01-01' }, options || {});
            var fields = {};
            ['year', 'month', 'day', 'hour', 'minute'].forEach(function (k) { if (o.fields && o.fields[k]) { fields[k] = $box.find(o.fields[k]).first(); } });
            if (!fields.year || !fields.year.length) { return; }
            var $button = o.button ? $(o.button).first() : $();
            if (!$button.length) {
                $button = $('<button type="button" class="exp-datepicker-button"></button>').attr('aria-label', Exp.i18n('Choose a date'))
                    .append('<svg class="exp-datepicker-icon" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16">'
                        + '<path fill="currentColor" d="M4 0h1v2h6V0h1v2h3v14H1V2h3V0zM2 6v9h12V6H2zm1 1.5h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zM3 11h2v2H3v-2zm4 0h2v2H7v-2z"/></svg>')
                    .insertAfter(fields.day);
            }
            $button.on('click', function (e) {
                e.preventDefault();
                openPicker($.extend({}, o, { fields: fields, anchor: $button[0] }));
            });
            $box.data('expDatePicker', { button: $button[0], fields: fields });
        });
    };

    // The date templates' calendar icon: <img onclick="showDatePicker( base, id, datatype )">, with the fields named
    // <base>_<datatype>_year_<id> and so on, and the container <base>_<datatype>_cal_container_<id>.
    window.showDatePicker = function (base, id, datatype) {
        var name = function (part) { return document.getElementsByName(base + '_' + datatype + '_' + part + '_' + id)[0] || null; };
        var icon = document.getElementById(base + '_' + datatype + '_cal_' + id);
        if (icon && !icon.hasAttribute('tabindex')) { icon.setAttribute('tabindex', '0'); }
        return openPicker({
            fields: { year: name('year'), month: name('month'), day: name('day'), hour: name('hour'), minute: name('minute') },
            anchor: icon,
            container: document.getElementById(base + '_' + datatype + '_cal_container_' + id),
            min: '1970-01-01'
        });
    };
    window.showDatePicker.exp = true;

    // the icon is an <img>: make it reachable and usable with the keyboard as well
    $(document).on('keydown', 'img.datepicker-icon[onclick]', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
    });
    Exp.ready(function () {
        $('img.datepicker-icon[onclick]').attr({ tabindex: '0', role: 'button' }).each(function () {
            if (!this.getAttribute('aria-label')) { this.setAttribute('aria-label', Exp.i18n('Choose a date')); }
        });
    });
}(window, document));
