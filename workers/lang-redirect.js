// Cloudflare Worker: Accept-Language redirect for getlina.app
// Redirects new visitors to their preferred language version.
// English stays on root — no, sv, da, fi, de, nl, fr get redirected.

const SUPPORTED = ['no', 'sv', 'da', 'fi', 'de', 'nl', 'fr'];
const LANG_PREFIXES = ['/no/', '/sv/', '/da/', '/fi/', '/de/', '/nl/', '/fr/'];
const COOKIE_NAME = 'lina-lang-set';

// Bot detection: don't redirect crawlers
const BOT_PATTERNS = /bot|crawl|spider|slurp|baidu|yandex|googlebot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot/i;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Transaksjonelle sider nådd fra e-post / deep link. Aldri omdiriger disse.
const BYPASS_EXACT = new Set([
  '/confirm-deletion',
  '/confirm-deletion.html',
  '/cancel-deletion',
  '/cancel-deletion.html',
  '/account-deletion.html',
  '/account-deletion-scheduled.html',
  '/account-deletion-cancelled.html',
  '/email-changed.html',
]);

// Kataloger som må slippe gjennom uendret.
const BYPASS_PREFIXES = [
  '/.well-known/', // assetlinks.json, apple-app-site-association, etc.
  '/invite',       // invite links must reach the app unmodified (/invite, /invite/, /invite/*)
];

// Per-locale slug map for pages whose URL path differs between locales.
// SOURCE OF TRUTH: scripts/build-i18n.js — SOURCE_FILES[...].langUrls
// When adding a new page with localised slugs to the build script, mirror it here.
// Pages with identical slugs across locales do NOT need entries here —
// the naive concat fallback handles them correctly.
const SLUG_MAP = {
  '/research/': {
    no: '/no/forskning/',
    sv: '/sv/forskning/',
    da: '/da/forskning/',
    fi: '/fi/tutkimus/',
    de: '/de/forschung/',
    nl: '/nl/onderzoek/',
    fr: '/fr/recherche/',
  },
  '/blog/custody-schedules/': {
    no: '/no/blog/samvaersordninger/',
    sv: '/sv/blog/umgangesschema/',
    da: '/da/blog/samvaersordning/',
    fi: '/fi/blog/vuoroasuminen/',
    de: '/de/blog/umgangsregelung/',
    nl: '/nl/blog/omgangsregeling/',
    fr: '/fr/blog/modes-de-garde/',
  },
  '/blog/handover-day/': {
    no: '/no/blog/byttedag/',
    sv: '/sv/blog/overlamningsdag/',
    da: '/da/blog/byttedag-tips/',
    fi: '/fi/blog/vaihtopaiva/',
    de: '/de/blog/uebergabetag/',
    nl: '/nl/blog/wisseldag/',
    fr: '/fr/blog/jour-de-transition/',
  },
  '/blog/what-kids-need/': {
    no: '/no/blog/utstyr-to-hjem/',
    sv: '/sv/blog/vad-barnet-behover/',
    da: '/da/blog/hvad-barnet-har-brug-for/',
    fi: '/fi/blog/mita-lapsi-tarvitsee/',
    de: '/de/blog/was-kinder-brauchen/',
    nl: '/nl/blog/wat-kinderen-nodig-hebben/',
    fr: '/fr/blog/ce-dont-lenfant-a-besoin/',
  },
  '/blog/shared-vs-primary-residence/': {
    no: '/no/blog/delt-bosted/',
    sv: '/sv/blog/vaxelvis-vs-fast-boende/',
    da: '/da/blog/delt-vs-fast-bopael/',
    fi: '/fi/blog/vuoroasuminen-vs-lahivanhemmuus/',
    de: '/de/blog/wechselmodell-vs-residenzmodell/',
    nl: '/nl/blog/co-ouderschap-vs-hoofdverblijf/',
    fr: '/fr/blog/residence-alternee-vs-principale/',
  },
  '/blog/co-parent-communication/': {
    no: '/no/blog/kommunikasjon/',
    sv: '/sv/blog/kommunikation-delad-omsorg/',
    da: '/da/blog/kommunikation-delt-omsorg/',
    fi: '/fi/blog/yhteishuoltajuus-viestinta/',
    de: '/de/blog/kommunikation-getrennte-eltern/',
    nl: '/nl/blog/communicatie-gescheiden-ouders/',
    fr: '/fr/blog/communication-entre-coparents/',
  },
  '/blog/summer-holidays/': {
    no: '/no/blog/sommerferie-to-hjem/',
    sv: '/sv/blog/sommarlov-tva-hem/',
    da: '/da/blog/sommerferie-to-hjem/',
    fi: '/fi/blog/kesaloma-kahdessa-kodissa/',
    de: '/de/blog/sommerferien-zwei-zuhause/',
    nl: '/nl/blog/zomervakantie-twee-huizen/',
    fr: '/fr/blog/vacances-ete-deux-maisons/',
  },
  '/blog/starting-co-parenting/': {
    no: '/no/blog/samarbeid-etter-samlivsbrudd/',
    sv: '/sv/blog/samarbete-efter-separation/',
    da: '/da/blog/samarbejde-efter-separation/',
    fi: '/fi/blog/eron-jalkeen-yhteistyo/',
    de: '/de/blog/co-parenting-nach-trennung/',
    nl: '/nl/blog/co-ouderschap-na-scheiding/',
    fr: '/fr/blog/coparentalite-apres-separation/',
  },
  '/blog/writing-care-agreement/': {
    no: '/no/blog/samvaersavtale/',
    sv: '/sv/blog/varnadsavtal/',
    da: '/da/blog/samvaersaftale/',
    fi: '/fi/blog/huoltosopimus/',
    de: '/de/blog/umgangsvereinbarung/',
    nl: '/nl/blog/ouderschapsplan/',
    fr: '/fr/blog/convention-parentale/',
  },
  '/blog/birthdays-two-homes/': {
    no: '/no/blog/bursdag-to-hjem/',
    sv: '/sv/blog/fodelsedag-tva-hem/',
    da: '/da/blog/fodselsdag-to-hjem/',
    fi: '/fi/blog/syntymapaiva-kahdessa-kodissa/',
    de: '/de/blog/geburtstag-zwei-zuhause/',
    nl: '/nl/blog/verjaardag-twee-huizen/',
    fr: '/fr/blog/anniversaire-deux-maisons/',
  },
  // Add future per-locale-slug pages here
};

// Reverse map built from SLUG_MAP: fixes legacy bad links the worker may have
// produced previously via naive concat, e.g. /de/research/ → /de/forschung/.
// Built once at module load.
const LEGACY_PATH_FIX = new Map();
for (const [enPath, langs] of Object.entries(SLUG_MAP)) {
  for (const [lang, localePath] of Object.entries(langs)) {
    LEGACY_PATH_FIX.set(`/${lang}${enPath}`, localePath);
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 0a. Transaksjonelle sider (eksakt match) → pass through unconditionally
  if (BYPASS_EXACT.has(path)) {
    return fetch(request);
  }

  // 0b. System / deep-link katalog-paths → pass through unconditionally
  if (BYPASS_PREFIXES.some(p => {
    const prefix = p.endsWith('/') ? p : p + '/';
    return path === p || path.startsWith(prefix);
  })) {
    return fetch(request);
  }

  // 0c. Legacy bad path from earlier worker version (naive concat of English
  //     slug onto a language prefix) → 301 to the correct localised slug.
  //     Must run BEFORE the lang-prefix pass-through, since these paths
  //     already start with /{lang}/ but point to a non-existent file.
  const legacyTarget = LEGACY_PATH_FIX.get(path);
  if (legacyTarget) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': `${url.origin}${legacyTarget}${url.search}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // 0d. Legacy .html → /dir/ refactor for /professionals and /contact.
  //     Catches /professionals.html, /contact.html, and all 7 language
  //     variants like /no/professionals.html. 301 to the directory URL.
  if (path === '/professionals.html' || path === '/contact.html' ||
      /^\/(no|sv|da|fi|de|nl|fr)\/(professionals|contact)\.html$/.test(path)) {
    const newPath = path.replace(/\.html$/, '/');
    return new Response(null, {
      status: 301,
      headers: {
        'Location': `${url.origin}${newPath}${url.search}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // 1a. Strip legacy /en/ prefix → 301 to root-equivalent path.
  //     English lives at root; /en/* paths are bad legacy/external links.
  if (path === '/en' || path.startsWith('/en/')) {
    const stripped = path === '/en' ? '/' : (path.slice(3) || '/');
    return new Response(null, {
      status: 301,
      headers: {
        'Location': `${url.origin}${stripped}${url.search}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // 1. Already on a language-prefixed path → pass through
  if (LANG_PREFIXES.some(p => path.startsWith(p))) {
    return fetch(request);
  }

  // 2. Bot/crawler → pass through (let them see English root)
  const ua = request.headers.get('User-Agent') || '';
  if (BOT_PATTERNS.test(ua)) {
    return fetch(request);
  }

  // 3. Cookie exists → user has been here before, respect their choice
  const cookie = request.headers.get('Cookie') || '';
  if (cookie.includes(COOKIE_NAME)) {
    return fetch(request);
  }

  // 4. Parse Accept-Language and find best supported match
  const acceptLang = request.headers.get('Accept-Language') || '';
  const preferred = parseAcceptLanguage(acceptLang);

  let targetLang = null;
  for (const { lang } of preferred) {
    const base = lang.split('-')[0].toLowerCase();
    if (base === 'en') {
      break; // English preference → stay on root
    }
    // Normalize: nb, nn → no (redirect to /no/)
    if (base === 'nb' || base === 'nn' || base === 'no') {
      targetLang = 'no';
      break;
    }
    if (SUPPORTED.includes(base)) {
      targetLang = base;
      break;
    }
  }

  // 5. No redirect needed → set cookie and pass through
  if (!targetLang) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.append('Set-Cookie', `${COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax`);
    return newResponse;
  }

  // 6. Redirect to language version of the same page.
  //
  // Expected behavior:
  //   GET /research/ with Accept-Language: de → 302 /de/forschung/
  //   GET /research/ with Accept-Language: no → 302 /no/forskning/
  //   GET /research/ with Accept-Language: fi → 302 /fi/tutkimus/
  //   GET /research/ with Accept-Language: en → pass through (handled above)
  //   GET /about/ with Accept-Language: de → 302 /de/about/ (naive concat)
  //   GET /de/forschung/ with Accept-Language: en → pass through (lang-prefixed)
  //   GET /de/research/ (legacy bad link) → 301 /de/forschung/ (handled at 0c)
  //   GET /.well-known/assetlinks.json → pass through (BYPASS_PREFIXES)
  //   GET /invite/abc123 → pass through (BYPASS_PREFIXES)
  //
  // SLUG_MAP wins when the page has a localised slug; otherwise naive concat.
  const mapped = SLUG_MAP[path]?.[targetLang];
  const redirectPath = mapped ?? `/${targetLang}${path === '/' ? '/' : path}`;
  const redirectUrl = `${url.origin}${redirectPath}${url.search}`;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Set-Cookie': `${COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  });
}

// Parse Accept-Language header into sorted array of { lang, q }
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header
    .split(',')
    .map(part => {
      const [lang, ...params] = part.trim().split(';');
      const qParam = params.find(p => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.trim().split('=')[1]) : 1.0;
      return { lang: lang.trim(), q };
    })
    .filter(({ lang }) => lang)
    .sort((a, b) => b.q - a.q);
}
