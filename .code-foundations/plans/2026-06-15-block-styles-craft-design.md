# Plan: Block-style coverage, Craft target, site design pass

**Created:** 2026-06-15
**Status:** in-progress
**Started:** 2026-06-15
**Current Phase:** 1
**Complexity:** medium

---

## Context

**Problem:** penman's renderer (`src/render.js`) only overrides 6 marked tokens; the rest fall through to marked's unstyled defaults — and nested/loose list items *crash the converter* (`parseInline` is called on block tokens → `Token with "list" type was not found`). Common blocks (blockquote, hr, task lists, images, strikethrough) render unstyled or vanish on paste. penman also can't target Craft, and the marketing site hasn't had a design-for-ai pass against DESIGN.md.

**Success criteria:**
- Nested + loose list items render without crashing; blockquote, hr, task lists (`☐`/`☑`), images (link-with-alt), strikethrough all styled with chat-mode fallbacks.
- A real `npm test` assertion harness covers the former crash case + every new block across representative platforms.
- Craft works two ways: a clipboard HTML platform (Mode B) and a `toCraftBlocks(md)` serializer returned via a `penman_craft` tool/CLI for the agent to hand to `craft_write` (Mode A).
- Site passes a design-for-ai audit against DESIGN.md; safe cleanups applied; token-truth (incl. 12→13 platform count) verified.

## Constraints

- **HTML-on-clipboard model.** No `<style>` blocks, no RTF — every style inlined on the element. `src/clipboard.js` sets the `«class HTML»` flavor directly; survival = the target app's HTML paste handler.
- **Every new block needs a chat-mode branch.** `CHAT_PLATFORMS` (Slack/Teams/Discord) strip structural HTML; render flattened `<br>`-separated output as the existing handlers do.
- CommonJS, instance-scoped marked, token-driven styling — match `docs/code-standards.md`.
- DESIGN.md is law for the site; the pass is cleanup *within* it. Any deviation edits DESIGN.md first, then code.
- macOS-only; no new runtime deps unless justified (prefer node's built-in test runner / a tiny script over adding a framework).

---

## Chosen Approach

**A — Extend in place.** Fix + extend the existing marked custom renderer for the HTML path; give Craft a separate, independent token-walker (`src/craft.js`) that consumes marked's lexer token tree → Craft block JSON. No shared intermediate representation. Minimal blast radius on the working HTML renderer, matches the current per-token pattern, ships fast. **Fallback:** if a third native (non-clipboard) target appears (e.g. Notion API), refactor both consumers onto a normalized block IR — the Phase 1 harness makes that refactor safe.

## Rejected Approaches

- **B — Normalized block IR:** one markdown→IR pass with HTML and Craft serializers off the IR. Cleaner and drift-free, but rewrites the shipping HTML renderer (regression risk) and is speculative with only one extra target today. Deferred to the fallback path.

---

## Implementation Phases

### Phase 1: Test harness + characterization
**Model:** sonnet
**Skills:** code-foundations:cc-quality-practices, code-foundations:welc-legacy-code
**Gate:** Standard

**Goal:** Stand up a runnable `npm test` and characterize the renderer's *current* correct behavior so Phases 2–3 can change it under a safety net.

**Scope:**
- IN: a `test` script in `package.json`; a test module that calls `convert(md, resolveTokens(p, theme), p)` and asserts on the returned HTML string; characterization assertions locking current output of the 6 working tokens (heading, paragraph, list [flat], code, codespan, table) across representative platforms (notion, slack, outlook); a documented (skipped/`it.todo`-style) placeholder naming the nested-list crash + each missing block so Phase 2 has explicit targets.
- OUT: any change to `src/`; new-block assertions going green (that's Phase 2); Craft assertions (Phase 3).

**Constraints:** Prefer node's built-in `node:test` + `node:assert` (no new dep) run via `npm test`; if bun is the chosen runner, justify in the test file header. Characterization = assert what code DOES now, not what it should (welc algorithm step 4).

**Edge cases:** chat (slack) vs document (notion) vs email (outlook) produce structurally different output — lock all three. Don't assert on volatile syntax-highlight span ordering; assert on stable structural substrings.

**Approach notes:** User chose a real assertion harness over an expanded manual fixture.
**File hints:** `package.json` (scripts), `test/` (new `*.test.js`), `test/kitchen-sink.md` (reuse as input corpus).
**Depends on:** nothing — entry phase | **Unlocks:** Phase 2, Phase 3
**Produces:** `npm test` runs green; a per-platform assertion harness in `test/` structured so new cases are added by appending — contract: tests invoke `convert(md, resolveTokens(platform, theme), platform) → htmlString` and assert via substring/snapshot.

**Done when:**
- [ ] DW-1.1: `npm test` exists and runs the suite green.
- [ ] DW-1.2: Characterization assertions cover all 6 currently-working tokens across notion + slack + outlook.
- [ ] DW-1.3: A placeholder/skipped case exists for each Phase-2 target (nested list crash, loose item, blockquote, hr, task list, strikethrough, image) naming the expected post-fix behavior.

**Difficulty:** MEDIUM
**Uncertainty:** Runner choice (node:test vs bun test) — either satisfies the contract.

---

### Phase 2: Renderer block coverage + crash fix
**Model:** sonnet
**Skills:** code-foundations:cc-control-flow-quality, code-foundations:cc-refactoring-guidance, code-foundations:code-clarity-and-docs
**Gate:** Standard

**Goal:** Make `convert()` handle every remaining block correctly — starting with the list-recursion crash — each with a chat-mode fallback, flipping the Phase-1 placeholders green.

**Scope:**
- IN: fix the `list` renderer to render block-level item content (nested lists, loose/multi-paragraph items) via block parsing instead of `parseInline`; add handlers for blockquote, thematic break (`hr`), task-list items (`☐`/`☑` glyphs, not `<input>`), strikethrough (`del`), and images (render `![alt](url)` as `<a href="url">alt</a>`); a chat-mode branch for each; extend `test/kitchen-sink.md` with these constructs.
- OUT: Craft anything (Phase 3); site (Phase 4); changing the 6 already-correct handlers beyond what the list fix requires.

**Constraints:** Keep all styling inline from `tokens` (no `<style>`). Chat branches mirror existing flattening (`<br>`/`<br><br>`, `<strong>` headings). Match the file's comment-dense house style — explain *why* a construct needs special paste handling (code-clarity comments-first).

**Edge cases:** deeply nested lists (≥3 levels); ordered-list numbering preserved when items hold block content; blockquote + hr inside chat platforms (which strip `<blockquote>`/`<hr>` → need a text fallback, e.g. `> `-prefixed lines and a `───` rule); image with empty alt (fall back to the URL as link text); task list mixed with normal items.

**Approach notes:** Images degrade to link-with-alt (user decision) — survives paste, keeps destination + meaning.
**File hints:** `src/render.js` (the renderer object — list at :131, add new methods), `test/` (assertions from Phase 1), `test/kitchen-sink.md`.
**Depends on:** Phase 1 | **Unlocks:** —
**Produces:** `convert()` renders blockquote, hr, task lists, strikethrough, images, and nested/loose lists correctly with chat fallbacks; all corresponding specs green. Contract: `convert(md, tokens, platform) → htmlString` signature unchanged; every new block type routed through the existing platform-conditional logic; chat-platform branches emit visible text only (never a bare stripped tag).

**Done when:**
- [ ] DW-2.1: Nested and loose/multi-paragraph list items render without throwing, on chat + document platforms.
- [ ] DW-2.2: Blockquote and hr render styled on document/email platforms and as a visible text fallback on chat platforms.
- [ ] DW-2.3: Task-list items render `☐`/`☑` glyphs (no `<input>`); strikethrough renders; images render as `<a href>alt</a>` (empty alt → URL as label).
- [ ] DW-2.4: All Phase-1 placeholder specs are enabled and green; `npm test` passes.

**Difficulty:** MEDIUM
**Uncertainty:** Exact chat-mode representation for blockquote/hr (text-prefix vs styled span) — settle against the paste-survival goal.

---

### Phase 3: Craft support — both modes
**Model:** opus
**Skills:** code-foundations:aposd-designing-deep-modules, code-foundations:cc-pseudocode-programming, code-foundations:cc-defensive-programming
**Gate:** Full

**Goal:** Let penman target Craft two ways — as a clipboard HTML platform (Mode B) and as a native Craft-block-JSON converter exposed via tool/CLI (Mode A).

**Scope:**
- IN: **Mode B** — add a `craft` entry to `platformOverrides` in `src/tokens.js` and to `PLATFORM_GROUPS` in `src/mcp.js` (new group e.g. `notes`), so the existing HTML pipeline serves Craft's paste handler. **Mode A** — new `src/craft.js` exporting `toCraftBlocks(markdown) → object[]` (JSON-serializable Craft blocks) by walking marked's lexer tokens; a `penman_craft` MCP tool returning the block JSON as text; a CLI path (e.g. `penman --for craft --blocks` or `--craft-blocks`) printing the JSON to stdout. Tests for both across the Phase-1 harness.
- OUT: penman calling the craft MCP itself (agent does that with the returned JSON); HTML renderer refactor; site.

**Constraints:** `toCraftBlocks` is the public seam — design it deep (few methods, internals hidden) per APOSD; one entry point, not a method-per-block-type public surface. Validate input at the boundary (cc-defensive): markdown is external input; unsupported/unknown constructs must **fail loud or degrade visibly**, never silently drop content (APOSD silent-failure red flag). Reuse the marked parse + token shapes already used in `render.js`; don't add a second markdown parser.

**Edge cases:** constructs with no clean Craft-block equivalent (nested tables, raw HTML) — decide map-or-degrade and surface it; empty markdown → `[]`; code blocks → Craft code block with language; the same nested-list structure that crashed HTML must also be handled in the walker. The Craft walker does **not** inherit Phase 2's renderer fixes — nested-list and other shared structures must be independently tested here (shared `test/kitchen-sink.md` corpus, separate assertions).

**Approach notes:** Mode A returns JSON for the agent (user decision) — penman stays a pure converter, no cross-MCP calls. Craft block-JSON schema is an open assumption — verify against the craft MCP before finalizing field names (see Assumptions).
**File hints:** `src/tokens.js` (`platformOverrides`), `src/mcp.js` (`PLATFORM_GROUPS`, tool registration ~:38), `bin/penman.js` (arg parsing :29), new `src/craft.js`, `test/`.
**Depends on:** Phase 1 | **Unlocks:** Phase 4
**Produces:** (1) `craft` selectable in the HTML `penman`/`penman_html` tools + CLI; (2) `src/craft.js` exporting `toCraftBlocks(md: string): object[]`; (3) `penman_craft` MCP tool + CLI flag returning Craft block JSON. ALL_PLATFORMS count becomes 13.
**Rollback:** new MCP tool / CLI flag are additive and reversible — to back out, remove the `penman_craft` registration from `src/mcp.js`, revert the `bin/penman.js` arg-parsing addition, and drop the `craft` entries from `platformOverrides`/`PLATFORM_GROUPS`; `src/craft.js` can stay (no remaining callers). No data migration, no point of no return.

**Done when:**
- [ ] DW-3.1: `penman --for craft` (and the MCP `penman` tool) produces styled HTML on the clipboard via the existing pipeline (Mode B).
- [ ] DW-3.2: `toCraftBlocks(md)` returns a JSON-serializable Craft block array; headings, paragraphs, lists, code blocks, blockquotes, and dividers map to their Craft block types.
- [ ] DW-3.3: A `penman_craft` MCP tool and a CLI flag return the block JSON without touching the clipboard.
- [ ] DW-3.4: Unsupported constructs degrade visibly (logged/marked), never silently dropped; empty input → `[]`; tests cover the mapping + the former crash structure.

**Difficulty:** HIGH
**Uncertainty:** Craft block-JSON schema field names — confirm against the `craft_write` MCP before locking DW-3.2.

---

### Phase 4: Site design-for-ai pass
**Model:** sonnet
**Skills:** code-foundations:cc-refactoring-guidance — the applied cleanups (remove dead/duplicate CSS, normalize spacing rhythm) are behavior-preserving stylesheet refactoring. The *visual* audit (typography/color/layout judgment) is driven by the external `design-for-ai` skill against DESIGN.md (see Approach notes); no code-foundations catalog skill covers visual-design judgment.
**Gate:** Standard

**Goal:** Audit `site/index.html` against DESIGN.md and apply safe cleanups, including reflecting the new Craft platform.

**Scope:**
- IN: run the design-for-ai audit against DESIGN.md checkpoints — token-truth (every shown px/recipe equals `src/tokens.js`), kill-list compliance (no gradients/radius/blurred shadows/glass, ink `#312d2c`/paper `#fdfcfc`, no emoji deco), color discipline (red marks-only, cyan stamp-only), type system (Fraunces/Archivo/IBM Plex Mono, scale 1.5), shape/depth, one-shot motion law; update the platform count 12→13 and add a Craft row to the brag table; apply low-risk cleanups (dead/duplicate CSS, spacing-rhythm consistency).
- OUT: DESIGN.md rewrites (deviations would edit DESIGN.md first, in a separate decision); dark mode; structural redesign; new sections beyond the Craft row.

**Constraints:** Re-read DESIGN.md before editing — it is law. Static single-file HTML/CSS, no framework, no animation library, light scheme only, WCAG AA. Findings that would *violate* DESIGN.md get surfaced, not silently applied.

**Edge cases:** a "cleanup" that conflicts with a DESIGN.md rule → stop and report; the brag table's Craft recipe values must match the Phase-3 `craft` token override exactly (token-truth).

**Approach notes:** User folded the design pass into this body of work; it stays within DESIGN.md, not a redirection. Run the external `design-for-ai` skill to drive the audit (theory-backed typography/color/layout review) against the DESIGN.md checkpoints.
**File hints:** `site/index.html`, `DESIGN.md` (law/checkpoints), `src/tokens.js` (token-truth source incl. new `craft` entry).
**Depends on:** Phase 3 (platform count + Craft recipe) | **Unlocks:** —
**Produces:** audited, cleaned `site/index.html` reflecting 13 platforms and passing the DESIGN.md checkpoints; a short findings note for any DESIGN.md-conflicting items deferred.

**Done when:**
- [ ] DW-4.1: A documented audit of `site/index.html` against each DESIGN.md checkpoint, pass/fail per item.
- [ ] DW-4.2: Token-truth holds — every recipe/px shown matches `src/tokens.js`, and the platform count reads 13 with a Craft row.
- [ ] DW-4.3: Safe cleanups applied; no kill-list violation introduced; any DESIGN.md-conflicting finding is reported rather than applied.

**Difficulty:** MEDIUM
**Uncertainty:** How much cleanup the audit surfaces — scope holds because applied changes are bounded to non-DESIGN.md-conflicting fixes.

---

## Test Coverage

**Level:** 100% of render/serialize logic (`convert()` block paths + `toCraftBlocks()` across notion/slack/outlook/craft). The site pass (Phase 4) is verified by audit, not unit tests.

## Test Plan

- [ ] **Per-DW — clean:** characterization snapshots for the 6 working tokens on notion/slack/outlook (DW-1.2); nested + loose list render on chat + doc (DW-2.1); blockquote/hr styled on doc/email (DW-2.2); task `☐`/`☑`, strikethrough, image→link (DW-2.3); Mode B Craft HTML on clipboard pipeline (DW-3.1); `toCraftBlocks` block-type mapping for heading/paragraph/list/code/quote/divider (DW-3.2); `penman_craft` tool + CLI return JSON, no clipboard side effect (DW-3.3).
- [ ] **Boundary:** list nesting at 1 / 2 / 3 levels; ordered-list numbering with block-content items; image with empty alt (→ URL as label); empty markdown → `toCraftBlocks` returns `[]`.
- [ ] **Dirty (≥1 per code-touching phase):** P2 — the exact nested-list input that currently throws now renders (regression guard); blockquote/hr on a chat platform produce a visible text fallback, not a dropped `<blockquote>`/`<hr>`. P3 — an unsupported construct (raw HTML / nested table) degrades visibly rather than silently dropping; malformed/empty markdown handled at the `toCraftBlocks` boundary without throwing; an unknown platform key is rejected by CLI/enum validation (not silently served the `craft` or default token set — guards Mode B fallthrough). P1 — assert the suite fails loudly if `convert()` throws (so the crash can't regress silently).
- [ ] **Manual:** Phase 4 design audit (visual, against DESIGN.md); one real paste of Craft Mode B HTML and one `craft_write` of Mode A JSON into Craft to confirm fidelity.

## Assumptions

| Assumption | Confidence | Verify Before Phase | Fallback If Wrong |
|---|---|---|---|
| Craft block-JSON schema (field names/block types) is stable and discoverable via the `craft` MCP | MED | Phase 3 | Inspect `craft_read` output on a sample doc to reverse the schema; pin a minimal block subset (heading/text/code/list/quote/divider) |
| node's built-in `node:test` runs cleanly under the project's bun/node runtime | HIGH | Phase 1 | Use `bun test` (justify in test header) — contract (`convert()`-based asserts) is runner-agnostic |
| Craft's HTML paste handler honors inline-styled HTML like other document platforms | MED | Phase 3 | Mode B falls back to a minimal token set; Mode A (native blocks) is the high-fidelity path regardless |
| The site shows a fixed "12 platforms" claim that becomes stale at 13 | HIGH | Phase 4 | If the count is computed/absent, the token-truth check still applies to the brag table rows |

## Decision Log

| Decision | Alternatives Considered | Rationale | Phase |
|---|---|---|---|
| Extend in place; separate Craft walker | Normalized block IR (B) | YAGNI — one extra target; keep working HTML path intact; refactor later under test | All |
| Images → link-with-alt | Keep `<img>`; drop to alt text | Survives HTML paste everywhere, keeps destination + meaning | 2 |
| Mode A returns JSON for the agent | penman shells out to Craft; defer Mode A | penman stays a pure converter; no cross-MCP calls; both modes shipped | 3 |
| Real `node:test` harness + `npm test` | Expand manual fixture only | The crash proves the gap is real; lock it shut and guard regressions | 1 |
| Tests-first (characterization) before renderer change | Tests alongside implementation | Renderer is untested legacy code; welc algorithm — get under test before changing | 1→2 |

---

## Notes

- **HTML, not RTF.** `clipboard.js` deliberately skips RTF (NSAttributedString mangles backgrounds/colors); penman sets `«class HTML»`. "Survives paste" = the target app's HTML handler, which is why every block needs inline styles + a chat fallback.
- The current `test/kitchen-sink.md` already contains a blockquote (L83–85) and hr (L89) but **no nested list** — exactly the untested crashing case. Phase 1 must add nested/loose lists to the corpus.
- Adding `craft` to `platformOverrides` auto-extends `ALL_PLATFORMS` and the `PlatformEnum` (Mode B is "free" once the token entry exists); Mode A is the separate tool/module.
- Open: whether the site should also showcase Craft's *native block* mode (Mode A) as a distinguisher, or just list it as platform #13 — resolve during the Phase 4 audit, within DESIGN.md.

---

## Execution Log

### Phase 1: Test harness + characterization (Gate: Standard)
- [x] BUILD: Discovery + design + implementation (stub → implement → validate) complete
- [x] REVIEW: SKIPPED — tests are gate
- [x] Committed
Commit: 4f7cc02
Summary: Added `npm test` (node:test, no new deps) with 23 characterization assertions locking the 6 working tokens across notion/slack/outlook, plus 7 `test.todo` stubs naming each Phase-2 target; src/ untouched, renderer now under test.
