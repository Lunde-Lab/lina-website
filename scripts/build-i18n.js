#!/usr/bin/env node
'use strict';

/**
 * build-i18n.js
 *
 * 1. Updates all English source HTML files (hreflang, absolute asset paths,
 *    logo link, lang-dropdown → <a> links, minimal lang-switcher script).
 * 2. Generates pre-rendered copies for no / sv / da / fi / de / nl / fr.
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
const LANGS    = ['no', 'sv', 'da', 'fi', 'de', 'nl', 'fr'];
const ALL_LANGS = ['en', ...LANGS];

const LANG_HTMLCODE = { en: 'en', no: 'nb', sv: 'sv', da: 'da', fi: 'fi', de: 'de', nl: 'nl', fr: 'fr' };
const LANG_LABEL    = { en: 'EN', no: 'NO', sv: 'SV', da: 'DA', fi: 'FI', de: 'DE', nl: 'NL', fr: 'FR' };
const LANG_FLAG     = { en: '🇬🇧', no: '🇳🇴', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', de: '🇩🇪', nl: '🇳🇱', fr: '🇫🇷' };
const LANG_NAME     = { en: 'English', no: 'Norsk', sv: 'Svenska', da: 'Dansk', fi: 'Suomi', de: 'Deutsch', nl: 'Nederlands', fr: 'Français' };
const OG_LOCALE     = { en: 'en_US', no: 'nb_NO', sv: 'sv_SE', da: 'da_DK', fi: 'fi_FI', de: 'de_DE', nl: 'nl_NL', fr: 'fr_FR' };

const SOURCE_FILES = [
  { src: 'index.html',                urlPath: '/',                   priority: '1.0', hasDropdown: true  },
  { src: 'care-schedule/index.html',  urlPath: '/care-schedule/',     priority: '0.8', hasDropdown: true  },
  { src: 'care-agreement/index.html', urlPath: '/care-agreement/',    priority: '0.7', hasDropdown: true  },
  { src: 'about/index.html',          urlPath: '/about/',             priority: '0.7', hasDropdown: true  },
  { src: 'faq/index.html',            urlPath: '/faq/',               priority: '0.7', hasDropdown: true  },
  { src: 'pricing/index.html',        urlPath: '/pricing/',           priority: '0.8', hasDropdown: true  },
  { src: 'stories/index.html',        urlPath: '/stories/',           priority: '0.6', hasDropdown: true  },
  {
    src: 'research/index.html',
    urlPath: '/research/',
    langUrls: {
      no: '/forskning/',
      sv: '/forskning/',
      da: '/forskning/',
      fi: '/tutkimus/',
      de: '/forschung/',
      nl: '/onderzoek/',
      fr: '/recherche/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  { src: 'professionals/index.html',  urlPath: '/professionals/',     priority: '0.7', hasDropdown: true  },
  { src: 'contact/index.html',        urlPath: '/contact/',           priority: '0.5', hasDropdown: false },
  { src: 'terms/index.html',          urlPath: '/terms/',              priority: '0.3' },
  { src: 'privacy/index.html',        urlPath: '/privacy/',            priority: '0.3' },
  { src: 'account-deletion.html',     urlPath: '/account-deletion.html', priority: '0.3' },
  { src: '404.html',                  urlPath: '/404.html',              priority: '0.1' },
  { src: 'blog/index.html',           urlPath: '/blog/',                 priority: '0.5', hasDropdown: true },
  {
    src: 'blog/custody-schedules/index.html',
    urlPath: '/blog/custody-schedules/',
    langUrls: {
      no: '/blog/samvaersordninger/',
      sv: '/blog/umgangesschema/',
      da: '/blog/samvaersordning/',
      fi: '/blog/vuoroasuminen/',
      de: '/blog/umgangsregelung/',
      nl: '/blog/omgangsregeling/',
      fr: '/blog/modes-de-garde/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/handover-day/index.html',
    urlPath: '/blog/handover-day/',
    langUrls: {
      no: '/blog/byttedag/',
      sv: '/blog/overlamningsdag/',
      da: '/blog/byttedag-tips/',
      fi: '/blog/vaihtopaiva/',
      de: '/blog/uebergabetag/',
      nl: '/blog/wisseldag/',
      fr: '/blog/jour-de-transition/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/what-kids-need/index.html',
    urlPath: '/blog/what-kids-need/',
    langUrls: {
      no: '/blog/utstyr-to-hjem/',
      sv: '/blog/vad-barnet-behover/',
      da: '/blog/hvad-barnet-har-brug-for/',
      fi: '/blog/mita-lapsi-tarvitsee/',
      de: '/blog/was-kinder-brauchen/',
      nl: '/blog/wat-kinderen-nodig-hebben/',
      fr: '/blog/ce-dont-lenfant-a-besoin/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/shared-vs-primary-residence/index.html',
    urlPath: '/blog/shared-vs-primary-residence/',
    langUrls: {
      no: '/blog/delt-bosted/',
      sv: '/blog/vaxelvis-vs-fast-boende/',
      da: '/blog/delt-vs-fast-bopael/',
      fi: '/blog/vuoroasuminen-vs-lahivanhemmuus/',
      de: '/blog/wechselmodell-vs-residenzmodell/',
      nl: '/blog/co-ouderschap-vs-hoofdverblijf/',
      fr: '/blog/residence-alternee-vs-principale/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/co-parent-communication/index.html',
    urlPath: '/blog/co-parent-communication/',
    langUrls: {
      no: '/blog/kommunikasjon/',
      sv: '/blog/kommunikation-delad-omsorg/',
      da: '/blog/kommunikation-delt-omsorg/',
      fi: '/blog/yhteishuoltajuus-viestinta/',
      de: '/blog/kommunikation-getrennte-eltern/',
      nl: '/blog/communicatie-gescheiden-ouders/',
      fr: '/blog/communication-entre-coparents/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/summer-holidays/index.html',
    urlPath: '/blog/summer-holidays/',
    langUrls: {
      no: '/blog/sommerferie-to-hjem/',
      sv: '/blog/sommarlov-tva-hem/',
      da: '/blog/sommerferie-to-hjem/',
      fi: '/blog/kesaloma-kahdessa-kodissa/',
      de: '/blog/sommerferien-zwei-zuhause/',
      nl: '/blog/zomervakantie-twee-huizen/',
      fr: '/blog/vacances-ete-deux-maisons/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/starting-co-parenting/index.html',
    urlPath: '/blog/starting-co-parenting/',
    langUrls: {
      no: '/blog/samarbeid-etter-samlivsbrudd/',
      sv: '/blog/samarbete-efter-separation/',
      da: '/blog/samarbejde-efter-separation/',
      fi: '/blog/eron-jalkeen-yhteistyo/',
      de: '/blog/co-parenting-nach-trennung/',
      nl: '/blog/co-ouderschap-na-scheiding/',
      fr: '/blog/coparentalite-apres-separation/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/writing-care-agreement/index.html',
    urlPath: '/blog/writing-care-agreement/',
    langUrls: {
      no: '/blog/samvaersavtale/',
      sv: '/blog/varnadsavtal/',
      da: '/blog/samvaersaftale/',
      fi: '/blog/huoltosopimus/',
      de: '/blog/umgangsvereinbarung/',
      nl: '/blog/ouderschapsplan/',
      fr: '/blog/convention-parentale/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
  {
    src: 'blog/birthdays-two-homes/index.html',
    urlPath: '/blog/birthdays-two-homes/',
    langUrls: {
      no: '/blog/bursdag-to-hjem/',
      sv: '/blog/fodelsedag-tva-hem/',
      da: '/blog/fodselsdag-to-hjem/',
      fi: '/blog/syntymapaiva-kahdessa-kodissa/',
      de: '/blog/geburtstag-zwei-zuhause/',
      nl: '/blog/verjaardag-twee-huizen/',
      fr: '/blog/anniversaire-deux-maisons/',
    },
    priority: '0.6',
    hasDropdown: true,
  },
];

// ─── Extra German-only blog slugs ─────────────────────────────────────────────
// These are ADDITIONAL pages targeting specific German search keywords.
// Each is built from the de/ version of the base file, with a new canonical URL.
// The hreflang blocks in these files point the de/de-AT/de-CH variants at the
// extra slug, while all other languages keep their regular URLs.
const DE_EXTRA_SLUGS = [
  {
    baseSrc: 'blog/shared-vs-primary-residence/index.html',
    extraSlug: '/blog/sorgerecht-nach-trennung/',
  },
  {
    baseSrc: 'blog/co-parent-communication/index.html',
    extraSlug: '/blog/eltern-app-trennung/',
  },
  {
    baseSrc: 'blog/what-kids-need/index.html',
    extraSlug: '/blog/kindeswohl-getrennte-eltern/',
  },
];

// Pages that are built and localised but must NOT appear in sitemap.xml
// (transactional / deep-link pages with no SEO value)
const SITEMAP_EXCLUDE = new Set([
  '/account-deletion.html',
  '/email-changed.html',
  '/404.html',
]);

// Pages whose localized versions canonical to the English URL.
// Legal pages have English body text across all locales, so we consolidate
// them with Google rather than have duplicate-content warnings.
const CROSS_LANG_CANONICAL = new Set([
  '/terms/',
  '/privacy/',
]);

// Exact internal hrefs that should receive a /LANG/ prefix in generated files.
// Order: longer/specific paths before shorter ones to avoid partial overlaps.
const INTERNAL_HREFS = [
  '/care-schedule/',
  '/care-agreement/',
  '/account-deletion.html',
  '/professionals/',
  '/professionals',
  '/contact/',
  '/contact',
  '/privacy/',
  '/pricing/',
  '/research/',
  '/research',
  '/stories/',
  '/terms/',
  '/about/',
  '/faq/',
  '/blog/',
  '/blog',
  '/blog/co-parent-communication/',
  '/blog/co-parent-communication',
  '/blog/starting-co-parenting/',
  '/blog/starting-co-parenting',
  '/blog/writing-care-agreement/',
  '/blog/writing-care-agreement',
  '/blog/birthdays-two-homes/',
  '/blog/birthdays-two-homes',
  '/blog/summer-holidays/',
  '/blog/summer-holidays',
  '/blog/shared-vs-primary-residence/',
  '/blog/shared-vs-primary-residence',
  '/blog/what-kids-need/',
  '/blog/what-kids-need',
  '/blog/handover-day/',
  '/blog/handover-day',
  '/blog/custody-schedules/',
  '/blog/custody-schedules',
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
    var K = 'lina_lang';
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
    // Persist manual language selection so the redirect respects the user's choice
    var opts = switcher.querySelectorAll('.lang-option');
    for (var i = 0; i < opts.length; i++) {
      opts[i].addEventListener('click', function () {
        var m = (this.getAttribute('href') || '').match(/^\\/(no|sv|da|fi|de|nl|fr)\\//);
        try { localStorage.setItem(K, m ? m[1] : 'en'); } catch (e) {}
      });
    }
  }())`;

// Inline script injected into <head> of every page.
// Redirects first-time visitors to their browser language, and remembers
// manual language switches so users are never bounced against their will.
const LANG_REDIRECT_SCRIPT = `(function () {
  var K = 'lina_lang';
  // Already on a non-English locale page — nothing to do
  if (/^\\/(no|sv|da|fi|de|nl|fr)(\\\/|$)/.test(location.pathname)) return;
  var s; try { s = localStorage.getItem(K); } catch (e) {}
  // User explicitly chose English — stay
  if (s === 'en') return;
  // User previously chose a non-English language — redirect to same path
  if (s) { location.replace('/' + s + location.pathname + location.search + location.hash); return; }
  // First visit: auto-detect from browser language list
  var M = {nb:'no',nn:'no',no:'no',sv:'sv',da:'da',fi:'fi',de:'de',nl:'nl',fr:'fr'};
  var ls = navigator.languages ? [].slice.call(navigator.languages) : [navigator.language || ''];
  for (var i = 0; i < ls.length; i++) {
    var l = M[(ls[i] || '').toLowerCase().split('-')[0]];
    if (l) { location.replace('/' + l + location.pathname + location.search + location.hash); return; }
  }
}());`;

// ─── Canonical CTA partial ────────────────────────────────────────
// Single source of truth for the <section id="cta"> block, injected
// into every page that has one. CSS lives in /css/responsive.css.
// Default English text here is overwritten by applyTranslations()
// via the data-i18n attributes when generating non-English versions.
const CANONICAL_CTA_HTML = `<section id="cta">
    <div class="container">
      <div class="cta-inner">
        <h2 data-i18n="cta.title">One safe line between two parents.</h2>
        <p data-i18n="cta.description">Everything both parents need to know — in one place. Download and get started in minutes.</p>
        <div class="hero-ctas">
          <a href="https://apps.apple.com/us/app/lina-co-parenting/id6757200671" class="btn-appstore" aria-label="Download on the App Store" data-i18n-aria="nav.appstoreAria">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span data-i18n="hero.cta">Download on the App Store</span>
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.getlina.lina" class="btn-appstore" aria-label="Get it on Google Play" data-i18n-aria="hero.ctaPlayAria">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.18 23.76c.35.2.74.24 1.11.12l12.5-7.21-2.79-2.79-10.82 9.88zm-1.15-20.39A1.99 1.99 0 0 0 1.75 5v14c0 .61.27 1.16.7 1.54l.08.07 7.84-7.84v-.19L3.03 3.37zm17.09 9.1-2.67-1.54-3.07 3.07 3.07 3.07 2.69-1.55c.77-.44.77-1.6-.02-2.05zM4.29.12 16.79 7.33l-2.79 2.79L3.18.24A1.76 1.76 0 0 1 4.29.12z"/>
            </svg>
            <span data-i18n="hero.ctaPlay">Get on Google Play</span>
          </a>
        </div>
      </div>
    </div>
  </section>`;

// ─── Utility helpers ─────────────────────────────────────────────────────────

function get(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** URL for a given language + page path (no langUrls awareness — base helper) */
function pageUrl(lang, urlPath) {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  return `${BASE_URL}${prefix}${urlPath}`;
}

/** URL path string (no BASE_URL) for a language, respecting langUrls */
function langUrl(lang, urlPath, file) {
  if (lang === 'en') {
    return (file && file.langUrls && file.langUrls.en) ? file.langUrls.en : urlPath;
  }
  if (file && file.langUrls && file.langUrls[lang]) {
    return `/${lang}${file.langUrls[lang]}`;
  }
  return `/${lang}${urlPath}`;
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

/** Get YYYY-MM-DD lastmod string for a source file's mtime */
function getLastMod(srcRelPath) {
  try {
    const fullPath = path.join(ROOT, srcRelPath);
    const stat = fs.statSync(fullPath);
    return stat.mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
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

const ARTICLE_MAP = {
  'blog/custody-schedules/index.html':          'article1',
  'blog/handover-day/index.html':               'article2',
  'blog/what-kids-need/index.html':             'article3',
  'blog/shared-vs-primary-residence/index.html': 'article4',
  'blog/co-parent-communication/index.html':    'article5',
  'blog/summer-holidays/index.html':            'article6',
  'blog/starting-co-parenting/index.html':      'article7',
  'blog/writing-care-agreement/index.html':     'article8',
  'blog/birthdays-two-homes/index.html':        'article9',
};

/**
 * Replace JSON-LD block content with localized values from locale.jsonLd.
 * - MobileApplication: replace description
 * - Organization: leave unchanged (language-independent)
 * - FAQPage: replace mainEntity with localized Q&A from the matching array
 * - Article: replace headline, description, and mainEntityOfPage @id
 */
function localizeJsonLd(html, locale, srcFile, lang, file) {
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
    if (type === 'Article') {
      const articleKey  = ARTICLE_MAP[srcFile];
      const articleData = articleKey && locale.jsonLd[articleKey];
      if (!articleData) return fullMatch;
      if (articleData.headline)    data.headline    = articleData.headline;
      if (articleData.description) data.description = articleData.description;
      if (lang && file && data.mainEntityOfPage) {
        const localizedPath = langUrl(lang, file.urlPath, file);
        data.mainEntityOfPage['@id'] = BASE_URL + localizedPath;
      }
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    }
    if (type === 'BreadcrumbList') {
      if (!lang) return fullMatch;
      const articleKey = ARTICLE_MAP[srcFile];
      const items = data.itemListElement;
      if (!Array.isArray(items) || items.length < 2) return fullMatch;
      // Always localize the home URL
      items[0].item = fullUrl(lang, '/', null);
      if (articleKey && items.length >= 3) {
        // Blog article: 3-item breadcrumb — localize blog URL + translate headline
        items[1].item = fullUrl(lang, '/blog/', null);
        const articleData = locale.jsonLd && locale.jsonLd[articleKey];
        if (articleData && articleData.headline) items[2].name = articleData.headline;
      } else if (file) {
        // Non-article page: 2-item breadcrumb — localize page URL
        items[1].item = fullUrl(lang, file.urlPath, file);
      }
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    }
    return fullMatch;
  });
}

// ─── DE extra-slug JSON-LD updater ───────────────────────────────────────────

/**
 * For DE_EXTRA_SLUGS pages: update Article mainEntityOfPage @id and
 * BreadcrumbList last-item URL to point at the extra canonical URL.
 */
function updateExtraSlugJsonLd(html, extraFullUrl) {
  const re = /(<script[^>]+type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  return html.replace(re, (fullMatch, open, jsonStr, close) => {
    let data;
    try { data = JSON.parse(jsonStr); } catch (e) { return fullMatch; }
    const type = data['@type'];
    if (type === 'Article') {
      if (data.mainEntityOfPage && data.mainEntityOfPage['@id']) {
        data.mainEntityOfPage['@id'] = extraFullUrl;
      }
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    }
    if (type === 'BreadcrumbList') {
      const items = data.itemListElement;
      if (Array.isArray(items) && items.length >= 2) {
        items[items.length - 1].item = extraFullUrl;
      }
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
function escapeAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

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
      const escaped = escapeAttr(val);
      return /\saria-label="[^"]*"/.test(m)
        ? m.replace(/\saria-label="[^"]*"/, ` aria-label="${escaped}"`)
        : m + ` aria-label="${escaped}"`;
    }
  );

  // data-i18n-placeholder
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-placeholder="([^"]+)"[^\n>]*)/g,
    (m, _before, key) => {
      const val = get(locale, key);
      if (val == null) return m;
      const escaped = escapeAttr(val);
      return /\splaceholder="[^"]*"/.test(m)
        ? m.replace(/\splaceholder="[^"]*"/, ` placeholder="${escaped}"`)
        : m + ` placeholder="${escaped}"`;
    }
  );

  // data-i18n-alt — update alt attribute on the same tag
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-alt="([^"]+)"[^\n>]*)/g,
    (m, _before, key) => {
      const val = get(locale, key);
      if (val == null) return m;
      const escaped = escapeAttr(val);
      return /\salt="[^"]*"/.test(m)
        ? m.replace(/\salt="[^"]*"/, ` alt="${escaped}"`)
        : m + ` alt="${escaped}"`;
    }
  );

  // data-i18n-href — update href attribute on the same tag
  html = html.replace(
    /(<[^\n>]*\sdata-i18n-href="([^"]+)"[^\n>]*)/g,
    (m, _before, key) => {
      const val = get(locale, key);
      if (val == null) return m;
      const escaped = escapeAttr(val);
      return /\shref="[^"]*"/.test(m)
        ? m.replace(/\shref="[^"]*"/, ` href="${escaped}"`)
        : m + ` href="${escaped}"`;
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
  const enUrl  = fullUrl('en', urlPath, file);
  // Legal pages: non-English versions canonical to the English URL.
  const canon  = (lang !== 'en' && CROSS_LANG_CANONICAL.has(urlPath))
    ? enUrl
    : fullUrl(lang, urlPath, file);

  // Wipe existing (handles duplicates automatically)
  html = html.replace(/<link rel="canonical"[^>]*\/>\s*/g, '');
  html = html.replace(/<link rel="alternate"[^>]*\/>\s*/g, '');

  const hreflangLinks = [];
  for (const l of LANGS) {
    const hreflangCode = l === 'no' ? 'nb' : l;
    hreflangLinks.push(`  <link rel="alternate" hreflang="${hreflangCode}"        href="${fullUrl(l, urlPath, file)}" />`);
    if (l === 'de') {
      const deUrl = fullUrl('de', urlPath, file);
      hreflangLinks.push(`  <link rel="alternate" hreflang="de-AT" href="${deUrl}" />`);
      hreflangLinks.push(`  <link rel="alternate" hreflang="de-CH" href="${deUrl}" />`);
    }
  }
  const hreflang = hreflangLinks.join('\n');

  const block =
    `  <link rel="canonical" href="${canon}" />\n` +
    `  <link rel="alternate" hreflang="x-default" href="${enUrl}" />\n` +
    `  <link rel="alternate" hreflang="en"        href="${enUrl}" />\n` +
    hreflang + '\n';

  html = html.replace(/(<meta charset[^>]*\/>)/, `$1\n${block}`);

  // og:url
  html = html.replace(/(property="og:url"\s+content=")[^"]*(")/,  `$1${canon}$2`);
  html = html.replace(/(content=")[^"]*("\s+property="og:url")/, `$1${canon}$2`);

  return html;
}

/**
 * Ensure <link rel="manifest" href="/manifest.json" /> is present, inserted
 * directly after the favicon.ico link. Idempotent: if already present, no-op.
 */
function injectManifestLink(html) {
  if (/<link rel="manifest"[^>]*>/.test(html)) return html;
  return html.replace(
    /(<link rel="icon" href="\/favicon\.ico"[^>]*\/>)/,
    `$1\n  <link rel="manifest" href="/manifest.json" />`
  );
}

/**
 * Set og:locale for the current lang and og:locale:alternate for all others.
 * Removes any existing og:locale / og:locale:alternate tags first, then inserts
 * a fresh block immediately after <meta property="og:type" ... />.
 */
function setOgLocale(html, lang) {
  html = html.replace(/\s*<meta property="og:locale(?::alternate)?"[^>]*\/>/g, '');
  const primary = OG_LOCALE[lang];
  const alternates = ALL_LANGS
    .filter(l => l !== lang)
    .map(l => `  <meta property="og:locale:alternate" content="${OG_LOCALE[l]}" />`)
    .join('\n');
  const block = `\n  <meta property="og:locale" content="${primary}" />\n${alternates}`;
  return html.replace(
    /(<meta property="og:type"[^>]*\/>)/,
    `$1${block}`
  );
}

/**
 * For lang === 'de', swap the generic og-image.png for the German og-image-de.png.
 * Covers both og:image and twitter:image content attributes.
 * Does nothing for all other languages.
 */
function localizeOgImage(html, lang) {
  if (lang !== 'de') return html;
  return html.replace(
    /content="https:\/\/getlina\.app\/assets\/og-image\.png"/g,
    'content="https://getlina.app/assets/og-image-de.png"'
  );
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
 * Map of locale → { original filename → locale-specific filename }.
 * .webp keys map to .webp targets; .png keys map to .png targets.
 */
const LOCALE_SCREENSHOT_MAP = {
  no: {
    'AlbumScreen.webp':        'AlbumScreenNO.webp',
    'AlbumScreen.png':         'AlbumScreenNO.png',
    'CareScheduleApp.webp':    'CareScheduleNO.webp',
    'CareScheduleApp.png':     'CareScheduleNO.png',
    'ChildList.webp':          'ChildNO.webp',
    'ChildList.png':           'ChildNO.png',
    'ContactList.webp':        'ContactNO.webp',
    'ContactList.png':         'ContactNO.png',
    'EquipmentList.webp':      'EquipmentNO.webp',
    'EquipmentList.png':       'EquipmentNO.png',
    'ThreadDetailScreen.webp': 'ThreadDetailNO.webp',
    'ThreadDetailScreen.png':  'ThreadDetailNO.png',
    'ThreadsScreen.webp':      'ThreadsScreenNO.webp',
    'ThreadsScreen.png':       'ThreadsScreenNO.png',
    'ToolScreen.webp':         'ToolsScreenNO.webp',
    'ToolScreen.png':          'ToolsScreenNO.png',
    'ToolsScreen.png':         'ToolsScreenNO.png',
  },
  sv: {
    'AlbumScreen.webp':        'AlbumScreenSV.webp',
    'AlbumScreen.png':         'AlbumScreenSV.png',
    'CareScheduleApp.webp':    'CareScheduleSV.webp',
    'CareScheduleApp.png':     'CareScheduleSV.png',
    'ChildList.webp':          'ChildSV.webp',
    'ChildList.png':           'ChildSV.png',
    'ContactList.webp':        'ContactSV.webp',
    'ContactList.png':         'ContactSV.png',
    'EquipmentList.webp':      'EquipmentSV.webp',
    'EquipmentList.png':       'EquipmentSV.png',
    'ThreadDetailScreen.webp': 'ThreadDetailSV.webp',
    'ThreadDetailScreen.png':  'ThreadDetailSV.png',
    'ThreadsScreen.webp':      'ThreadScreenSV.webp',
    'ThreadsScreen.png':       'ThreadScreenSV.png',
    'ToolScreen.webp':         'ToolsScreenSV.webp',
    'ToolScreen.png':          'ToolsScreenSV.png',
    'ToolsScreen.png':         'ToolsScreenSV.png',
  },
  da: {
    'AlbumScreen.webp':        'AlbumScreenDA.webp',
    'AlbumScreen.png':         'AlbumScreenDA.png',
    'CareScheduleApp.webp':    'CareScheduleDA.webp',
    'CareScheduleApp.png':     'CareScheduleDA.png',
    'ChildList.webp':          'ChildDA.webp',
    'ChildList.png':           'ChildDA.png',
    'ContactList.webp':        'ContactDA.webp',
    'ContactList.png':         'ContactDA.png',
    'EquipmentList.webp':      'EquipmentDA.webp',
    'EquipmentList.png':       'EquipmentDA.png',
    'ThreadDetailScreen.webp': 'ThreadDetailDA.webp',
    'ThreadDetailScreen.png':  'ThreadDetailDA.png',
    'ThreadsScreen.webp':      'ThreadsScreenDA.webp',
    'ThreadsScreen.png':       'ThreadsScreenDA.png',
    'ToolScreen.webp':         'ToolsScreenDA.webp',
    'ToolScreen.png':          'ToolsScreenDA.png',
    'ToolsScreen.png':         'ToolsScreenDA.png',
  },
  de: {
    'AlbumScreen.webp':        'AlbumScreenDE.webp',
    'AlbumScreen.png':         'AlbumScreenDE.png',
    'CareScheduleApp.webp':    'CareScheduleDE.webp',
    'CareScheduleApp.png':     'CareScheduleDE.png',
    'ChildList.webp':          'ChildDE.webp',
    'ChildList.png':           'ChildDE.png',
    'ContactList.webp':        'ContactDE.webp',
    'ContactList.png':         'ContactDE.png',
    'EquipmentList.webp':      'EquipmentDE.webp',
    'EquipmentList.png':       'EquipmentDE.png',
    'ThreadDetailScreen.webp': 'ThreadDetailDE.webp',
    'ThreadDetailScreen.png':  'ThreadDetailDE.png',
    'ThreadsScreen.webp':      'ThreadsScreenDE.webp',
    'ThreadsScreen.png':       'ThreadsScreenDE.png',
    'ToolScreen.webp':         'ToolsScreenDE.webp',
    'ToolScreen.png':          'ToolsScreenDE.png',
    'ToolsScreen.png':         'ToolsScreenDE.png',
  },
  fi: {
    'AlbumScreen.webp':        'AlbumScreenFI.webp',
    'AlbumScreen.png':         'AlbumScreenFI.png',
    'CareScheduleApp.webp':    'CareScheduleFI.webp',
    'CareScheduleApp.png':     'CareScheduleFI.png',
    'ChildList.webp':          'ChildFI.webp',
    'ChildList.png':           'ChildFI.png',
    'ContactList.webp':        'ContactFI.webp',
    'ContactList.png':         'ContactFI.png',
    'EquipmentList.webp':      'EquipmentFI.webp',
    'EquipmentList.png':       'EquipmentFI.png',
    'ThreadDetailScreen.webp': 'ThreadDetailFI.webp',
    'ThreadDetailScreen.png':  'ThreadDetailFI.png',
    'ThreadsScreen.webp':      'ThreadsScreenFI.webp',
    'ThreadsScreen.png':       'ThreadsScreenFI.png',
    'ToolScreen.webp':         'ToolScreenFI.webp',
    'ToolScreen.png':          'ToolScreenFI.png',
    'ToolsScreen.png':         'ToolScreenFI.png',
  },
  en: {
    'AlbumScreen.webp':        'AlbumScreenEN.webp',
    'AlbumScreen.png':         'AlbumScreenEN.png',
    'CareScheduleApp.webp':    'CareScheduleEN.webp',
    'CareScheduleApp.png':     'CareScheduleEN.png',
    'ChildList.webp':          'ChildEN.webp',
    'ChildList.png':           'ChildEN.png',
    'ContactList.webp':        'ContactEN.webp',
    'ContactList.png':         'ContactEN.png',
    'EquipmentList.webp':      'EquipmentEN.webp',
    'EquipmentList.png':       'EquipmentEN.png',
    'ThreadDetailScreen.webp': 'ThreadDetailEN.webp',
    'ThreadDetailScreen.png':  'ThreadDetailEN.png',
    'ThreadsScreen.webp':      'ThreadsScreenEN.webp',
    'ThreadsScreen.png':       'ThreadsScreenEN.png',
    'ToolScreen.webp':         'ToolScreenEN.webp',
    'ToolScreen.png':          'ToolScreenEN.png',
    'ToolsScreen.png':         'ToolScreenEN.png',
  },
};

/**
 * Replace app screenshot images with locale-specific versions when available.
 * Locale screenshots live in /assets/images/locale%20screenshots/{lang}/.
 * Also fixes type="image/webp" on <source> elements that now point to a PNG.
 */
function localizeScreenshots(html, lang) {
  const map = LOCALE_SCREENSHOT_MAP[lang];
  if (!map) return html;
  const base   = `/assets/images/locale%20screenshots/${lang}/`;
  const enMap  = LOCALE_SCREENSHOT_MAP['en'] || {};
  const enBase = `/assets/images/locale%20screenshots/en/`;
  return processNonJsonLd(html, text => {
    for (const [from, to] of Object.entries(map)) {
      const toPath = base + to;
      // Pass 1: match root filename in a single-value src= or srcset= attribute
      const fromPath = `/assets/images/${from}`;
      const esc = fromPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`((?:src|srcset)=")${esc}(")`, 'g'), `$1${toPath}$2`);
      // Pass 2: match EN locale path already baked in.
      // Use a lookahead instead of a closing-quote match so the replacement works
      // both in single-value attributes (src="...") and in multi-value srcset strings
      // ("...500w.webp 500w, ...1000w.webp 1000w, ...webp 1170w").
      if (enMap[from]) {
        const enTo  = enMap[from];  // e.g. 'ThreadsScreenEN.webp'
        const fromEn = enBase + enTo;
        const escEn  = fromEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(escEn + '(?=[ ,"])', 'g'), toPath);
        // Also replace -500w and -1000w srcset variant paths derived from the same base name
        if (from.endsWith('.webp')) {
          for (const width of ['500w', '1000w']) {
            const enVariant  = enBase + enTo.replace('.webp', `-${width}.webp`);
            const toVariant  = toPath.replace('.webp', `-${width}.webp`);
            const escVariant = enVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(new RegExp(escVariant + '(?=[ ,"])', 'g'), toVariant);
          }
        }
      }
    }
    // Fix type attribute on <source> elements that now reference a PNG file
    text = text.replace(
      /(<source srcset="[^"]*locale%20screenshots[^"]*\.png"\s+)type="image\/webp"/g,
      '$1type="image/png"'
    );
    return text;
  });
}

/**
 * Inject the language-redirect script into <head> (idempotent).
 * The script runs before page render and redirects first-time visitors
 * to their browser language, while respecting manual language overrides.
 */
function injectLangRedirect(html) {
  const tag = `  <script id="lina-lang-redirect">${LANG_REDIRECT_SCRIPT}</script>`;
  // If a previous build already injected the script, replace it so script
  // updates propagate on rebuild. Otherwise insert before </head>.
  if (/<script id="lina-lang-redirect">[\s\S]*?<\/script>/.test(html)) {
    return html.replace(/[ \t]*<script id="lina-lang-redirect">[\s\S]*?<\/script>/, tag);
  }
  return html.replace('</head>', `${tag}\n</head>`);
}

/**
 * Fix the logo <a href="…"> to point at the correct root for the target lang.
 * Matches any href value on the <a> tag that wraps a Logomark image.
 */
function fixLogoLink(html, lang) {
  const target = lang === 'en' ? '/' : `/${lang}/`;
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
 * Replace English blog slugs with language-specific equivalents.
 * Called after fixInternalLinks, which has already prefixed them with /{lang}.
 * Example (SV): href="/sv/blog/custody-schedules/" → href="/sv/blog/umgangesschema/"
 * Example (NO): href="/no/blog/custody-schedules/" → href="/no/blog/samvaersordninger/"
 * Called for all generated (non-English root) files when the file has langUrls.
 */
function fixBlogLinks(html, lang) {
  return processNonJsonLd(html, text => {
    for (const file of SOURCE_FILES) {
      if (!file.langUrls) continue;
      const targetSlug   = file.langUrls[lang] || file.urlPath;
      const prefixedEn   = `/${lang}${file.urlPath}`;
      const prefixedLang = `/${lang}${targetSlug}`;
      if (prefixedEn === prefixedLang) continue;
      const esc = prefixedEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

/**
 * Replace the page's <section id="cta">...</section> with the
 * canonical CTA partial. If no #cta section exists (e.g. blog posts,
 * legal pages, 404), the page is returned unchanged.
 *
 * Regex uses non-greedy [\s\S]*? so it matches only a single leaf
 * section — safe because CTA sections are never nested.
 */
function injectCanonicalCta(html) {
  const re = /<section id="cta">[\s\S]*?<\/section>/;
  if (!re.test(html)) return html;
  return html.replace(re, CANONICAL_CTA_HTML);
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

/**
 * Replace Norwegian blog slugs with English equivalents in root (English) files.
 * Source files store Norwegian slugs as build-time identifiers; the English root
 * output needs the canonical English slug hrefs instead.
 */
function fixBlogLinksForRoot(html) {
  return processNonJsonLd(html, text => {
    for (const file of SOURCE_FILES) {
      if (!file.langUrls || !file.langUrls.en) continue;
      const esc = file.urlPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`href="${esc}"`, 'g'), `href="${file.langUrls.en}"`);
    }
    return text;
  });
}

/** Transform source HTML into the English root version (minimal updates only) */
function buildRoot(srcHtml, urlPath, hasDropdown, locale, srcFile, file) {
  let html = srcHtml;
  html = localizeJsonLd(html, locale, srcFile, 'en', file);
  html = injectCanonicalCta(html);
  html = setCanonicalAndHreflang(html, 'en', urlPath, file);
  html = setOgLocale(html, 'en');
  html = injectManifestLink(html);
  html = fixAssetPaths(html);
  html = localizeScreenshots(html, 'en');
  html = fixBlogLinksForRoot(html);
  html = fixLogoLink(html, 'en');
  if (hasDropdown) html = fixLangSwitcher(html, 'en', urlPath, file);
  html = fixLangScript(html);
  html = injectLangRedirect(html);
  return html;
}

/** Transform English source HTML into a fully translated version for `lang` */
function buildForLang(noHtml, lang, locale, urlPath, hasDropdown, srcFile, file) {
  const { titleKey, descKey } = getPageKeys(noHtml);
  let html = noHtml;
  html = applyTranslations(html, locale);
  html = localizeJsonLd(html, locale, srcFile, lang, file);
  html = setHtmlLang(html, lang);
  html = setTitle(html, locale, titleKey);
  html = setDescription(html, locale, descKey);
  html = localizeOgImage(html, lang);
  html = setCanonicalAndHreflang(html, lang, urlPath, file);
  html = setOgLocale(html, lang);
  // Asset paths are already absolute after the English root pass
  html = fixInternalLinks(html, lang);
  html = fixBlogLinks(html, lang);
  html = localizeScreenshots(html, lang);
  html = fixLogoLink(html, lang);
  if (hasDropdown) html = fixLangSwitcher(html, lang, urlPath, file);
  html = fixLangScript(html);
  html = injectLangRedirect(html);
  return html;
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function buildSitemap() {
  const urlEntries = [];

  for (const file of SOURCE_FILES) {
    const { urlPath, priority } = file;
    if (SITEMAP_EXCLUDE.has(urlPath)) continue;
    const enUrl = fullUrl('en', urlPath, file);

    if (file.langUrls) {
      // Blog-style pages: each language has a different slug, so each gets
      // its own <url> entry. All entries share the same full hreflang set.
      const makeLinks = () => [
        `      <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>`,
        `      <xhtml:link rel="alternate" hreflang="en"        href="${enUrl}"/>`,
        ...LANGS.flatMap(l => {
          const hreflangCode = l === 'no' ? 'nb' : l;
          const lUrl = fullUrl(l, urlPath, file);
          const entries = [`      <xhtml:link rel="alternate" hreflang="${hreflangCode}"        href="${lUrl}"/>`];
          if (l === 'de') {
            entries.push(`      <xhtml:link rel="alternate" hreflang="de-AT" href="${lUrl}"/>`);
            entries.push(`      <xhtml:link rel="alternate" hreflang="de-CH" href="${lUrl}"/>`);
          }
          return entries;
        }),
      ].join('\n');

      // English root entry
      urlEntries.push(
        `  <url>\n` +
        `    <loc>${enUrl}</loc>\n` +
        makeLinks() + '\n' +
        `    <lastmod>${getLastMod(file.src)}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`
      );

      // Per-language entries
      for (const lang of LANGS) {
        const lUrl = fullUrl(lang, urlPath, file);
        urlEntries.push(
          `  <url>\n` +
          `    <loc>${lUrl}</loc>\n` +
          makeLinks() + '\n' +
          `    <lastmod>${getLastMod(file.src)}</lastmod>\n` +
          `    <changefreq>monthly</changefreq>\n` +
          `    <priority>${priority}</priority>\n` +
          `  </url>`
        );
      }
    } else {
      // Standard pages: one entry with all alternates
      const links = [
        `      <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>`,
        `      <xhtml:link rel="alternate" hreflang="en"        href="${enUrl}"/>`,
        ...LANGS.flatMap(l => {
          const hreflangCode = l === 'no' ? 'nb' : l;
          const lUrl = pageUrl(l, urlPath);
          const entries = [`      <xhtml:link rel="alternate" hreflang="${hreflangCode}"        href="${lUrl}"/>`];
          if (l === 'de') {
            entries.push(`      <xhtml:link rel="alternate" hreflang="de-AT" href="${lUrl}"/>`);
            entries.push(`      <xhtml:link rel="alternate" hreflang="de-CH" href="${lUrl}"/>`);
          }
          return entries;
        }),
      ].join('\n');

      urlEntries.push(
        `  <url>\n` +
        `    <loc>${enUrl}</loc>\n` +
        links + '\n' +
        `    <lastmod>${getLastMod(file.src)}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`
      );
    }
  }

  // ── DE extra slug entries ───────────────────────────────────────────────────
  for (const extraEntry of DE_EXTRA_SLUGS) {
    const baseFile = SOURCE_FILES.find(f => f.src === extraEntry.baseSrc);
    if (!baseFile) continue;
    const { urlPath } = baseFile;
    const extraFullUrl = `${BASE_URL}/de${extraEntry.extraSlug}`;
    const enUrl2 = fullUrl('en', urlPath, baseFile);

    const extraLinks = [
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl2}"/>`,
      `      <xhtml:link rel="alternate" hreflang="en"        href="${enUrl2}"/>`,
      ...LANGS.flatMap(l => {
        const hreflangCode = l === 'no' ? 'nb' : l;
        const lUrl = l === 'de' ? extraFullUrl : fullUrl(l, urlPath, baseFile);
        const entries = [`      <xhtml:link rel="alternate" hreflang="${hreflangCode}"        href="${lUrl}"/>`];
        if (l === 'de') {
          entries.push(`      <xhtml:link rel="alternate" hreflang="de-AT" href="${lUrl}"/>`);
          entries.push(`      <xhtml:link rel="alternate" hreflang="de-CH" href="${lUrl}"/>`);
        }
        return entries;
      }),
    ].join('\n');

    urlEntries.push(
      `  <url>\n` +
      `    <loc>${extraFullUrl}</loc>\n` +
      extraLinks + '\n' +
      `    <lastmod>${getLastMod(baseFile.src)}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.6</priority>\n` +
      `  </url>`
    );
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
  // Load English locale for root build; load all other locales for language versions
  const enLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'en.json'), 'utf8'));
  console.log('Loaded locale: en');
  const locales = {};
  for (const lang of LANGS) {
    const p = path.join(ROOT, 'locales', `${lang}.json`);
    locales[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`Loaded locale: ${lang}`);
  }

  // Warn if German OG image is missing (does not abort the build)
  const deOgImagePath = path.join(ROOT, 'assets', 'og-image-de.png');
  if (!fs.existsSync(deOgImagePath)) {
    console.warn('⚠  Warning: /assets/og-image-de.png not found — German pages will use the generic og-image.png');
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

    // ── Step 1: build English root version ────────────────────────────────
    const enHtml = buildRoot(originalHtml, urlPath, hasDropdown, enLocale, src, file);

    if (!safetyCheck(originalHtml, enHtml, `${src} [en]`)) {
      console.error(`  ABORT: skipping write of ${src}`);
      errors++;
      continue;
    }

    fs.writeFileSync(srcPath, enHtml, 'utf8');
    console.log(`Updated (en): ${src}  [${origSections} sections ✓]`);

    // For blog articles with a dedicated English slug, also write to that path
    if (file.langUrls && file.langUrls.en) {
      const enSlug    = file.langUrls.en.replace(/^\//, '');
      const enRelPath = enSlug.endsWith('/') ? enSlug + 'index.html' : enSlug;
      const enOutFile = path.join(ROOT, enRelPath);
      mkdirp(path.dirname(enOutFile));
      fs.writeFileSync(enOutFile, enHtml, 'utf8');
      console.log(`  → ${enRelPath} (en root)`);
    }

    // ── Step 2: generate language versions ────────────────────────────────
    let deHtmlForExtra = null; // captured for DE_EXTRA_SLUGS below
    for (const lang of LANGS) {
      const outHtml = buildForLang(enHtml, lang, locales[lang], urlPath, hasDropdown, src, file);

      if (!safetyCheck(originalHtml, outHtml, `${src} [${lang}]`)) {
        console.error(`  ABORT: skipping ${lang}/${src}`);
        errors++;
        continue;
      }

      const outFile = outPath(src, lang, file);
      mkdirp(path.dirname(outFile));
      fs.writeFileSync(outFile, outHtml, 'utf8');
      console.log(`  → ${outFile.replace(ROOT + path.sep, '')}`);

      if (lang === 'de') deHtmlForExtra = outHtml;
    }

    // ── DE extra slugs ────────────────────────────────────────────────────
    for (const extraEntry of DE_EXTRA_SLUGS) {
      if (extraEntry.baseSrc !== src) continue;
      if (!deHtmlForExtra) continue;

      const extraFullUrl = `${BASE_URL}/de${extraEntry.extraSlug}`;
      let extraHtml = deHtmlForExtra;

      // Update canonical
      extraHtml = extraHtml.replace(
        /(<link rel="canonical" href=")[^"]*(")/,
        `$1${extraFullUrl}$2`
      );

      // Update og:url
      extraHtml = extraHtml.replace(
        /(property="og:url"\s+content=")[^"]*(")/,
        `$1${extraFullUrl}$2`
      );
      extraHtml = extraHtml.replace(
        /(content=")[^"]*("\s+property="og:url")/,
        `$1${extraFullUrl}$2`
      );

      // Update de/de-AT/de-CH hreflang to point at the extra slug URL
      extraHtml = extraHtml.replace(
        /(<link rel="alternate"\s+hreflang="de"\s+href=")[^"]*(")/,
        `$1${extraFullUrl}$2`
      );
      extraHtml = extraHtml.replace(
        /(<link rel="alternate"\s+hreflang="de-AT"\s+href=")[^"]*(")/,
        `$1${extraFullUrl}$2`
      );
      extraHtml = extraHtml.replace(
        /(<link rel="alternate"\s+hreflang="de-CH"\s+href=")[^"]*(")/,
        `$1${extraFullUrl}$2`
      );

      // Update JSON-LD Article mainEntityOfPage @id and BreadcrumbList last item
      extraHtml = updateExtraSlugJsonLd(extraHtml, extraFullUrl);

      const extraOutPath = path.join(ROOT, 'de', extraEntry.extraSlug.replace(/^\//, ''), 'index.html');
      mkdirp(path.dirname(extraOutPath));
      fs.writeFileSync(extraOutPath, extraHtml, 'utf8');
      console.log(`  → de${extraEntry.extraSlug}index.html (de extra slug)`);
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
