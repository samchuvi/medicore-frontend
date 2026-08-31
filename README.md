# Byarwanga Medical Centre — Frontend

React + Vite single-page app for the Hospital Management System.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Internationalisation (i18n)

The UI ships in three languages and is driven by [`i18next`](https://www.i18next.com/) /
`react-i18next`:

| Language | Code | Direction |
|----------|------|-----------|
| English  | `en` | LTR       |
| French   | `fr` | LTR       |
| Arabic   | `ar` | RTL       |

* On first load the system reads the user's device / browser language
  (`navigator.language`). If it is French or Arabic the UI switches automatically;
  anything else falls back to **English**.
* Users can override the choice at any time with the language button in the top bar
  (also available on the login screen). The choice is saved in `localStorage`
  (`hms_lang`).
* When Arabic is active, `<html dir="rtl">` is set automatically so the layout
  mirrors.

All translation strings live in [`src/i18n.js`](src/i18n.js). To add or edit a
string, update the `en`, `fr` and `ar` blocks and reference it with
`t("some.key")`.
