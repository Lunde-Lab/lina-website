#!/usr/bin/env node
'use strict';

/**
 * build-i18n.js
 *
 * 1. Updates all Norwegian source HTML files (hreflang, absolute asset paths,
 *    logo link, lang-dropdown → <a> links, minimal lang-switcher script).
 * 2. Generates pre-rendered copies for en / sv / da / fi.
 * 3. Writes sitemap.xml with full hreflang support.
 *
 * Safety: section-tag counts are verified before every write.
 * Aborts the affected file (not the whole build) on mismatch.
 *
 * langUrls support: SOURCE_FILES entries may include a `langUrls` map of
 * { lang: '/slug/' } to override the default /{lang}{urlPath} pattern.
 * Used for blog articles with per-language URL slugs.
 */

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT     = path.resolve(__dirname, '..');
const BASE_URL = 'https://getlina.app';
const LANGS    = ['en', 'sv', 'da', 'fi', 'de', 'nl'];
const ALL_LANGS = ['no', ...LANGS];

const LANG_HTMLCODE = { no: 'nb', en: 'en', sv: 'sv', da: 'da', fi: 'fi', de: 'de', nl: 'nl' };
const LANG_LABEL    = { no: 'NO', en: 'EN', sv: 'SV', da: 'DA', fi: 'FI', de: 'DE', nl: 'NL' };
const LANG_FLAG     = { no: '🇳🇴', en: '🇬🇧', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', de: '🇩🇪', nl: '🇳🇱' };
const LANG_NAME     = { no: 'Norsk', en: 'English', sv: 'Svenska', da: 'Dansk', fi: 'Suomi', de: 'Deutsch', nl: 'Nederlands' };

const SOURCE_FILES = [
  { src: 'index.html',                urlPath: '/',                   priority: '1.0', hasDropdown: true  },
  { src: 'care-schedule/index.html',  urlPath: '/care-schedule/',     priority: '0.8', hasDropdown: true  },
  { src: 'care-agreement/index.html', urlPath: '/care-agreement/',    priority: '0.7', hasDropdown: true  },
  { src: 'about/index.html',          urlPath: '/about/',             priority: '0.7', hasDropdown: true  },
  { src: 'faq/index.html',            urlPath: '/faq/',               priority: '0.7', hasDropdown: true  },
  { src: 'pricing/index.html',        urlPath: '/pricing/',           priority: '0.8', hasDropdown: true  },
  { src: 'stories/index.html',        urlPath: '/stories/',           priority: '0.6', hasDropdown: true  },
  { src: 'professionals.html',        urlPath: '/professionals.html', priority: '0.7', hasDropdown: true  },
  { src: 'contact.html',              urlPath: '/contact.html',       priority: '0.5', hasDropdown: false },
  { src: 'terms/index.html',          urlPath: '/terms/',              priority: '0.3' },
  { src: 'privacy/index.html',        urlPath: '/privacy/',            priority: '0.3' },
  { src: 'account-deletion.html',     urlPath: '/account-deletion.html', priority: '0.3' },
  { src: 'blog/index.html',           urlPath: '/blog/',                 priority: '0.5', hasDropdown: true },
  {
    src: 'blog/samvaersordninger/index.html',
    urlPath: '/blog/samvaersordninger/',
    langUrls: {
      en: '/blog/custody-schedules/',
      sv: '/blog/umgangesschema/',
      da: '/blog/samvaersordning/',
      fi: '/blog/vuoroasuminen/',
      de: '/blog/umgangsregelung/',
      nl: '/blog/omgangsregeling/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/byttedag/index.html',
    urlPath: '/blog/byttedag/',
    langUrls: {
      en: '/blog/handover-day/',
      sv: '/blog/overlamningsdag/',
      da: '/blog/byttedag-tips/',
      fi: '/blog/vaihtopaiva/',
      de: '/blog/uebergabetag/',
      nl: '/blog/wisseldag/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/utstyr-to-hjem/index.html',
    urlPath: '/blog/utstyr-to-hjem/',
    langUrls: {
      en: '/blog/what-kids-need/',
      sv: '/blog/vad-barnet-behover/',
      da: '/blog/hvad-barnet-har-brug-for/',
      fi: '/blog/mita-lapsi-tarvitsee/',
      de: '/blog/was-kinder-brauchen/',
      nl: '/blog/wat-kinderen-nodig-hebben/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/delt-bosted/index.html',
    urlPath: '/blog/delt-bosted/',
    langUrls: {
      en: '/blog/shared-vs-primary-residence/',
      sv: '/blog/vaxelvis-vs-fast-boende/',
      da: '/blog/delt-vs-fast-bopael/',
      fi: '/blog/vuoroasuminen-vs-lahivanhemmuus/',
      de: '/blog/wechselmodell-vs-residenzmodell/',
      nl: '/blog/co-ouderschap-vs-hoofdverblijf/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/kommunikasjon/index.html',
    urlPath: '/blog/kommunikasjon/',
    langUrls: {
      en: '/blog/co-parent-communication/',
      sv: '/blog/kommunikation-delad-omsorg/',
      da: '/blog/kommunikation-delt-omsorg/',
      fi: '/blog/yhteishuoltajuus-viestinta/',
      de: '/blog/kommunikation-getrennte-eltern/',
      nl: '/blog/communicatie-gescheiden-ouders/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
];

// Exact internal hrefs that should receive a /LANG/ prefix in generated files.
// Order: longer/specific paths before shorter ones to avoid partial overlaps.
const INTERNAL_HREFS = [
  '/care-schedule/',
  '/care-agreement/',
  '/account-deletion.html',
  '/professionals.html',
  '/contact.html',
  '/privacy/',
  '/pricing/',
  '/stories/',
  '/terms/',
  '/about/',
  '/faq/',
  '/blog/',
  '/blog',
  '/blog/kommunikasjon/',
  '/blog/kommunikasjon',
  '/blog/delt-bosted/',
  '/blog/delt-bosted',
  '/blog/utstyr-to-hjem/',
  '/blog/utstyr-to-hjem',
  '/blog/byttedag/',
  '/blog/byttedag',
  '/blog/samvaersordninger/',
  '/blog/samvaersordninger',
  '/care-schedule',
  '/care-agreement',
  '/privacy',
  '/pricing',
  '/terms',
  '/stories',
  '/about',
  '/faq',
];

// The new minimal lang-switcher IIFE (replaces old one with linaSetLang).
// Deliberately uses `var` to avoid any let/const edge cases in older browsers.
const NEW_LANG_IIFE = `(function () {
    var switcher = document.getElementById('lang-switcher');
    var btn = document.getElementById('lang-btn');
    if (!switcher || !btn) return;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var open = switcher.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function(e) {
      if (!switcher.contains(e.target)) {
        switcher.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }())`;

// ─── Utility helpers ─────────────────────────────────────────────────────────

function get(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** URL for a given language + page path (no langUrls awareness — base helper) */
function pageUrl(lang, urlPath) {
  const prefix = lang === 'no' ? '' : `/${lang}`;
  return `${BASE_URL}${prefix}${urlPath}`;
}

/** URL path string (no BASE_URL) for a language, respecting langUrls */
function langUrl(lang, urlPath, file) {
  if (lang !== 'no' && file && file.langUrls && file.langUrls[lang]) {
    return `/${lang}${file.langUrls[lang]}`;
  }
  return lang === 'no' ? urlPath : `/${lang}${urlPath}`;
}

/** Full URL (with BASE_URL) for a language, respecting langUrls */
function fullUrl(lang, urlPath, file) {
  return `${BASE_URL}${langUrl(lang, urlPath, file)}`;
}

/** Output file path for a generated language version, respecting langUrls */
function outPath(src, lang, file) {
  if (file && file.langUrls && file.langUrls[lang]) {
    const slug    = file.langUrls[lang].replace(/^\//, '');
    const relPath = slug.endsWith('/') ? slug + 'index.html' : slug;
    return path.join(ROOT, lang, relPath);
  }
  return path.join(ROOT, lang, src);
}

/** Count occurrences of a plain string */
function countStr(html, needle) {
  let n = 0, pos = 0;
  while ((pos = html.indexOf(needle, pos)) !== -1) { n++; pos += needle.length; }
  return n;
}

// ─── JSON-LD protection ───────────────────────────────────────────────────────

/**
 * Split HTML into segments.  JSON-LD <script> blocks are returned as-is;
 * all other segments are passed through fn() for transformation.
 */
function processNonJsonLd(html, fn) {
  const parts = [];
  let last = 0;
  // Non-greedy match of entire <script type="application/ld+json">…</script>
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) parts.push(fn(html.slice(last, m.index)));
    parts.push(m[0]);          // keep JSON-LD block verbatim
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push(fn(html.slice(last)));
  return parts.join('');
}

// ─── JSON-LD localization ─────────────────────────────────────────────────────

const FAQ_MAP = {
  'index.html':                'indexFaq',
  'faq/index.html':            'faqFaq',
  'care-schedule/index.html':  'csFaq',
  'care-agreement/index.html': 'caFaq',
  'pricing/index.html':        'pricingFaq',
};

/**
 * Replace JSON-LD block content with localized values from locale.jsonLd.
 * - MobileApplication: replace description
 * - Organization: leave unchanged (language-independent)
 * - FAQPage: replace mainEntity with localized Q&A from the matching array
 */
function localizeJsonLd(html, locale, srcFile) {
  if (!locale.jsonLd) return html;
  const re = /(<script[^>]+type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  return html.replace(re, (fullMatch, open, jsonStr, close) => {
    let data;
    try { data = JSON.parse(jsonStr); } catch (e) { return fullMatch; }
    const type = data['@type'];
    if (type === 'MobileApplication' && locale.jsonLd.app) {
      data.description = locale.jsonLd.app.description;
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    }
    if (type === 'Organization') return fullMatch;
    if (type === 'FAQPage') {
      const faqKey = FAQ_MAP[srcFile];
      const items  = faqKey && locale.jsonLd[faqKey];
      if (!items) return fullMatch;
      data.mainEntity = items.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      }));
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    }
    return fullMatch;
  });
}

// ─── Individual transforms ────────────────────────────────────────────────────

/**
 * Apply locale translations:
 *   data-i18n          → replace text content between > and next <
 *   data-i18n-aria     → update aria-label
 *   data-i18n-placeholder → update placeholder
 */
function applyTranslations(html, locale) {
  // data-i18n text content  — [^<]* stops at the first child tag (safe)
  html = html.replace(
    /(<[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)/g,
    (m, openTag, key, _old) => {
      const val = get(locale, key);
      return val != null ? openTag + val : m;
    }
  );

  // data-i18n-aria — update aria-label on the same tag line
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-aria="([^"]+)"[^\n>]*)/g,
    (m, _before, key) => {
      const val = get(locale, key);
      if (val == null) return m;
      return /\saria-label="[^"]*"/.test(m)
        ? m.replace(/\saria-label="[^"]*"/, ` aria-label="${val}"`)
        : m + ` aria-label="${val}"`;
    }
  );

  // data-i18n-placeholder
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-placeholder="([^"]+)"[^\n>]*)/g,
    (m, _before, key) => {
      const val = get(locale, key);
      if (val == null) return m;
      return /\splaceholder="[^"]*"/.test(m)
        ? m.replace(/\splaceholder="[^"]*"/, ` placeholder="${val}"`)
        : m + ` placeholder="${val}"`;
    }
  );

  return html;
}

/** Set <html lang="xx"> */
function setHtmlLang(html, lang) {
  return html.replace(
    /(<html[^>]*)\slang="[^"]*"/,
    `$1 lang="${LANG_HTMLCODE[lang]}"`
  );
}

/** Read data-i18n-title / data-i18n-desc keys from the <html> tag */
function getPageKeys(html) {
  return {
    titleKey: (html.match(/data-i18n-title="([^"]+)"/) || [])[1] || 'page.title',
    descKey:  (html.match(/data-i18n-desc="([^"]+)"/)  || [])[1] || 'page.description',
  };
}

/** Update <title> and all social-meta title tags */
function setTitle(html, locale, titleKey) {
  const val = get(locale, titleKey);
  if (!val) return html;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${val}</title>`);
  html = html.replace(/(property="og:title"\s+content=")[^"]*(")/,  `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:title")/,  `$1${val}$2`);
  html = html.replace(/(name="twitter:title"\s+content=")[^"]*(")/,  `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="twitter:title")/, `$1${val}$2`);
  return html;
}

/** Update meta description and all social-meta description tags */
function setDescription(html, locale, descKey) {
  const val = get(locale, descKey);
  if (!val) return html;
  html = html.replace(/(name="description"\s+content=")[^"]*(")/,          `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="description")/,          `$1${val}$2`);
  html = html.replace(/(property="og:description"\s+content=")[^"]*(")/,   `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:description")/,   `$1${val}$2`);
  html = html.replace(/(name="twitter:description"\s+content=")[^"]*(")/,  `$1${val}$2`);
  html = html.replace(/(content=")[^"]*("\s+name="twitter:description")/, `$1${val}$2`);
  return html;
}

/** Remove all existing canonical + alternate links, insert correct block */
function setCanonicalAndHreflang(html, lang, urlPath, file) {
  const canon  = fullUrl(lang, urlPath, file);
  const noUrl  = fullUrl('no', urlPath, file);

  // Wipe existing (handles duplicates automatically)
  html = html.replace(/<link rel="canonical"[^>]*\/>\s*/g, '');
  html = html.replace(/<link rel="alternate"[^>]*\/>\s*/g, '');

  const hreflang = LANGS.map(l =>
    `  <link rel="alternate" hreflang="${l}"        href="${fullUrl(l, urlPath, file)}" />`
  ).join('\n');

  const block =
    `  <link rel="canonical" href="${canon}" />\n` +
    `  <link rel="alternate" hreflang="x-default" href="${noUrl}" />\n` +
    `  <link rel="alternate" hreflang="nb"        href="${noUrl}" />\n` +
    hreflang + '\n';

  html = html.replace(/(<meta charset[^>]*\/>)/, `$1\n${block}`);

  // og:url
  html = html.replace(/(property="og:url"\s+content=")[^"]*(")/,  `$1${canon}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:url")/, `$1${canon}$2`);

  return html;
}

/**
 * Convert relative asset / css / js / favicon / srcset paths to absolute.
 * Handles 0–3 levels of ../ prefix.
 * Skips JSON-LD blocks via processNonJsonLd.
 */
function fixAssetPaths(html) {
  // In a JS string '\\.' == backslash+dot; as a RegExp pattern that matches literal '.'
  // '(?:(?:\\.\\./){0,3})' → regex (?:(?:\.\./){0,3}) → matches 0-3 x '../'
  const dd = '(?:(?:\\.\\./){0,3})';

  return processNonJsonLd(html, text => {
    // src / href attributes
    text = text.replace(new RegExp(`((?:src|href)=")${dd}(assets/)`,  'g'), '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dd}(css/)`,     'g'), '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dd}(js/)`,      'g'), '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dd}(locales/)`, 'g'), '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dd}(favicon\\.ico")`, 'g'), '$1/$2');
    // srcset attribute  ← critical for <picture><source srcset="...">
    text = text.replace(new RegExp(`(srcset=")${dd}(assets/)`, 'g'), '$1/$2');
    return text;
  });
}

/**
 * Fix the logo <a href="…"> to point at the correct root for the target lang.
 * Matches any href value on the <a> tag that wraps a Logomark image.
 */
function fixLogoLink(html, lang) {
  const target = lang === 'no' ? '/' : `/${lang}/`;
  // Replace href value on the <a> tag immediately wrapping a Logomark img
  return html.replace(
    /(<a\s[^>]*href=")[^"]*("[^>]*>\s*<img[^>]*Logomark[^>]*>)/g,
    `$1${target}$2`
  );
}

/**
 * Add /LANG/ prefix to known internal page hrefs.
 * Only called for generated (non-Norwegian) files.
 * Skips JSON-LD, external URLs, and asset paths.
 */
function fixInternalLinks(html, lang) {
  return processNonJsonLd(html, text => {
    // Relative logo-style link
    text = text.replace(/href="index\.html"/g, `href="/${lang}/"`);
    // Exact root href
    text = text.replace(/href="\/"/g, `href="/${lang}/"`);
    // Known page paths
    for (const p of INTERNAL_HREFS) {
      const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`href="${esc}"`, 'g'), `href="/${lang}${p}"`);
    }
    return text;
  });
}

/**
 * Replace Norwegian blog slugs with language-specific equivalents.
 * Called after fixInternalLinks, which has already prefixed them with /{lang}.
 * Example (EN): href="/en/blog/samvaersordninger/" → href="/en/blog/custody-schedules/"
 * Only called for generated (non-Norwegian) files when the file has langUrls.
 */
function fixBlogLinks(html, lang) {
  return processNonJsonLd(html, text => {
    for (const file of SOURCE_FILES) {
      if (!file.langUrls || !file.langUrls[lang]) continue;
      const prefixedNo   = `/${lang}${file.urlPath}`;
      const prefixedLang = `/${lang}${file.langUrls[lang]}`;
      const esc = prefixedNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`href="${esc}"`, 'g'), `href="${prefixedLang}"`);
    }
    return text;
  });
}

/** Generate the lang-dropdown <div> with <a> links */
function buildLangDropdown(currentLang, urlPath, file) {
  const items = ALL_LANGS.map(l => {
    const href   = langUrl(l, urlPath, file);
    const active = l === currentLang ? ' active' : '';
    return `            <a class="lang-option${active}" href="${href}" role="menuitem">` +
           `<span class="lang-flag">${LANG_FLAG[l]}</span> ${LANG_NAME[l]}</a>`;
  });
  return (
    `<div class="lang-dropdown" role="menu">\n` +
    items.join('\n') + '\n' +
    `          </div>`
  );
}

/** Replace button-based lang-dropdown with link-based one, update #lang-current */
function fixLangSwitcher(html, lang, urlPath, file) {
  // Replace the dropdown div (non-greedy [\s\S]*? stops at first </div>)
  html = html.replace(
    /<div class="lang-dropdown" role="menu">[\s\S]*?<\/div>/,
    buildLangDropdown(lang, urlPath, file)
  );
  // Update the displayed language label
  html = html.replace(
    /<span id="lang-current">[^<]*<\/span>/,
    `<span id="lang-current">${LANG_LABEL[lang]}</span>`
  );
  return html;
}

/**
 * Replace the old lang-switcher IIFE with the new minimal version.
 *
 * Strategy: iterate over each <script>...</script> block, find the one
 * containing getElementById('lang-btn') or getElementById('lang-switcher'),
 * and replace only the IIFE within that block. This prevents the IIFE regex
 * from accidentally crossing <script> block boundaries.
 *
 * If no matching block is found (e.g. contact.html), returns html unchanged.
 */
function fixLangScript(html) {
  const scriptBlockRe = /(<script[^>]*>)([\s\S]*?)(<\/script>)/g;
  const langIdRe = /getElementById\(['"](lang-btn|lang-switcher)['"]\)/;
  const iifeRe = /\(function\s*\(\s*\)\s*\{[\s\S]*?(?:\}\s*\(\s*\)\s*\)|\}\s*\)\s*\(\s*\))\s*;/;
  let replaced = false;
  return html.replace(scriptBlockRe, (fullMatch, open, body, close) => {
    if (replaced || !langIdRe.test(body)) return fullMatch;
    const newBody = body.replace(iifeRe, NEW_LANG_IIFE + ';');
    if (newBody === body) return fullMatch;
    replaced = true;
    return open + newBody + close;
  });
}

// ─── Safety gate ─────────────────────────────────────────────────────────────

/**
 * Returns true if the output HTML passes all structural checks.
 * On failure, logs a descriptive error and returns false.
 */
function safetyCheck(srcHtml, outHtml, label) {
  const check = (needle, name) => {
    const a = countStr(srcHtml, needle);
    const b = countStr(outHtml, needle);
    if (a !== b) {
      console.error(`  ✖ SAFETY [${label}]: "${name}" count changed ${a} → ${b}`);
      return false;
    }
    return true;
  };

  if (!check('<section',  '<section'))  return false;
  if (!check('</section>', '</section>')) return false;

  const ratio = outHtml.length / srcHtml.length;
  if (ratio < 0.80 || ratio > 1.25) {
    console.error(
      `  ✖ SAFETY [${label}]: file size ratio ${(ratio * 100).toFixed(1)}% ` +
      `(expected 80–125%)`
    );
    return false;
  }

  return true;
}

// ─── Per-file pipelines ───────────────────────────────────────────────────────

/** Transform source HTML into a Norwegian version (minimal updates only) */
function buildNorwegian(srcHtml, urlPath, hasDropdown, locale, srcFile, file) {
  let html = srcHtml;
  html = localizeJsonLd(html, locale, srcFile);
  html = setCanonicalAndHreflang(html, 'no', urlPath, file);
  html = fixAssetPaths(html);
  html = fixLogoLink(html, 'no');
  if (hasDropdown) html = fixLangSwitcher(html, 'no', urlPath, file);
  html = fixLangScript(html);
  return html;
}

/** Transform Norwegian HTML into a fully translated version for `lang` */
function buildForLang(noHtml, lang, locale, urlPath, hasDropdown, srcFile, file) {
  const { titleKey, descKey } = getPageKeys(noHtml);
  let html = noHtml;
  html = applyTranslations(html, locale);
  html = localizeJsonLd(html, locale, srcFile);
  html = setHtmlLang(html, lang);
  html = setTitle(html, locale, titleKey);
  html = setDescription(html, locale, descKey);
  html = setCanonicalAndHreflang(html, lang, urlPath, file);
  // Asset paths are already absolute after the Norwegian pass
  html = fixInternalLinks(html, lang);
  html = fixBlogLinks(html, lang);
  html = fixLogoLink(html, lang);
  if (hasDropdown) html = fixLangSwitcher(html, lang, urlPath, file);
  html = fixLangScript(html);
  return html;
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function buildSitemap() {
  const urlEntries = [];

  for (const { urlPath, priority, langUrls } of SOURCE_FILES) {
    const noUrl = pageUrl('no', urlPath);

    if (langUrls) {
      // Blog-style pages: each language has a different slug, so each gets
      // its own <url> entry. All entries share the same full hreflang set.
      const makeLinks = () => [
        `      <xhtml:link rel="alternate" hreflang="x-default" href="${noUrl}"/>`,
        `      <xhtml:link rel="alternate" hreflang="nb"        href="${noUrl}"/>`,
        ...LANGS.map(l => {
          const lUrl = `${BASE_URL}/${l}${langUrls[l]}`;
          return `      <xhtml:link rel="alternate" hreflang="${l}"        href="${lUrl}"/>`;
        }),
      ].join('\n');

      // Norwegian entry
      urlEntries.push(
        `  <url>\n` +
        `    <loc>${noUrl}</loc>\n` +
        makeLinks() + '\n' +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`
      );

      // Per-language entries
      for (const lang of LANGS) {
        const lUrl = `${BASE_URL}/${lang}${langUrls[lang]}`;
        urlEntries.push(
          `  <url>\n` +
          `    <loc>${lUrl}</loc>\n` +
          makeLinks() + '\n' +
          `    <changefreq>monthly</changefreq>\n` +
          `    <priority>${priority}</priority>\n` +
          `  </url>`
        );
      }
    } else {
      // Standard pages: one entry with all alternates
      const links = [
        `      <xhtml:link rel="alternate" hreflang="x-default" href="${noUrl}"/>`,
        `      <xhtml:link rel="alternate" hreflang="nb"        href="${noUrl}"/>`,
        ...LANGS.map(l =>
          `      <xhtml:link rel="alternate" hreflang="${l}"        href="${pageUrl(l, urlPath)}"/>`
        ),
      ].join('\n');

      urlEntries.push(
        `  <url>\n` +
        `    <loc>${noUrl}</loc>\n` +
        links + '\n' +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`
      );
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urlEntries.join('\n') + '\n' +
    `</urlset>\n`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Load all locales (including Norwegian for JSON-LD localization)
  const noLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'no.json'), 'utf8'));
  console.log('Loaded locale: no');
  const locales = {};
  for (const lang of LANGS) {
    const p = path.join(ROOT, 'locales', `${lang}.json`);
    locales[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`Loaded locale: ${lang}`);
  }

  let errors = 0;

  for (const file of SOURCE_FILES) {
    const { src, urlPath, hasDropdown } = file;
    const srcPath = path.join(ROOT, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`SKIP (not found): ${src}`);
      continue;
    }

    const originalHtml = fs.readFileSync(srcPath, 'utf8');
    const origSections = countStr(originalHtml, '<section');

    // ── Step 1: build updated Norwegian source ─────────────────────────────
    const noHtml = buildNorwegian(originalHtml, urlPath, hasDropdown, noLocale, src, file);

    if (!safetyCheck(originalHtml, noHtml, `${src} [no]`)) {
      console.error(`  ABORT: skipping write of ${src}`);
      errors++;
      continue;
    }

    fs.writeFileSync(srcPath, noHtml, 'utf8');
    console.log(`Updated (no): ${src}  [${origSections} sections ✓]`);

    // ── Step 2: generate language versions ────────────────────────────────
    for (const lang of LANGS) {
      const outHtml = buildForLang(noHtml, lang, locales[lang], urlPath, hasDropdown, src, file);

      if (!safetyCheck(originalHtml, outHtml, `${src} [${lang}]`)) {
        console.error(`  ABORT: skipping ${lang}/${src}`);
        errors++;
        continue;
      }

      const outFile = outPath(src, lang, file);
      mkdirp(path.dirname(outFile));
      fs.writeFileSync(outFile, outHtml, 'utf8');
      console.log(`  → ${outFile.replace(ROOT + path.sep, '')}`);
    }
  }

  // ── Sitemap ───────────────────────────────────────────────────────────────
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildSitemap(), 'utf8');
  console.log('Generated: sitemap.xml');

  if (errors > 0) {
    console.error(`\n⚠  Build finished with ${errors} error(s). Review output above.`);
    process.exitCode = 1;
  } else {
    console.log('\nDone ✓');
  }
}

main();
