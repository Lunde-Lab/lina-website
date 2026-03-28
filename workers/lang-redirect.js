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

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

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

  // 6. Redirect to language-prefixed version of the same page
  const redirectPath = `/${targetLang}${path === '/' ? '/' : path}`;
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
