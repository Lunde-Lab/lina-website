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
  // Support per-page title key via <html data-i18n-title="cs.pageTitle">
  const titleKey = document.documentElement.dataset.i18nTitle || 'page.title';
  const title = get(t, titleKey);
  if (title) document.title = title;

  // Update meta description
  const descKey = document.documentElement.dataset.i18nDesc || 'page.description';
  const desc = get(t, descKey);
  if (desc) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', desc);
  }

  // Update og:title and twitter:title from document.title
  if (title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);
  }
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
  const saved = localStorage.getItem('lina-lang');
  const rawBrowser = navigator.language.split('-')[0];
  const browser = rawBrowser === 'nb' || rawBrowser === 'nn' ? 'no' : rawBrowser;
  const initial = SUPPORTED_LANGS.includes(saved) ? saved
    : SUPPORTED_LANGS.includes(browser) ? browser
    : DEFAULT_LANG;
  setLang(initial);
});
