---
name: lt-seo-ranking
description: Improve Google rankings for socialinesvalandos.dev on Lithuanian keywords (e.g. "socialinės valandos", "kaip surinkti socialines valandas"). Use when the user asks for an SEO upgrade, to rank higher, or why a keyword doesn't rank.
---

# Lithuanian SEO ranking workflow

## When to use
- "Full SEO upgrade", "get us to #1", "we don't rank for X".

## Workflow
1. Check evidence first:
   - `google_search_console--diagnose` (needs a published site; otherwise say so).
   - `semrush--keyword_research` with `database: "lt"` for the target term and question variants. Volumes are small (≈140/mo for "socialinės valandos"); zero means unknown, not none.
2. Map each keyword to ONE page (no two pages competing):
   - "socialinės valandos" → `/` (home)
   - "kas yra socialinės valandos" → `/blog/kas-yra-socialines-valandos`
   - "kaip surinkti socialines valandas" → `/blog/kaip-surinkti-socialines-valandas`
   - "socialinių valandų lapas" → `/socialiniu-valandu-lapas`
   - mokykloms / Šeduva → their own landing pages
3. On the mapped page: start `<title>` with the exact phrase, use it in the description, a visible H1/H2 and the first paragraph. Visible text beats `sr-only` text.
4. Link every guide page from the home page and from each other with keyword anchor text.
5. Keep `public/sitemap.xml`, `public/robots.txt` and `public/llms.txt` in sync when adding a page.
6. Only write facts the project supports; ask the user for anything else.

## Conventions
- Lithuanian with diacritics in visible copy; ASCII variants only in `keywords` meta.
- Canonical/og:url use `https://socialinesvalandos.dev/...`.
- Don't add FAQPage as a new SEO tactic.

## Validation
- Build passes; page `head()` shows the new title.
- Remind the user rankings only move after publishing and Google re-crawling (days–weeks); request indexing in Search Console.
