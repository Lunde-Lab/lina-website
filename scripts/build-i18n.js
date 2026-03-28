#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT     = path.resolve(__dirname, '..');
const BASE_URL = 'https://getlina.app';
const LANGS    = ['en', 'sv', 'da', 'fi'];

const LANG_CODE  = { no: 'nb', en: 'en', sv: 'sv', da: 'da', fi: 'fi' };
const LANG_LABEL = { no: 'NO', en: 'EN', sv: 'SV', da: 'DA', fi: 'FI' };
const LANG_FLAG  = { no: '🇳🇴', en: '🇬🇧', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮' };
const LANG_NAME  = { no: 'Norsk', en: 'English', sv: 'Svenska', da: 'Dansk', fi: 'Suomi' };

// Source files with their canonical URL paths and sitemap priorities
const SOURCE_FILES = [
  { src: 'index.html',                urlPath: '/',                   priority: '1.0' },
  { src: 'care-schedule/index.html',  urlPath: '/care-schedule/',     priority: '0.8' },
  { src: 'care-agreement/index.html', urlPath: '/care-agreement/',    priority: '0.8' },
  { src: 'professionals.html',        urlPath: '/professionals.html', priority: '0.8' },
  { src: 'about/index.html',          urlPath: '/about/',             priority: '0.7' },
  { src: 'faq/index.html',            urlPath: '/faq/',               priority: '0.7' },
  { src: 'pricing/index.html',        urlPath: '/pricing/',           priority: '0.7' },
  { src: 'stories/index.html',        urlPath: '/stories/',           priority: '0.6' },
  { src: 'contact.html',              urlPath: '/contact.html',       priority: '0.5' },
];

// Internal page paths that should receive a language prefix
const INTERNAL_PATHS = [
  // Order matters: longer/more-specific first to avoid partial matches
  '/care-schedule/',
  '/care-agreement/',
  '/professionals.html',
  '/contact.html',
  '/pricing/',
  '/stories/',
  '/about/',
  '/faq/',
  // Paths without trailing slash (some CTAs use these)
  '/care-schedule',
  '/care-agreement',
  '/pricing',
  '/stories',
  '/about',
  '/faq',
  // Root last (exact match only)
  '/',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function get(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function langUrl(lang, urlPath) {
  return urlPath === '/' ? `/${lang}/` : `/${lang}${urlPath}`;
}

function fullUrl(lang, urlPath) {
  return `${BASE_URL}${langUrl(lang, urlPath)}`;
}

/**
 * Split HTML into segments, protecting JSON-LD script blocks from modification.
 * Returns an array of { text, jsonLd } objects.
 */
function splitJsonLd(html) {
  const parts = [];
  let last = 0;
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) parts.push({ text: html.slice(last, m.index), jsonLd: false });
    parts.push({ text: m[0], jsonLd: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ text: html.slice(last), jsonLd: false });
  return parts;
}

function processNonJsonLd(html, fn) {
  return splitJsonLd(html).map(p => p.jsonLd ? p.text : fn(p.text)).join('');
}

// ─── Transformations ─────────────────────────────────────────────────────────

/** Replace data-i18n text content, data-i18n-aria, data-i18n-placeholder */
function applyTranslations(html, locale) {
  // data-i18n: replace text content between opening tag and first child/closing tag
  // Matches: opening tag (with data-i18n) → captures key → text until next tag
  html = html.replace(
    /(<[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)/g,
    (match, openTag, key, _text) => {
      const val = get(locale, key);
      return val != null ? openTag + val : match;
    }
  );

  // data-i18n-aria: update aria-label on the same tag
  // The tag is always on one line in practice, so match until >
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-aria="([^"]+)"[^\n>]*)/g,
    (match, before, key) => {
      const val = get(locale, key);
      if (val == null) return match;
      if (/\saria-label="[^"]*"/.test(match)) {
        return match.replace(/\saria-label="[^"]*"/, ` aria-label="${val}"`);
      }
      return match + ` aria-label="${val}"`;
    }
  );

  // data-i18n-placeholder: update placeholder attribute
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-placeholder="([^"]+)"[^\n>]*)/g,
    (match, before, key) => {
      const val = get(locale, key);
      if (val == null) return match;
      if (/\splaceholder="[^"]*"/.test(match)) {
        return match.replace(/\splaceholder="[^"]*"/, ` placeholder="${val}"`);
      }
      return match + ` placeholder="${val}"`;
    }
  );

  return html;
}

/** Set <html lang="xx"> */
function setHtmlLang(html, lang) {
  return html.replace(/(<html[^>]*)\slang="[^"]*"/, `$1 lang="${LANG_CODE[lang]}"`);
}

/** Read data-i18n-title and data-i18n-desc from <html> tag */
function getPageKeys(html) {
  const titleKey = (html.match(/data-i18n-title="([^"]+)"/) || [])[1] || 'page.title';
  const descKey  = (html.match(/data-i18n-desc="([^"]+)"/)  || [])[1] || 'page.description';
  return { titleKey, descKey };
}

/** Update <title>, og:title, twitter:title */
function setTitle(html, locale, titleKey) {
  const val = get(locale, titleKey);
  if (!val) return html;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${val}</title>`);
  html = html.replace(/(property="og:title"\s+content=")[^"]*(")/,    `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:title")/,    `$1${val}$2`);
  html = html.replace(/(name="twitter:title"\s+content=")[^"]*(")/,   `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="twitter:title")/,   `$1${val}$2`);
  return html;
}

/** Update meta description, og:description, twitter:description */
function setDescription(html, locale, descKey) {
  const val = get(locale, descKey);
  if (!val) return html;
  html = html.replace(/(name="description"\s+content=")[^"]*(")/,         `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="description")/,         `$1${val}$2`);
  html = html.replace(/(property="og:description"\s+content=")[^"]*(")/,  `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:description")/, `$1${val}$2`);
  html = html.replace(/(name="twitter:description"\s+content=")[^"]*(")/,`$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="twitter:description")/, `$1${val}$2`);
  return html;
}

/** Build the hreflang block for a given page */
function buildHreflangBlock(urlPath) {
  const noUrl = `${BASE_URL}${urlPath}`;
  const lines = [
    `  <link rel="alternate" hreflang="x-default" href="${noUrl}" />`,
    `  <link rel="alternate" hreflang="nb"        href="${noUrl}" />`,
    ...LANGS.map(l => `  <link rel="alternate" hreflang="${l}"        href="${fullUrl(l, urlPath)}" />`),
  ];
  return lines.join('\n');
}

/** Replace all hreflang links + canonical + og:url for a generated language file */
function setCanonicalAndHreflang(html, lang, urlPath) {
  const canon = fullUrl(lang, urlPath);

  // Remove duplicate canonicals first, then replace the remaining one
  // Strip ALL existing canonical links
  html = html.replace(/<link rel="canonical"[^>]*\/>\s*/g, '');
  // Strip ALL existing hreflang links
  html = html.replace(/<link rel="alternate"[^>]*\/>\s*/g, '');

  // Insert canonical + hreflang right after <meta charset>
  const newHead = `  <link rel="canonical" href="${canon}" />\n${buildHreflangBlock(urlPath)}\n`;
  html = html.replace(/(<meta charset[^>]*\/>)/, `$1\n${newHead}`);

  // og:url
  html = html.replace(/(property="og:url"\s+content=")[^"]*(")/,  `$1${canon}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:url")/, `$1${canon}$2`);

  return html;
}

/** Update hreflang links in Norwegian source files */
function updateNoHreflang(html, urlPath) {
  const noUrl = `${BASE_URL}${urlPath}`;

  // Remove ALL existing canonical and hreflang
  html = html.replace(/<link rel="canonical"[^>]*\/>\s*/g, '');
  html = html.replace(/<link rel="alternate"[^>]*\/>\s*/g, '');

  const newHead = `  <link rel="canonical" href="${noUrl}" />\n${buildHreflangBlock(urlPath)}\n`;
  html = html.replace(/(<meta charset[^>]*\/>)/, `$1\n${newHead}`);

  // og:url
  html = html.replace(/(property="og:url"\s+content=")[^"]*(")/,  `$1${noUrl}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:url")/, `$1${noUrl}$2`);

  return html;
}

/** Convert relative asset paths to absolute */
function fixAssetPaths(html) {
  return processNonJsonLd(html, text => {
    // Handle ../ and ../../ prefixes (up to 3 levels)
    const dotdot = '(?:(?:\\.\\./){1,3})?';
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(assets/)`, 'g'),   '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(css/)`, 'g'),      '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(js/)`, 'g'),       '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(locales/)`, 'g'),  '$1/$2');
    // favicon.ico (with optional ../ prefix)
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(favicon\\.ico")`, 'g'), '$1/$2');
    return text;
  });
}

/** Add language prefix to internal page links */
function fixInternalLinks(html, lang) {
  return processNonJsonLd(html, text => {
    // Handle href="index.html" (logo link on root page)
    text = text.replace(/href="index\.html"/g, `href="/${lang}/"`);

    // Handle each known internal path
    for (const p of INTERNAL_PATHS) {
      // Exact match: href="/path" - must not already have a lang prefix
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match href="PATH" where PATH is not already prefixed by a lang code
      // Use word boundary approach: match href="<path>" exactly
      const re = new RegExp(`href="${escaped}"`, 'g');
      if (p === '/') {
        // Root: only match href="/" exactly (not href="/something/")
        text = text.replace(/href="\/"/g, `href="/${lang}/"`);
      } else {
        text = text.replace(re, `href="/${lang}${p}"`);
      }
    }

    return text;
  });
}

/** Generate the lang dropdown HTML for a pre-rendered page */
function buildLangDropdown(currentLang, urlPath) {
  const allLangs = ['no', ...LANGS];
  const options = allLangs.map(l => {
    const href = l === 'no' ? `${BASE_URL}${urlPath}` : fullUrl(l, urlPath);
    // Use just the path portion for the href attribute
    const hrefPath = l === 'no' ? urlPath : langUrl(l, urlPath);
    const active = l === currentLang ? ' active' : '';
    return `            <a class="lang-option${active}" href="${hrefPath}" role="menuitem"><span class="lang-flag">${LANG_FLAG[l]}</span> ${LANG_NAME[l]}</a>`;
  });
  return `<div class="lang-dropdown" role="menu">\n${options.join('\n')}\n          </div>`;
}

/** Update the language switcher: replace buttons with links, set current label */
function updateLangSwitcher(html, lang, urlPath) {
  // Update the current language label
  html = html.replace(
    /<span id="lang-current">[^<]*<\/span>/,
    `<span id="lang-current">${LANG_LABEL[lang]}</span>`
  );

  // Replace the lang-dropdown div content
  html = html.replace(
    /<div class="lang-dropdown" role="menu">[\s\S]*?<\/div>/,
    buildLangDropdown(lang, urlPath)
  );

  return html;
}

/** Full transform pipeline for a generated language file */
function transformForLang(html, lang, locale, urlPath) {
  const { titleKey, descKey } = getPageKeys(html);

  html = applyTranslations(html, locale);
  html = setHtmlLang(html, lang);
  html = setTitle(html, locale, titleKey);
  html = setDescription(html, locale, descKey);
  html = setCanonicalAndHreflang(html, lang, urlPath);
  html = fixAssetPaths(html);
  html = fixInternalLinks(html, lang);
  html = updateLangSwitcher(html, lang, urlPath);

  return html;
}

// ─── Output path calculation ──────────────────────────────────────────────────

/**
 * Given a source file path and a target language, return the output file path
 * relative to ROOT (e.g. "en/care-schedule/index.html")
 */
function outPath(src, lang) {
  // src is like "care-schedule/index.html" or "professionals.html"
  return path.join(lang, src);
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function buildSitemap() {
  const urls = SOURCE_FILES.map(({ urlPath, priority }) => {
    const noUrl  = `${BASE_URL}${urlPath}`;
    const hreflangLinks = [
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${noUrl}"/>`,
      `      <xhtml:link rel="alternate" hreflang="nb"        href="${noUrl}"/>`,
      ...LANGS.map(l => `      <xhtml:link rel="alternate" hreflang="${l}"        href="${fullUrl(l, urlPath)}"/>`),
    ].join('\n');

    return `  <url>
    <loc>${noUrl}</loc>
${hreflangLinks}
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Load locale files
  const locales = {};
  for (const lang of LANGS) {
    const p = path.join(ROOT, 'locales', `${lang}.json`);
    locales[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`Loaded locale: ${lang}`);
  }

  // Process each source file
  for (const file of SOURCE_FILES) {
    const srcPath = path.join(ROOT, file.src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  SKIP (not found): ${file.src}`);
      continue;
    }
    const sourceHtml = fs.readFileSync(srcPath, 'utf8');

    // 1. Update hreflang tags in the Norwegian source file
    const updatedNo = updateNoHreflang(sourceHtml, file.urlPath);
    fs.writeFileSync(srcPath, updatedNo, 'utf8');
    console.log(`Updated hreflang: ${file.src}`);

    // 2. Generate one file per language
    for (const lang of LANGS) {
      const generated = transformForLang(updatedNo, lang, locales[lang], file.urlPath);

      const outFile = path.join(ROOT, outPath(file.src, lang));
      mkdirp(path.dirname(outFile));
      fs.writeFileSync(outFile, generated, 'utf8');
      console.log(`  → ${outPath(file.src, lang)}`);
    }
  }

  // Generate sitemap.xml
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildSitemap(), 'utf8');
  console.log('Generated: sitemap.xml');

  console.log('\nDone.');
}

main();
