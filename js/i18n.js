const SUPPORTED_LANGS = ['en', 'no', 'sv', 'da', 'fi'];
const DEFAULT_LANG = 'no';
const cache = {};

function get(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

async function load(lang) {
  if (cache[lang]) return cache[lang];
  const res = await fetch(`/locales/${lang}.json`);
  cache[lang] = await res.json();
  return cache[lang];
}

/**
 * Detect language from URL path.
 * /en/..., /sv/..., /da/..., /fi/... → that language code.
 * Anything else (no prefix) → 'no'.
 */
function detectLang() {
  const first = window.location.pathname.split('/').filter(Boolean)[0];
  const urlLangs = ['en', 'sv', 'da', 'fi'];
  return urlLangs.includes(first) ? first : 'no';
}

/**
 * Apply locale to dynamic/interactive elements.
 * Static page content (headings, paragraphs, nav links) is already
 * pre-rendered by build-i18n.js, so this only has meaningful work to
 * do for elements created by JavaScript at runtime (e.g. care-schedule
 * labels, dynamic form placeholders).
 * Title and meta tags are NOT updated here — they are pre-rendered.
 */
function apply(t) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = get(t, el.dataset.i18n);
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = get(t, el.dataset.i18nAria);
    if (val != null) el.setAttribute('aria-label', val);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = get(t, el.dataset.i18nPlaceholder);
    if (val != null) el.setAttribute('placeholder', val);
  });
}

async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  const t = await load(lang);
  apply(t);
  document.documentElement.lang = lang === 'no' ? 'nb' : lang;
  localStorage.setItem('lina-lang', lang);
  document.dispatchEvent(new CustomEvent('lina:langchange', { detail: { lang, t } }));
}

window.linaSetLang = setLang;

document.addEventListener('DOMContentLoaded', () => {
  setLang(detectLang());
});
