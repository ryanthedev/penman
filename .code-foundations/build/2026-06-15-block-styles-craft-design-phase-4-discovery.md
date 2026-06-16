# Discovery + Design: Phase 4 - Site design-for-ai pass

## Files Found
- `site/index.html` — 613 lines, single-file HTML/CSS marketing page
- `DESIGN.md` — Red Pencil law document, all checkpoints read
- `src/tokens.js` — 418 lines, platform overrides including new `craft` entry (Phase 3)
- `docs/code-standards.md` — site governed by DESIGN.md, not the src/ standards

## Current State
The site is a complete, ship-quality single-page HTML/CSS implementation of the Red Pencil design. The hero choreography (strike wipe-in → stamp landing) shipped in the last commit. The page references "12 platforms" in two places and the brag table lists exactly 12 rows — both are stale now that Phase 3 added `craft` (ALL_PLATFORMS → 13).

All 12 existing brag-table rows are token-true: their Body/Size/Leading/Code values match `src/tokens.js` light overrides exactly (verified by running the token extractor and cross-checking each row).

## Gaps
1. **Platform count stale**: `<span class="n">12</span>` in the numbers strip → must be 13.
2. **OG description stale**: `og:description` reads "12 platforms, 1 command, 0 style blocks." → must read 13.
3. **Brag table missing Craft row**: `craft` is in `platformOverrides` but has no `<tr>` in the recipes table.
4. **Recipes section subtitle stale**: "Twelve targets — chat, documents, email, wikis, decks." → needs to add "notes" or say "Thirteen targets".

## Code Standards
DESIGN.md governs the site — code-standards.md explicitly delegates to it. Key conventions applied:
- Static single-file HTML/CSS, no framework, no build step, no animation library
- Light scheme only (v1)
- WCAG AA contrast maintained
- Radius: 0 everywhere; borders 2px/3px/1px only; hard offset shadows only
- Red = marks/strikes/CTA/current-nav only; Cyan = stamp + success only

## Test Infrastructure
Phase 4 is verified by audit/inspection, not node:test. The regression guard is the existing 72/72 `npm test` suite. No changes to `src/` are made in this phase, so the suite passes by definition (verified: 72/72 before any edits).

## DW Verification

| DW-ID | Done-When Item | Status | Test Cases |
|-------|---------------|--------|------------|
| DW-4.1 | A documented audit of site/index.html against each DESIGN.md checkpoint, pass/fail per item | COVERED | Written audit document at `.code-foundations/build/2026-06-15-block-styles-craft-design-phase-4-audit.md` covering every DESIGN.md section checkpoint |
| DW-4.2 | Token-truth holds — every recipe/px shown matches src/tokens.js, and the platform count reads 13 with a Craft row | COVERED | All 12 existing rows verified against tokens.js (cross-checked by node extraction); Craft row added with exact light-override values; count updated 12→13 in numbers strip, OG meta, and section subtitle |
| DW-4.3 | Safe cleanups applied; no kill-list violation introduced; any DESIGN.md-conflicting finding is reported rather than applied | COVERED | Audit document records each finding as PASS/FAIL/DEFERRED; cleanups applied are behavior-preserving; no finding silently introduced a violation |

**All items COVERED:** YES

## Design Decisions

**Craft row placement:** Craft is a `notes` platform (its comment in tokens.js explicitly names it). The brag table currently groups rows by kind: chat (slack/teams/discord), document (word/google-docs/notion), email (outlook/gmail), wiki (confluence/jira), deck (powerpoint/google-slides). Craft should follow decks as the final group (kind: `notes`). This matches its platformOverrides group comment in tokens.js ("Notes platforms").

**Craft brag-table values** (exact from tokens.js light override):
- Body: `ui-sans-serif` (first token in fontFamily stack)
- Size: `17px`
- Leading: `1.5`
- Code: `ui-monospace · 14px` (first token in codeFontFamily stack, codeFontSize)

**Subtitle update:** "Twelve targets" → "Thirteen targets" is the minimal change. Adding "notes" to the kind list keeps the enumeration honest.

**Dead/duplicate CSS:** Audit found no dead or duplicate CSS rules. The stylesheet is compact and well-organized. A few spacing observations are noted in the audit but are within the declared rhythm and require no changes.

**Refactoring discipline (cc-refactoring-guidance):**
- Fix first (token-truth gap) then cleanup (subtitle text) — both are in-place text substitutions, not structural; treated together since they are all additive content changes to HTML, no behavior changes.
- Changes are small and atomic (4 text substitutions + 1 new `<tr>`).
- The passing test suite (72/72) is the regression guard.
- No reviewer available; checklist self-review applied per SR-9 note.

## Prerequisites
- [x] Required files exist (site/index.html, DESIGN.md, src/tokens.js)
- [x] npm test 72/72 green before any edits
- [x] Phase 3 complete (craft entry in platformOverrides; ALL_PLATFORMS = 13)
- [x] No src/ changes in this phase

## Recommendation
BUILD — four text substitutions + one new table row. No structural redesign needed.
