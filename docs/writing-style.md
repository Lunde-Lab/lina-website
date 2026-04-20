# Lina writing style

This guide governs all user-facing written content: blog posts, landing pages, marketing copy, email templates, and any text that ships to end users. It does not govern code comments, commit messages, internal documentation, or developer-facing text.

## Core principle

A rougher, more direct article beats a polished one that reads as AI-generated.

When in doubt, cut the sentence rather than rewrite it. Concrete beats clever. Specific beats general. Plain beats poetic. A three-paragraph section with concrete anchors is better than a six-paragraph section with elegant transitions.

**If forced to choose between a weaker article and one that reads as clearly AI-written, always choose the weaker article.**

## Brand voice (positive rules — apply always)

- Calm, adult tone. The reader is an intelligent grown-up in a difficult situation, not someone who needs hand-holding or cheerleading.
- No exclamation marks, in any language, ever. This is non-negotiable.
- Use care vocabulary, not custody vocabulary: "care" not "custody", "omsorg/samvær" (NO/DA), "omsorg/umgänge" (SV), "huoltajuus/tapaaminen" (FI), "Umgang/Betreuung" (DE), "zorg/omgang" (NL), "garde/coparentalité" (FR).
- UK spelling throughout English content: counsellor, organised, behaviour, neighbourhood, favourite.
- Short paragraphs (2–4 sentences) over long ones. One idea per paragraph.
- Write to the reader as a peer, not as an expert lecturing a layperson.

## Required concrete anchors

Every section of an article must contain at least ONE concrete anchor. A concrete anchor is:

- **A specific timeframe** — "4–6 weeks", "within 24 hours", "by August each year", "six to eight weeks before the pattern feels ordinary"
- **A specific age range** — "children under 6", "from around 12", "ages 3–6"
- **A named resource** — Familieretshuset (DK), familjerätten (SE), Jugendamt (DE), familievernkontoret (NO), lastenvalvoja (FI), Juridisch Loket (NL), Point-justice (FR), Bufdir (NO parental guidance)
- **A specific procedure** — "a signed consent letter listing dates, destination, and both passport numbers"
- **A named example with numbers** — "'We discuss anything above 500 kroner' is easier to follow than 'larger expenses'"

Named resources must be factually verified before including. When in doubt, use the generic category ("the municipal family mediation service") rather than invent a specific name.

Sections without at least one concrete anchor should be rewritten until they have one, or cut.

## Banned constructions

These are banned outright, in every language, without exception. Apply the rule to translations too, not only the English source.

### 1. The "Not X, but Y" construction (and its variants)

This is the single most recognizable AI cadence. Every instance must be rephrased as either a direct positive statement, or split into two sentences with the negation removed.

- Wrong: "The point is predictability, not precision."
- Wrong: "Not a winner, but a process."
- Wrong: "The goal is not perfection but consistency."
- Right: "The goal is predictability." (just delete the contrast)
- Right: "Aim for consistency." (drop the contrast entirely)

Includes close variants: "X, not Y", "not A — B", "less about X, more about Y".

### 2. Aphoristic paragraph endings (fortune-cookie lines)

A paragraph must not end on a clever one-liner that summarises in abstract terms what the preceding concrete sentences already said. These read as AI-authored by default.

- Wrong: "Memory is the enemy of fairness here."
- Wrong: "Concrete beats abstract."
- Wrong: "The calendar is not everything."
- Wrong: "Read the child."
- Wrong: "Verbal updates disappear; written ones survive."

**Test:** if the closing sentence could be printed on a fridge magnet, delete it. The preceding concrete sentence becomes the new ending.

### 3. Parallel-symmetric sentence pairs

Two short sentences with mirrored structure, usually placed at the end of a paragraph for rhetorical effect. A near-universal AI tell.

- Wrong: "Facts over feelings. Questions over accusations."
- Wrong: "The child's needs belong. Past relationship matters do not."
- Wrong: "Short messages are better than long ones. Facts over feelings."

Replace with a single sentence that states the actual content, or with an inclusion/exclusion list that is concrete.

### 4. Em-dash overuse

Em-dashes are one of the most visible AI fingerprints in long-form text. Budget strictly.

- **Maximum 6 em-dashes per article body.** Count in the source HTML; exclude template boilerplate and titles.
- **Never in headings.** Use a colon instead: "Communication: how and how often", not "Communication — how and how often".
- **Never for dramatic pause.** Split into two sentences or use a period.
- **Never in the "Not X — Y" construction.** (See rule 1; this is double-banned.)
- Em-dashes are allowed only when:
  - (a) The inserted phrase is a genuine parenthetical aside the reader could skip without losing the sentence, OR
  - (b) A comma would cause real grammatical ambiguity.

If a sentence contains more than one em-dash, rewrite it until only one remains, or none.

### 5. Faux-folksy imperatives

Short commanding sentences framed as earthy wisdom. Always reads as AI.

- Wrong: "Read the child."
- Wrong: "Trust your gut."
- Wrong: "Future-you will thank you."
- Wrong: "Lean in."

Replace with explicit guidance: "For children under 6, one celebration works better than two."

### 6. Triadic cadence for its own sake

Three-item lists ("practically, emotionally, and logistically"; "a drawer that is theirs, a toothbrush waiting for them, a parent who is ready when they arrive") are not banned, but one per section is the maximum. When every paragraph has a triplet, the rhythm itself becomes the AI tell, regardless of content.

### 7. AI-signature phrases

Delete these phrases on sight. They add nothing and signal machine authorship:

- "Here is what tends to help..."
- "That is normal."
- "This is common."
- "The most important thing is..."
- "the child will notice"
- "at the end of the day"
- "navigating" (as in "navigating a difficult situation")
- "unpack" (as in "let's unpack this")
- "journey" (as in "your co-parenting journey")
- "embrace" (as in "embrace this new reality")

## Translation rules (all 8 locales)

All rules above apply in every language. The banned constructions are banned regardless of whether they are written in English, Norwegian, German, or any other supported language. AI-slop in Norwegian reads as AI-slop; the rules do not relax in translation.

Specific translation guidance:
- Match the tonal register of the oldest clean articles in that locale (blog1, blog4, blog6) rather than the newest ones.
- Em-dashes are used less frequently in Nordic languages than in English. The budget is still 6, but 2–3 is more natural.
- The "Not X, but Y" construction reads as AI in every language — in German ("nicht X, sondern Y"), in French ("pas X, mais Y"), in Dutch ("niet X, maar Y"). Apply the rule equally.

## Structural rules

- Aim for 6 sections in a full blog post, each with 2–3 short paragraphs. Blog1 through blog6 set the established structure.
- H2 section headings should be plain and descriptive. Not poetic. "Coordinating gifts", not "Gifts without comparison". "Review the agreement yearly", not "Review, update, and disagree well".
- The lead paragraph (first paragraph under the title) sets the tone for the whole article. It should state what the article is about in plain language within three sentences, without rhetorical flourishes.
- The CTA block at the end is a product pitch, not a continuation of the article. It can be warmer and more promotional, but still no exclamation marks.

## Working with Claude Code

When asking Claude Code to write or edit blog content, always include "Follow /docs/writing-style.md" in the prompt. Do not rely on Claude Code reading existing articles as templates — several of them contain the exact slop patterns this guide rejects.

When reviewing Claude-generated drafts, check in this order:
1. Count the em-dashes. If more than 6, cut before reading further.
2. Read each paragraph's closing sentence. Delete every aphoristic line.
3. Search for "not X, but Y" / "X, not Y" constructions. Rephrase each.
4. Check that every section has a concrete anchor. Add one where missing.
5. Only then read for tone and flow.

## When to break the rules

These rules are defaults, not absolutes. Break them when:
- A direct quote from a named person requires the original phrasing.
- A legal or regulatory term must be reproduced exactly (e.g. a statute name).
- The alternative would be less accurate, not just less elegant.

Never break them because "it sounds better" or "it flows better". That instinct is precisely what produces AI-slop.
