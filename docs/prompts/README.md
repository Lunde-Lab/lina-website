# Prompts

This directory holds reusable prompt fragments for Claude Code tasks that recur across the Lina website project.

## Files

- `blog-post-header.md` — boilerplate prepended to every prompt that creates or edits a blog post. Covers project context, style guide reference, build pipeline, file-change checklist, safety checks.

## How to use

When writing a new prompt for a blog post task:

1. Open the relevant header file (`blog-post-header.md`).
2. Copy its full contents.
3. Paste it as the first section of your Claude Code prompt.
4. Add a second section below that contains only the task-specific content — slugs, i18n key number, English section text, language slug map, and any post-specific instructions.
5. Send the combined prompt to Claude Code.

The header is versioned with the rest of the repo, so when the build pipeline or style rules change, updating the header in one place propagates to every future prompt.

## When to update a header

Update `blog-post-header.md` when:
- A constant in `scripts/build-i18n.js` changes that affects new blog posts (SOURCE_FILES shape, ARTICLE_MAP pattern, LOCALE_SCREENSHOT_MAP)
- A new language is added to the site
- The style guide changes materially (new banned construction, changed em-dash budget, new required anchor type)
- A new file (like the blog index or sitemap) needs coordinated updates on every post

Do NOT update the header for:
- Content-specific changes (those go in the per-prompt task section)
- One-off style decisions for a single post
- Experimental changes — prove them out on one post first, then promote to the header
