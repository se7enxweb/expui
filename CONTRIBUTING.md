Contributing to Exponential UI
==============================

Thank you for helping. Exponential UI is free software (GPL v2 or later) at
[github.com/se7enxweb/expui](https://github.com/se7enxweb/expui).

- **Report a problem**: an issue with your Exponential and PHP versions, the
  browser, what you did, what you expected, what happened, and the console's
  messages. Security problems: [doc/SECURITY.md](doc/SECURITY.md).
- **Converting YUI code and stuck?** Open an issue with the code; the answer goes
  into [doc/CONVERTING_YUI_to_EXPUI.md](doc/CONVERTING_YUI_to_EXPUI.md).
- **Translate**: copy `translations/untranslated/translation.ts` to
  `translations/<locale>/translation.ts` and fill in the translations.
- **Write a module**: follow [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md#writing-a-module).
  A module is finished when it has its tests (browser and PHPUnit,
  [doc/TESTING.md](doc/TESTING.md)), its page in `doc/modules/`, its texts in
  English and German, and works with the keyboard alone.

Before a pull request: `php -l` and `node --check` on what you changed; the
PHPUnit suite; `/expui/test` all passed; the pages you touched with the
browser's console open (no errors, no Migrate warnings from your code).

Commit messages start with the kind of change and say what it does for the user:

```
Added: Exp.io.poll stops when the page is left
Updated: The date picker starts on the locale's first weekday
```

By contributing you agree that your work is published under the GNU General
Public License v2.0 or any later version.
