# Lina Website

## Project

Lina is a co-parenting app. This repo is its marketing website — a static site hosted on GitHub Pages.

## Tech stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Google Fonts (Inter) via CDN
- Lucide Icons via CDN
- No frameworks, no runtime dependencies
- Node.js build script for i18n (no npm dependencies)

## Key files

| File/Dir | Purpose |
|---|---|
| `index.html` | Main landing page |
| `js/i18n.js` | Client-side translation logic |
| `locales/` | JSON translation files (en, no, sv, da, fi, de, nl, fr) |
| `assets/logos/Logomark_1.svg` | Primary logomark |
| `assets/logos/Logo_1.svg` | Full logo (wordmark + logomark) |
| `assets/og-image.png` | Open Graph image for social sharing |
| `assets/images/` | App screenshots |
| `about/index.html` | About page |
| `care-schedule/index.html` | Interactive care schedule tool |
| `care-agreement/index.html` | Interactive care agreement tool |
| `faq/index.html` | FAQ page |
| `pricing/index.html` | Pricing page |
| `stories/index.html` | Stories / testimonials page |
| `professionals.html` | Professionals landing page |
| `privacy/index.html` | Privacy policy |
| `terms/index.html` | Terms of service |
| `contact.html` | Contact page |
| `account-deletion.html` | Account deletion request page |
| `account-deletion-scheduled.html` | Account deletion confirmation page |
| `account-deletion-cancelled.html` | Account deletion cancellation page |
| `email-changed.html` | Email change confirmation page |
| `docs/branding/` | Branding guidelines (brand-voice, taglines, branding) |
| `docs/colors/` | Color system guidelines (color-system, color-usage) |
| `scripts/build-i18n.js` | Generates pre-rendered HTML for no, sv, da, fi, de, nl, fr |
| `no/`, `sv/`, `da/`, `fi/`, `de/`, `nl/`, `fr/` | Generated language directories (do not edit directly) |

## Styling rule

Always match the look and feel of `index.html` when creating or editing any file in this project — same CSS variables, nav structure, footer structure, and overall visual language.

## Branding rule

Always follow the branding guidelines defined in the project docs:
- `docs/branding/branding.md` — visual identity
- `docs/branding/brand-voice.md` — tone of voice
- `docs/branding/taglines.md` — approved taglines
- `docs/colors/color-system.md` — color palette
- `docs/colors/color-usage.md` — color usage rules

## i18n

- Pre-rendered HTML per language: English on root (`/`), Norwegian under `/no/`, others under `/sv/`, `/da/`, `/fi/`, `/de/`, `/nl/`, `/fr/`
- Build script: `node scripts/build-i18n.js` — generates pre-rendered HTML files from source + locale JSON
- **Must re-run after any change to source HTML files or locale JSON files**
- Source files are the English HTML files (index.html, care-schedule/index.html, etc.) — their content mirrors en.json
- Generated files under no/, sv/, da/, fi/, de/, nl/, fr/ should never be edited directly
- Client-side i18n (js/i18n.js) retained only for interactive elements (care-schedule tool)
- Language detected from URL path, not navigator.language
- Supported languages: Norwegian (no), English (en), Swedish (sv), Danish (da), Finnish (fi), German (de), Dutch (nl), French (fr)
- When adding user-facing text, add translations to all 8 locale files in locales/

## Hosting

GitHub Pages — static files only. No server-side logic, no dynamic routing, no backend.

## Asset format preference

- SVG for logos and icons
- JPG/PNG for photos and app screenshots
