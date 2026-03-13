const SUPPORTED_LANGS = ['en', 'no', 'sv', 'da', 'fi'];
const DEFAULT_LANG = 'en';
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

function apply(t) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = get(t, el.dataset.i18n);
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = get(t, el.dataset.i18nAria);
    if (val != null) el.setAttribute('aria-label', val);
  });
  // Support per-page title key via <html data-i18n-title="cs.pageTitle">
  const titleKey = document.documentElement.dataset.i18nTitle || 'page.title';
  const title = get(t, titleKey);
  if (title) document.title = title;
}

async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  const t = await load(lang);
  apply(t);
  document.documentElement.lang = lang;
  localStorage.setItem('lina-lang', lang);
  document.dispatchEvent(new CustomEvent('lina:langchange', { detail: { lang, t } }));
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('lina-lang');
  const rawBrowser = navigator.language.split('-')[0];
  const browser = rawBrowser === 'nb' || rawBrowser === 'nn' ? 'no' : rawBrowser;
  const initial = SUPPORTED_LANGS.includes(saved) ? saved
    : SUPPORTED_LANGS.includes(browser) ? browser
    : DEFAULT_LANG;
  setLang(initial);
});
