const SUPPORTED_LANGS = ['en', 'no', 'sv', 'da', 'fi', 'de', 'nl', 'fr'];
const DEFAULT_LANG = 'en';
const cache = {};

function detectLang() {
  var seg = window.location.pathname.split('/')[1];
  if (SUPPORTED_LANGS.includes(seg) && seg !== 'en') return seg;
  return DEFAULT_LANG;
}

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
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const val = get(t, el.dataset.i18nAlt);
    if (val != null) el.setAttribute('alt', val);
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
  var lang = detectLang();
  setLang(lang);
});
