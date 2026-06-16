# Discovery + Design: Phase 2 - Renderer block coverage + crash fix

## Files Found

- `src/render.js` — the marked renderer (218 lines); `list` method at line 131 calls `parseInline` on item tokens (the crash site)
- `test/render.test.js` — 23 passing characterization tests + 7 `test.todo` stubs to flip green
- `test/kitchen-sink.md` — Phase-2 corpus appended at line 95: nested list, loose items, blockquote, hr, task list, strikethrough, image
- `src/tokens.js` — token definitions; `EMAIL_PLATFORMS` exported; no blockquote/hr/del/image token keys exist (these use generic inline styles)
- `docs/code-standards.md` — confirms: no `<style>` blocks, all styles inlined, CommonJS, `CHAT_PLATFORMS` branch required for every new block handler

## Current State

`src/render.js` defines a marked custom renderer with 6 method overrides: `code`, `codespan`, `heading`, `paragraph`, `list`, `table`. The `list` renderer calls `this.parser.parseInline(item.tokens)` unconditionally — this throws a "Token with 'list' type was not found" error when `item.tokens` contains block-level tokens (nested lists, paragraphs in loose items), because `parseInline` only handles inline tokens. No handlers exist for `blockquote`, `hr`, `del`, or `image` — marked's defaults fire, emitting unstyled HTML. Task-list items flow through the `list` handler but `item.task`/`item.checked` are never checked, so `<input type="checkbox">` elements appear in the default output. `npm test` shows 23 passing, 7 todo stubs.

## Gaps

| Gap | Reality | Required |
|-----|---------|---------|
| `list` crashes on nested/loose content | `parseInline(item.tokens)` called for ALL items; throws when block tokens present | Switch to `this.parser.parse(item.tokens)` for block content, use `parseInline` for flat inline-only items |
| No `blockquote` handler | marked default emits `<blockquote>` (stripped on chat paste) | Styled `<blockquote>` on doc/email; `> ` prefix text on chat |
| No `hr` handler | marked default emits bare `<hr>` (stripped on chat paste) | Styled `<hr>` on doc/email; `───` text rule on chat |
| No `del` handler | marked default emits unstyled `<del>` | `<del style="text-decoration: line-through;">` |
| No `image` handler | marked default emits `<img>` (stripped on paste) | `<a href="url">alt</a>`; empty alt → URL as label |
| Task items not handled | `item.task`/`item.checked` ignored; `<input>` emitted | Guard in `list` item loop: if `item.task`, prepend `☐`/`☑`, suppress `<input>` |

## Code Standards

From `docs/code-standards.md` and the house style in `src/render.js`:
- All styles inline on the element — no `<style>` blocks
- Every new block handler requires a `CHAT_PLATFORMS` branch that emits visible text (never a bare stripped tag)
- CommonJS (`require`/`module.exports`)
- Function names: `camelCase`, verb-first
- Constants: `UPPER_SNAKE`
- Comment-dense house style: explain *why* a construct needs special paste handling (code-clarity/comments-first)
- `this.parser.parse(tokens)` for block-level; `this.parser.parseInline(tokens)` for inline-only
- `EMAIL_PLATFORMS` already imported from tokens; `CHAT_PLATFORMS` already defined at module scope

## Test Infrastructure

Node's built-in `node:test` runner, `node:assert/strict`. Run via `npm test` → `node --test test/*.test.js`. Tests call `convert(md, resolveTokens(platform, "light"), platform)` and assert on substrings of the returned HTML. The `bodyOf()` helper strips the `<html>/<body>` wrapper; `assertContains()` checks substring membership. Todo stubs use `test.todo()`.

## DW Verification

| DW-ID | Done-When Item | Status | Test Cases |
|-------|---------------|--------|------------|
| DW-2.1 | Nested and loose/multi-paragraph list items render without throwing, on chat + document platforms | COVERED | `DW_2_1_nested_list_notion`, `DW_2_1_nested_list_slack`, `DW_2_1_loose_list_notion`, `DW_2_1_loose_list_slack` (replace todo stubs); also add: ordered list with block content, 3-level nesting |
| DW-2.2 | Blockquote and hr render styled on document/email platforms and as a visible text fallback on chat platforms | COVERED | `DW_2_2_blockquote_notion`, `DW_2_2_blockquote_slack`, `DW_2_2_hr_notion`, `DW_2_2_hr_slack`, `DW_2_2_hr_outlook` (replace todo stubs) |
| DW-2.3 | Task-list items render `☐`/`☑` glyphs (no `<input>`); strikethrough renders; images render as `<a href>alt</a>` (empty alt → URL as label) | COVERED | `DW_2_3_task_list_notion`, `DW_2_3_task_list_slack`, `DW_2_3_strikethrough_notion`, `DW_2_3_image_notion`, `DW_2_3_image_empty_alt` (replace todo stubs) |
| DW-2.4 | All Phase-1 placeholder specs are enabled and green; `npm test` passes | COVERED | All 7 todo stubs converted to real tests; regression: crash detection suite updated to assert the former-crash inputs now render without throwing |

**All items COVERED:** YES

## Design Decisions

**List fix — `parse` vs `parseInline` selection:** The root crash is calling `parseInline` on `item.tokens` when the item contains block-level tokens (the `list` type from nested lists, the `paragraph` type from loose items). The fix: replace `parseInline(item.tokens)` with `parse(item.tokens)`. This works for both flat (tight) items and block-content (loose) items because `parse()` handles inline tokens too — it dispatches inline tokens through the inline renderer and wraps them. **No flag needed to distinguish tight vs loose items** — `parse()` works uniformly.

Implication for existing characterization tests: the `list` output for flat items on notion/slack/outlook will wrap text in `<p style="margin: 0 0 12px 0;">` inside `<li>` when items contain only inline tokens but `parse()` is used. Wait — this IS a regression risk. The existing `DW_1_2_list_*` tests assert `<li style="margin: 0 0 4px 0;">Alpha</li>` (no inner `<p>`). Need to verify: does `parse()` on a tight item's tokens wrap in `<p>`?

Analysis: marked's `item.tokens` for a tight list item contains `[{type: "text", ...}]`. When `parse()` is called on those tokens, the paragraph renderer fires if the token type is `paragraph`. For tight items, the token type is `text` not `paragraph` — so `parse()` dispatches to the text inline renderer, no `<p>` wrapper. For loose items, the token type IS `paragraph`, so `parse()` will call the paragraph renderer → `<p>` wrapper. This means switching to `parse()` preserves tight-list output and handles loose items correctly. The existing characterization tests will still pass.

**Task items — guard in the loop, not a separate handler:** marked does not call a separate token method for task items; they flow through `list` as `item.task = true, item.checked = true/false`. The fix is a guard at the top of the per-item map: check `item.task`, prepend `☐`/`☑`, and the item content is already handled by `parse()` (so the `<input>` from marked's default text won't appear — actually it will appear in `item.tokens` as raw HTML). The cleanest approach: if `item.task`, strip the first `<input ...>` from the parsed content (it appears as a raw_html token in item.tokens), then prepend the glyph.

Alternative: filter `item.tokens` to remove raw_html tokens before parsing. This is safer than regex-stripping the rendered output. The first token in a task item's tokens array is a `raw_html` token containing the `<input...>` element; remove it before calling `parse()`.

**Chat fallback for blockquote:** `> ` prefix on each line of the block content. Parse the block content to text (strip tags), split on newlines, prefix each non-empty line with `> `. Wrap in `<span>` with `white-space: pre` so line breaks survive paste.

**Chat fallback for hr:** A Unicode rule: `────────────────────` inside a `<span>` (or just plain text `───`). Use `─` (U+2500 BOX DRAWINGS LIGHT HORIZONTAL) × 20, followed by `<br><br>` for spacing.

**Strikethrough (`del`):** Simple — marked calls `del({ tokens })` on the renderer. Add a handler: `del({ tokens }) { return \`<del style="text-decoration: line-through;">${this.parser.parseInline(tokens)}</del>\`; }`. No chat-mode distinction needed — `<del>` survives chat paste handlers (it's inline, not structural).

**Image:** `image({ href, title, text })` where `text` is the alt. Render as `<a href="href" style="color: ${tokens.link};">alt_or_href</a>`. Empty alt → use `href` as label. For email platforms, the link color is already inlined by the post-pass `inlineLinkStyles()`. No chat branch needed — `<a>` survives chat paste.

**Control flow (cc-control-flow-quality):** The list handler's item map currently has no nesting guard. With the task-item guard added, nesting depth stays at 2 (map callback → if task → else). The `blockquote` handler for chat needs to strip tags and prefix lines — use `.split("\n").map().join()` pipeline (functional, no explicit loop, FP-1 checklist). McCabe complexity for the list handler will be ≤ 6 after changes (ordered, chat, task guards).

## Prerequisites

- [x] Required files exist (`src/render.js`, `test/render.test.js`, `test/kitchen-sink.md`)
- [x] Dependencies available (marked, highlight.js, node:test)
- [x] Phase 1 baseline: 23 passing, 0 failures — anchoring established
- [x] `this.parser.parse()` is available (it is — used in `table` handler via `parseInline`; `parse()` is on the same object)

## Recommendation

BUILD — all gaps are addressable, prerequisites met, no design ambiguity remaining.
