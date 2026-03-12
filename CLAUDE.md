# Lina Website

## Project

Lina is a co-parenting app. This repo is its marketing website — a static site hosted on GitHub Pages.

## Tech stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Google Fonts (Inter) via CDN
- Lucide Icons via CDN
- No frameworks, no build tools, no dependencies

## Key files

| File/Dir | Purpose |
|---|---|
| `index.html` | Main landing page |
| `js/i18n.js` | Client-side translation logic |
| `locales/` | JSON translation files (en, no, sv, da, fi) |
| `assets/logos/Logomark_1.svg` | Primary logomark |
| `assets/images/` | App screenshots |
| `care-schedule/index.html` | Interactive care schedule tool |
| `privacy/index.html` | Privacy policy |
| `terms/index.html` | Terms of service |
| `contact.html` | Contact page |

## Styling rule

Always match the look and feel of `index.html` when creating or editing any file in this project — same CSS variables, nav structure, footer structure, and overall visual language.

## Branding rule

Always follow the branding guidelines defined in the project docs: `branding.md`, `color-system.md`, `color-usage.md`, `brand-voice.md`, and `taglines.md`. These live in the project knowledge and define Lina's visual identity, tone of voice, color palette, and approved taglines.

## i18n

- Client-side only
- Language detected via `navigator.language`
- Translations fetched dynamically from `/locales/`
- Supported languages: English (en), Norwegian (no), Swedish (sv), Danish (da), Finnish (fi)
- When adding user-facing text, always add translations for all 5 languages

## Hosting

GitHub Pages — static files only. No server-side logic, no dynamic routing, no backend.

## Asset format preference

- SVG for logos and icons
- JPG/PNG for photos and app screenshots
