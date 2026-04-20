#!/usr/bin/env node
// slop-check.js — detect AI-slop patterns in English blog source HTML.
// Rules and thresholds are governed by /docs/writing-style.md (source of truth).
// ERRORs (aphoristic "Not X, but Y"; em-dashes in H2 headings) block commits.
// WARNINGs (heavy em-dash use >15, AI-signature phrases, heuristics) report only.
// Run with --help for usage.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const EM_DASH = '\u2014';
const EM_DASH_HEAVY_THRESHOLD = 15;

const CLEAN_REFERENCE_SLUGS = [
  'custody-schedules',
  'shared-vs-primary-residence',
  'summer-holidays',
];

const AI_SIGNATURE_PATTERNS = [
  { type: 'substring', value: 'here is what tends to help' },
  { type: 'substring', value: 'that is normal.' },
  { type: 'substring', value: 'this is common.' },
  { type: 'regex', value: /\bthe most important thing is\b/i },
  { type: 'substring', value: 'the child will notice' },
  { type: 'regex', value: /\bat the end of the day\b/i },
  { type: 'regex', value: /\bnavigating\s+(a|the|this)\s+\w+\s+situation\b/i },
  { type: 'regex', value: /\blet(?:'s|\s+us)?\s+unpack\b/i },
  { type: 'regex', value: /\byour\s+\w+\s+journey\b/i },
  { type: 'regex', value: /\bembrace\s+(this|the)\s+new\b/i },
];

const NOT_X_BUT_Y_PATTERNS = [
  // Aphoristic "The X is not A, but B" — short subject + abstract contrast
  /\bthe\s+\w+\s+is\s+not\s+[a-z]+,\s+but\s+[a-z]+\b/i,
  // "Not A — B" with short abstract halves (≤4 words each side)
  /\bnot\s+(?:a|an|the)?\s?[a-z]+(?:\s+[a-z]+){0,3}\s+\u2014\s+(?:a|an|the)?\s?[a-z]+(?:\s+[a-z]+){0,3}[.\n]/i,
  // "A, not B." as a sentence-ending one-liner (trailing aphoristic contrast)
  /[.!?]\s+[A-Z][^,.!?]{3,40},\s+not\s+[a-z]{3,}\.\s*$/im,
];

const APHORISTIC_MAXIM = /^[A-Z][^.!?]*\b(is|beats|matters|counts|wins|works)\b[^.!?]*\.$/;
const APHORISTIC_COPULA = /^[A-Z]\w+\s+is\s+(the|a|an)\s+\w+\.$/;

// ------------------------------ helpers ------------------------------

function printHelp() {
  const msg = `
slop-check.js — AI-slop detector for English blog source HTML.

USAGE
  node scripts/slop-check.js [files...]       Check specific files, or all blog/*/index.html
  node scripts/slop-check.js --baseline       Report em-dash counts per blog post
  node scripts/slop-check.js --help           Show this message

THRESHOLDS (from /docs/writing-style.md)
  ERROR   "Not X, but Y" aphoristic constructions .. > 0
  ERROR   Em-dashes in H2 headings ................. > 0
  WARN    Em-dashes in body (heavy use) ............ > ${EM_DASH_HEAVY_THRESHOLD}
  WARN    AI-signature phrases ..................... any
  WARN    Parallel-symmetric sentence pairs ........ any (heuristic)
  WARN    Aphoristic paragraph endings ............. any (heuristic)

EXIT CODES
  0  zero errors (warnings allowed)
  1  one or more errors

BYPASS THE COMMIT HOOK (emergency only)
  LINA_SKIP_SLOP_CHECK=1 git commit ...
`;
  process.stdout.write(msg);
}

function decodeEntities(s) {
  return s
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function stripInlineTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function offsetToLine(content, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z\u00c0-\u017f])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

function firstWord(s) {
  const m = s.trim().match(/^[A-Za-z\u00c0-\u017f']+/);
  return m ? m[0] : '';
}

// ------------------------------ extraction ------------------------------

// Returns an array of { line, key, tag, text } — one per element with a
// data-i18n="blogN.*" attribute. Falls back to all text inside <main class="article-main">
// if no data-i18n matches are found (so the tool still gives signal on older templates).
function extractProseItems(content, filePath) {
  const items = [];
  const attrRe = /<(h1|h2|p|span)\b([^>]*?)\bdata-i18n="(blog\d+\.[a-zA-Z0-9_]+)"([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = attrRe.exec(content)) !== null) {
    const tag = m[1];
    const key = m[3];
    const inner = m[5];
    const line = offsetToLine(content, m.index);
    const text = decodeEntities(stripInlineTags(inner)).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    items.push({ line, key, tag, text });
  }

  if (items.length > 0) return items;

  const mainRe = /<main\b[^>]*class="[^"]*article-main[^"]*"[^>]*>([\s\S]*?)<\/main>/i;
  const mm = content.match(mainRe);
  if (!mm) return items;
  const mainOffset = content.indexOf(mm[1]);
  const text = decodeEntities(stripInlineTags(mm[1]))
    .replace(/\s+/g, ' ')
    .trim();
  if (text) {
    items.push({ line: offsetToLine(content, mainOffset), key: 'main', tag: 'main', text });
  }
  return items;
}

// ------------------------------ checks ------------------------------

function runChecks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const items = extractProseItems(content, filePath);
  const errors = [];
  const warnings = [];

  // Check 1: em-dash count
  let emDashCount = 0;
  const emDashLines = [];
  for (const item of items) {
    const c = (item.text.match(/\u2014/g) || []).length;
    if (c > 0) {
      emDashCount += c;
      for (let i = 0; i < c; i++) emDashLines.push(item.line);
    }
  }
  if (emDashCount > EM_DASH_HEAVY_THRESHOLD) {
    warnings.push({
      check: 'em-dash-heavy',
      msg: `${emDashCount} em-dashes found (warning threshold: ${EM_DASH_HEAVY_THRESHOLD}). Locations: ${emDashLines.map((l) => `line ${l}`).join(', ')}`,
    });
  }

  // Check 2: "Not X, but Y"
  for (const item of items) {
    for (const re of NOT_X_BUT_Y_PATTERNS) {
      const match = item.text.match(re);
      if (match) {
        errors.push({
          check: 'not-x-but-y',
          msg: `line ${item.line} (${item.key}): "${match[0].trim()}"`,
        });
      }
    }
  }

  // Check 3: em-dash in H2 headings (H1 titles use em-dashes by convention)
  for (const item of items) {
    if (item.tag === 'h2' && item.text.includes(EM_DASH)) {
      errors.push({
        check: 'em-dash-heading',
        msg: `line ${item.line} (${item.key}) <${item.tag}>: "${item.text}"`,
      });
    }
  }

  // Check 4: AI-signature phrases
  for (const item of items) {
    const lower = item.text.toLowerCase();
    for (const p of AI_SIGNATURE_PATTERNS) {
      if (p.type === 'substring') {
        if (lower.includes(p.value)) {
          warnings.push({
            check: 'ai-phrase',
            msg: `line ${item.line} (${item.key}): matched "${p.value}"`,
          });
        }
      } else {
        const match = item.text.match(p.value);
        if (match) {
          warnings.push({
            check: 'ai-phrase',
            msg: `line ${item.line} (${item.key}): matched /${p.value.source}/ → "${match[0]}"`,
          });
        }
      }
    }
  }

  // Check 5: parallel-symmetric sentence pairs
  const articles = new Set(['the', 'a', 'an']);
  for (const item of items) {
    const sents = splitSentences(item.text);
    for (let i = 0; i + 1 < sents.length; i++) {
      const a = sents[i];
      const b = sents[i + 1];
      const wa = wordCount(a);
      const wb = wordCount(b);
      if (wa > 8 || wb > 8) continue;
      if (Math.abs(wa - wb) > 1) continue;
      const fa = firstWord(a);
      const fb = firstWord(b);
      if (!fa || !fb) continue;
      const faLower = fa.toLowerCase();
      const fbLower = fb.toLowerCase();
      const sameFirst = faLower === fbLower;
      const bothArticles = articles.has(faLower) && articles.has(fbLower);
      const bothCapNoun =
        !articles.has(faLower) &&
        !articles.has(fbLower) &&
        /^[A-Z]/.test(fa) &&
        /^[A-Z]/.test(fb);
      if (sameFirst || bothArticles || bothCapNoun) {
        warnings.push({
          check: 'parallel-symmetric',
          msg: `line ${item.line} (${item.key}): "${a}" / "${b}"`,
        });
      }
    }
  }

  // Check 6: aphoristic paragraph endings
  for (const item of items) {
    if (item.tag !== 'p') continue;
    const sents = splitSentences(item.text);
    if (sents.length === 0) continue;
    const last = sents[sents.length - 1];
    if (wordCount(last) > 10) continue;
    if (/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(last.replace(/^\S+\s*/, ''))) continue;
    if (APHORISTIC_MAXIM.test(last) || APHORISTIC_COPULA.test(last)) {
      warnings.push({
        check: 'aphoristic-ending',
        msg: `line ${item.line} (${item.key}): "${last}"`,
      });
    }
  }

  return { filePath, emDashCount, errors, warnings };
}

// ------------------------------ reporting ------------------------------

function relToRepo(p) {
  const abs = path.resolve(p);
  if (abs.startsWith(REPO_ROOT + path.sep)) {
    return abs.slice(REPO_ROOT.length + 1);
  }
  return p;
}

function reportFile(result) {
  const rel = relToRepo(result.filePath);
  process.stdout.write(`\nChecking: ${rel}\n`);
  if (result.errors.length === 0 && result.warnings.length === 0) {
    process.stdout.write('  (clean)\n');
  }
  for (const e of result.errors) {
    process.stdout.write(`  [ERROR  ${e.check}] ${e.msg}\n`);
  }
  for (const w of result.warnings) {
    process.stdout.write(`  [WARN   ${w.check}] ${w.msg}\n`);
  }
  process.stdout.write(`  Summary: ${result.errors.length} errors, ${result.warnings.length} warnings\n`);
}

// ------------------------------ file discovery ------------------------------

function discoverBlogPosts() {
  const blogDir = path.join(REPO_ROOT, 'blog');
  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(blogDir, entry.name, 'index.html');
    if (fs.existsSync(candidate)) files.push(candidate);
  }
  return files.sort();
}

// ------------------------------ baseline mode ------------------------------

function runBaseline() {
  const files = discoverBlogPosts();
  const rows = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const items = extractProseItems(content, f);
    const count = items.reduce(
      (acc, it) => acc + (it.text.match(/\u2014/g) || []).length,
      0,
    );
    const slug = path.basename(path.dirname(f));
    rows.push({ slug, count });
  }
  const slugWidth = Math.max(...rows.map((r) => r.slug.length));
  process.stdout.write('\nBaseline: em-dash counts per blog post body\n');
  process.stdout.write('-'.repeat(slugWidth + 10) + '\n');
  for (const r of rows) {
    process.stdout.write(`  ${r.slug.padEnd(slugWidth)}  ${String(r.count).padStart(3)}\n`);
  }
  const cleanRows = rows.filter((r) => CLEAN_REFERENCE_SLUGS.includes(r.slug));
  const suggested = cleanRows.length > 0 ? Math.max(...cleanRows.map((r) => r.count)) : 0;
  process.stdout.write(
    `\nReference (blog1, blog4, blog6): ${cleanRows.map((r) => `${r.slug}=${r.count}`).join(', ')}\n`,
  );
  process.stdout.write(`Suggested baseline (max of reference): ${suggested}\n`);
  process.stdout.write(`Current warning threshold (body em-dashes): >${EM_DASH_HEAVY_THRESHOLD}\n`);
}

// ------------------------------ main ------------------------------

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--baseline')) {
    runBaseline();
    process.exit(0);
  }

  const fileArgs = args.filter((a) => !a.startsWith('--'));
  const files = fileArgs.length > 0 ? fileArgs.map((a) => path.resolve(a)) : discoverBlogPosts();

  if (files.length === 0) {
    process.stdout.write('No blog posts found.\n');
    process.exit(0);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) {
      process.stderr.write(`slop-check: file not found: ${f}\n`);
      process.exit(2);
    }
    const result = runChecks(f);
    reportFile(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  process.stdout.write(`\nTotal: ${totalErrors} errors, ${totalWarnings} warnings\n`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
