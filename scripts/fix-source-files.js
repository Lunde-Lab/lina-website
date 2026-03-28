#!/usr/bin/env node
'use strict';

/**
 * One-shot script that normalises all Norwegian source HTML files:
 *  1. Converts relative asset / css / js / favicon paths to absolute
 *  2. Fixes the logo link (href="index.html", href="../", href="../index.html" → href="/")
 *  3. Replaces <button> lang-options with <a> links (Norwegian page active)
 *  4. Sets #lang-current to "NO"
 *  5. Replaces the old lang-switcher IIFE with the slim, navigation-based version
 *  6. Removes duplicate <link rel="canonical"> (just in case any remain)
 *
 * Safe for JSON-LD blocks — those are never touched.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── File config ─────────────────────────────────────────────────────────────

const FILES = [
  { src: 'index.html',                urlPath: '/',                   hasDropdown: true  },
  { src: 'care-schedule/index.html',  urlPath: '/care-schedule/',     hasDropdown: true  },
  { src: 'care-agreement/index.html', urlPath: '/care-agreement/',    hasDropdown: true  },
  { src: 'about/index.html',          urlPath: '/about/',             hasDropdown: true  },
  { src: 'faq/index.html',            urlPath: '/faq/',               hasDropdown: true  },
  { src: 'pricing/index.html',        urlPath: '/pricing/',           hasDropdown: true  },
  { src: 'stories/index.html',        urlPath: '/stories/',           hasDropdown: true  },
  { src: 'professionals.html',        urlPath: '/professionals.html', hasDropdown: true  },
  { src: 'contact.html',              urlPath: '/contact.html',       hasDropdown: false },
];

const LANGS = [
  { code: 'no', flag: '🇳🇴', name: 'Norsk' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'da', flag: '🇩🇰', name: 'Dansk' },
  { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
];

const NEW_LANG_SCRIPT = `  <script>
  (function () {
    const switcher = document.getElementById('lang-switcher');
    const btn = document.getElementById('lang-btn');
    if (!switcher || !btn) return;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const open = switcher.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function(e) {
      if (!switcher.contains(e.target)) {
        switcher.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }());
  </script>`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split HTML into segments, protecting JSON-LD script blocks. */
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

// ─── Transforms ──────────────────────────────────────────────────────────────

/** 1. Convert relative asset/css/js/favicon paths to absolute */
function fixAssetPaths(html) {
  return processNonJsonLd(html, text => {
    const dotdot = '(?:(?:\\.\\./){1,3})?'; // 0–3 levels of ../
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(assets/)`, 'g'),   '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(css/)`, 'g'),      '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(js/)`, 'g'),       '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(locales/)`, 'g'),  '$1/$2');
    text = text.replace(new RegExp(`((?:src|href)=")${dotdot}(favicon\\.ico")`, 'g'), '$1/$2');
    return text;
  });
}

/** 2. Fix the logo link to href="/" */
function fixLogoLink(html) {
  // Match any of: href="index.html", href="../", href="../index.html", href="./"
  // that appears inside the logo <a> tag (the one wrapping the Logomark svg).
  // Strategy: replace the href on the <a> tag immediately before the Logomark img.
  return html.replace(
    /(<a\s[^>]*href=")(?:(?:\.\.\/)+(?:index\.html)?|index\.html|\.\/)("[^>]*>(?:\s*<img[^>]*Logomark[^>]*>))/g,
    '$1/$2'
  );
}

/** 3. Build the lang-dropdown replacement for the Norwegian page */
function buildDropdown(urlPath) {
  const items = LANGS.map(({ code, flag, name }) => {
    const href   = code === 'no' ? urlPath : `/${code}${urlPath}`;
    const active = code === 'no' ? ' active' : '';
    return `            <a class="lang-option${active}" href="${href}" role="menuitem"><span class="lang-flag">${flag}</span> ${name}</a>`;
  });
  return `<div class="lang-dropdown" role="menu">\n${items.join('\n')}\n          </div>`;
}

/** 3+4. Replace lang-dropdown buttons and update #lang-current */
function fixLangSwitcher(html, urlPath) {
  // Replace dropdown content (buttons → links)
  html = html.replace(
    /<div class="lang-dropdown" role="menu">[\s\S]*?<\/div>/,
    buildDropdown(urlPath)
  );
  // Set #lang-current to NO
  html = html.replace(
    /<span id="lang-current">[^<]*<\/span>/,
    '<span id="lang-current">NO</span>'
  );
  return html;
}

/** 5. Replace the old lang-switcher IIFE with the new minimal version */
function fixLangScript(html) {
  // Match the entire <script> block containing the lang-switcher IIFE.
  // The block starts with <script> (no attributes), contains getElementById('lang-btn')
  // or getElementById('lang-switcher'), and ends with </script>.
  return html.replace(
    /<script>\s*\(function\s*\(\s*\)\s*\{[\s\S]*?getElementById\(['"](lang-switcher|lang-btn)['"]\)[\s\S]*?\}[\s\S]*?\(\)\s*\);\s*<\/script>/,
    NEW_LANG_SCRIPT
  );
}

/** 6. Remove any duplicate <link rel="canonical"> beyond the first */
function dedupeCanonical(html) {
  let count = 0;
  return html.replace(/<link rel="canonical"[^>]*\/>/g, match => {
    count++;
    return count === 1 ? match : '';
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const { src, urlPath, hasDropdown } of FILES) {
  const filePath = path.join(ROOT, src);
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP (not found): ${src}`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  html = fixAssetPaths(html);
  html = fixLogoLink(html);
  html = dedupeCanonical(html);

  if (hasDropdown) {
    html = fixLangSwitcher(html, urlPath);
  }

  html = fixLangScript(html);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Fixed: ${src}`);
}

console.log('\nDone. Run `node scripts/build-i18n.js` to regenerate language versions.');
