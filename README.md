# lina-website

Marketing website for [Lina](https://lina.app) — a co-parenting app.

Static site hosted on GitHub Pages. No frameworks, no build tools, no dependencies.

## Tech stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Google Fonts (Inter) via CDN
- Lucide Icons via CDN

## Structure

| File/Dir | Purpose |
|---|---|
| `index.html` | Main landing page |
| `about/` | About page |
| `care-schedule/` | Interactive care schedule tool |
| `care-agreement/` | Interactive care agreement tool |
| `faq/` | FAQ page |
| `pricing/` | Pricing page |
| `stories/` | Stories / testimonials page |
| `professionals.html` | Professionals landing page |
| `privacy/` | Privacy policy |
| `terms/` | Terms of service |
| `contact.html` | Contact page |
| `js/i18n.js` | Client-side translation logic |
| `locales/` | JSON translation files (en, no, sv, da, fi) |
| `assets/` | Logos, images, OG image |
| `css/` | Stylesheets |
| `docs/` | Branding and color guidelines |

## i18n

Language is detected via `navigator.language`. Translations are fetched dynamically from `/locales/`. Supported languages: English, Norwegian, Swedish, Danish, Finnish.

When adding user-facing text, add translations for all 5 languages.

## Development

No build step required. Open `index.html` directly in a browser, or serve with any static file server:

```sh
npx serve .
```

## Deployment

Pushes to `main` deploy automatically via GitHub Pages.
