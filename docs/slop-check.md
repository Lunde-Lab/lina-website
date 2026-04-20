# Slop-check tool

Automated detection of AI-slop patterns in English blog source HTML, driven by the rules in `/docs/writing-style.md`.

## What it does

Scans `/blog/<slug>/index.html` files for:

- **ERROR** (blocks commit): aphoristic "Not X, but Y" constructions, em-dashes in H2 headings
- **WARNING** (reports only): heavy em-dash use (>15 in body), known AI-signature phrases, parallel-symmetric sentence pairs, aphoristic paragraph endings

The thresholds mirror the style guide. If a rule in `/docs/writing-style.md` changes, update `/scripts/slop-check.js` to match.

## Running manually

Check all English blog posts:

```
node scripts/slop-check.js
```

Check specific files:

```
node scripts/slop-check.js blog/starting-co-parenting/index.html blog/birthdays-two-homes/index.html
```

Reassess the em-dash baseline against known-clean articles:

```
node scripts/slop-check.js --baseline
```

See all options:

```
node scripts/slop-check.js --help
```

## Pre-commit hook

Installed at `.git/hooks/pre-commit`. Runs automatically before every commit that touches any staged `blog/<slug>/index.html` file. Blocks the commit on any ERROR.

To bypass in an emergency:

```
LINA_SKIP_SLOP_CHECK=1 git commit -m "..."
```

Use the bypass sparingly. If a rule is legitimately wrong for a specific case, update the style guide and the script instead of relying on bypasses.

## False positives

The parallel-symmetric and aphoristic-ending checks use heuristics and will flag some legitimate sentences. Both are WARNING-only for this reason — they inform human review but do not block.

The "Not X, but Y" check has very low false positive rate and is ERROR-level.

## Hook installation on new clones

Git hooks are not tracked in the repo. When cloning fresh, the hook must be installed manually:

```
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Consider adding this step to the repo README or to a setup script if the team grows.
