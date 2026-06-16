# Research: Block-style coverage, Craft target, site design pass

**What this is:** Scope for the next penman round — close the markdown block-style gaps in the renderer, add Craft as a target (two modes), and a folded-in design-for-ai pass on the marketing site.
**Date:** 2026-06-15 · **Status:** confirmed (ready for `/plan`)
**Still open:** Image-survival strategy (drop-to-alt vs. link); Craft block-JSON schema details; whether the design pass changes anything beyond cleanup (gated on DESIGN.md staying law).

---

## 1. Block styles the renderer doesn't handle

`src/render.js` overrides only 6 marked tokens: `code`, `codespan`, `heading`, `paragraph`, `list`, `table`. Everything else falls through to marked's unstyled defaults. Because penman inlines **all** styling (no `<style>` block), an un-overridden token = unstyled output, and for chat platforms (which strip structural HTML) it often = lost content. Findings below were reproduced live against `notion` and `slack`.

| # | Block | Current behavior | Problem | Sev |
|---|-------|------------------|---------|-----|
| 1 | **Nested lists** | **Throws** `Token with "list" type was not found` | `list` renderer calls `parser.parseInline()` on `item.tokens`; a nested list is a *block* token. Any sub-list crashes the whole conversion. | 🔴 |
| 2 | **Loose / multi-paragraph list items** | Same crash path | A list item containing block content (blank-line-separated paragraphs, nested blocks) hits the same `parseInline` failure. | 🔴 |
| 3 | **Blockquote** | Unstyled `<blockquote>`; raw tag in chat | No inline quote-bar/indent styling. Chat branch doesn't handle it → Slack/Teams strip `<blockquote>`, structure lost. Present in `test/kitchen-sink.md` lines 83–85 but untested. | 🟡 |
| 4 | **Thematic break `---`** | Raw `<hr>` | Unstyled; chat strips `<hr>` → divider silently vanishes. No chat fallback. Present in fixture line 89. | 🟡 |
| 5 | **Task lists `- [ ]` / `- [x]`** | `<input type=checkbox>` | Real checkbox inputs don't survive RTF clipboard paste (Notion/Word/Slack) — render empty or as a stray box. Should be `☐` / `☑` glyphs. | 🟡 |
| 6 | **Images `![]()`** | `<img src>` passthrough | URL images frequently don't survive clipboard RTF; alt text is lost on strip. **Decision needed** (see open questions). | ⚪ |
| 7 | **Strikethrough `~~`** | Default `<del>`, unstyled | Usually survives; no explicit handling, no chat fallback. | ⚪ |

### Root-cause note (drives #1 and #2)
Both crashes are one bug: list items with block content need `this.parser.parse(item.tokens)`, not `parseInline`. Fix shape — keep an inline fast-path for tight single-line items, fall back to full block parsing (and chat-mode flattening) when an item carries block tokens. Highest priority: it's a hard crash, and the existing fixture/test suite doesn't trip it.

### Coverage gap in testing
`test/kitchen-sink.md` exercises blockquote + hr but nothing asserts their output, and it has **no nested list** — which is exactly the crashing case. The block-style work should ship with a fixture that includes nested lists, loose items, task lists, images, and strikethrough.

---

## 2. Craft as a target — **both modes** (confirmed)

Craft is architecturally unlike every current target. Slack/Notion/Word consume **styled HTML on the clipboard** (penman's whole model). Craft also exposes a **native block API** via the connected `mcp__craft__` server (`craft_write` / `craft_read` / `blocks_revert`). Decision: support **both**.

| Mode | Path | Fidelity | Notes |
|------|------|----------|-------|
| **A. Native block writer** | Emit Craft block JSON → `craft_write` (MCP), no clipboard | High — real toggles, dividers, code blocks, quotes | New output path distinct from the HTML/RTF pipeline; penman gains a non-clipboard sink. |
| **B. Clipboard HTML target** | Add `craft` to `platformOverrides` tokens; rely on Craft's HTML/markdown paste handler | Lower — subject to Craft's paste coercion | Consistent with the existing model; cheap; works without the MCP connected. |

**Design implication:** penman's render layer currently assumes "string of styled HTML → clipboard." Mode A introduces a second backend (structured blocks → MCP call). Plan should factor the renderer so block tokens can target either an HTML serializer or a Craft-block serializer from the same parse tree. This also de-risks future native targets (Notion API, etc.).

---

## 3. Site design pass — folded into this work (deferred execution)

Decision: **don't audit/apply now** — carry it into `/plan` as one body of work with the block-style + Craft changes. DESIGN.md ("Red Pencil") remains law; the pass is cleanup *within* the law, not a redirection. Any deviation edits DESIGN.md first, then code.

Concrete checkpoints for the design-for-ai pass to verify `site/index.html` (613 lines, light scheme only in v1) against:

- **Token truth:** every px/recipe value shown on the page equals the actual shipping value in `src/tokens.js` (the page's core proof-claim). Audit must diff displayed recipes vs. real tokens.
- **Kill-list compliance:** no gradients, no border-radius (radius 0 everywhere), no blurred shadows/glass/translucency, no pure #000/#fff (ink `#312d2c`, paper `#fdfcfc`), no emoji decoration, no Inter/Roboto/Open Sans in display duty.
- **Color discipline:** red (`--accent-9/10/11`) only on marks/strikes/CTA/current-nav — never body text, never section backgrounds; cyan only on the after/fixed stamp + success.
- **Type system:** Fraunces (display 900 / 600 italic), Archivo (body), IBM Plex Mono (recipes); scale 1.5 from 16px; leading body 1.5 / display 1.05.
- **Shape/depth:** 2px borders on panels / 3px on hero sheets / 1px table hairlines; hard offset shadows only (`6px 6px 0` rest → `8px 8px 0` hover, ink-colored); rotation ≤ ±1.2° on paper elements only.
- **Motion:** one-shot hero choreography (strikes wipe via `scaleX` L→R, then cyan stamp), per-step ≤200ms, no library; `prefers-reduced-motion` renders everything static. No fades-as-primary, no loops/parallax/scroll-jacking.
- **"Nice and clean" target:** consistent spacing rhythm from the 4/8/16/24/40/64/104 scale (DESIGN.md explicitly wants varied rhythm, not uniform 24px), clean markup, no dead/duplicate CSS.

---

## Recommended sequencing for `/plan`

1. **Fix the crash first** (nested + loose list items) — it's a hard failure with no workaround.
2. **Block-style coverage** — blockquote, hr, task-list glyphs, strikethrough, image decision; chat-mode fallbacks for each; expand the kitchen-sink fixture + add assertions.
3. **Refactor render for dual backends**, then **Craft mode B (clipboard token set)** as the cheap win, then **Craft mode A (native block writer via MCP)**.
4. **Design pass** on `site/index.html` against the checkpoints above — audit, then apply cleanups, token-truth diff last.

## Open questions

- **Images:** drop to alt text, degrade to a link, or keep `<img>` and accept paste loss? (Leaning: link with alt as the label — survives RTF, keeps meaning.)
- **Craft block schema:** confirm the `craft_write` block JSON shape and which markdown constructs map cleanly (toggles, code, quotes, dividers).
- **Dark mode** stays out of scope (DESIGN.md open question — gated on a "desk at night" art-direction pass).
