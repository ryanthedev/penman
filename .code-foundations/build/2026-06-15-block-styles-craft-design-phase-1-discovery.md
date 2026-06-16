# Discovery + Design: Phase 1 - Test harness + characterization

## Files Found

- `package.json` — exists; `scripts` object is empty (no `test` key)
- `src/render.js` — exists; exports `convert(md, tokens, platformName)`
- `src/tokens.js` — exists; exports `resolveTokens(platformName, theme)`
- `test/kitchen-sink.md` — exists; a clean API migration guide fixture (headings, paragraphs, flat lists, code blocks, inline code, table, blockquote, hr); does NOT contain nested lists or loose items
- `test/` directory — exists but contains only `kitchen-sink.md`; no test runner files present

## Current State

- No `test` npm script. No test files.
- `src/render.js` `convert()` handles 6 token types via a custom marked renderer: `code`, `codespan`, `heading`, `paragraph`, `list` (flat only), `table`.
- All other tokens fall through to marked's default renderer — `blockquote`, `hr`, task-list items, `del` (strikethrough), and `image` emit unstyled or browser-default HTML.
- The `list` renderer calls `this.parser.parseInline(item.tokens)` on every item's token array. When an item contains block-level tokens (nested list → a `list` token; loose item → a `paragraph` token), `parseInline` throws `"Token with 'list' type was not found"` / `"Token with 'paragraph' type was not found"`.
- Confirmed crash inputs:
  - Nested list: `- Item A\n  - Sub 1` → throws on notion, slack, outlook
  - Loose item: `- Item A\n\n- Item B` → throws on notion, slack, outlook

## Observed current output (the characterization targets)

### heading — notion
`<h1 style="font-size: 29px; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading One</h1>`
`<h2 style="font-size: 24px; ...">Heading Two</h2>`
`<h3 style="font-size: 20px; ...">Heading Three</h3>`

### heading — slack (CHAT_PLATFORM)
`<strong>Heading One</strong><br><strong>Heading Two</strong><br><strong>Heading Three</strong><br>`

### heading — outlook
`<h1 style="font-size: 20pt; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading One</h1>`

### paragraph — notion
`<p style="margin: 0 0 12px 0;">First paragraph.</p>`

### paragraph — slack
`First paragraph.<br><br>Second paragraph...<br><br>`

### paragraph — outlook
`<p style="margin: 0 0 12px 0;">First paragraph.</p>`

### flat list — notion
`<ul style="margin: 0 0 12px 0; padding-left: 24px;"><li style="margin: 0 0 4px 0;">Alpha</li>...`
`<ol style="margin: 0 0 12px 0; padding-left: 24px;"><li style="margin: 0 0 4px 0;">First</li>...`

### flat list — slack
`• Alpha<br>• Beta<br>• Gamma<br><br>1. First<br>2. Second<br>3. Third<br><br>`

### flat list — outlook
Same as notion (structural HTML, not chat-mode)

### code block — notion
Wrapped in single-cell `<table>` with `<td style="background: #f7f6f3; ...">`, contains `<pre>` + `<code>` + `<span style="color: #24292e;">` wrapper. Syntax spans have inlined styles.

### code block — slack
Same table structure + trailing `<br>`. Uses `background: #f5f5f5` (base, not notion's override).

### code block — outlook
Same table structure; `font-family: Consolas, Courier New, monospace; font-size: 10pt`.

### codespan — notion
`<code style="background: rgba(135,131,120,0.15); border: 1px solid transparent; border-radius: 3px; padding: 2px 5px; font-family: SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; color: #eb5757;">console.log()</code>`

### codespan — slack
`<code style="background: #f0f0f0; border: 1px solid transparent; border-radius: 3px; padding: 2px 5px; font-family: Monaco, Menlo, Consolas, monospace; font-size: 12px; color: #e01e5a;">console.log()</code>`

### codespan — outlook
`<code style="background: #f0f0f0; border: 1px solid transparent; border-radius: 3px; padding: 2px 5px; font-family: Consolas, Courier New, monospace; font-size: 10pt; color: #e01e5a;">console.log()</code>`

### table — notion
`<table style="width: 100%; border-collapse: collapse; border: 1px solid #e4e3e0; ..."><thead>...<th style="text-align: left; ... background: #f7f6f3;">Name</th>...<tbody><tr><td ...>Alice</td><td ...>30</td>...`

### table — slack
Text-mode pre-in-table: `Name  | Age\n------+----\nAlice |  30\nBob   |  25` inside `<pre style="...">`. Trailing `<br>`.

### table — outlook
Same structure as notion but uses base token colors (#e0e0e0 border, #f5f5f5 bg).

## Gaps

| # | Gap | Impact |
|---|-----|--------|
| 1 | No `test` npm script in `package.json` | DW-1.1 requires it |
| 2 | No test file in `test/` | DW-1.2 requires characterization tests |
| 3 | `kitchen-sink.md` has no nested list or loose item | Plan note says Phase 1 must add these to corpus |
| 4 | Phase-2 target placeholders don't exist yet | DW-1.3 requires `todo` stubs |

All gaps are in-scope for Phase 1 to create. No blockers.

## Code Standards

Applied from `docs/code-standards.md`:
- CommonJS only (`require`/`module.exports`)
- No external dependencies — use `node:test` + `node:assert`
- Test entry point calls `convert(md, resolveTokens(platform, theme), platform)` directly
- Assert on structural HTML substrings, not volatile hljs span ordering
- Naming: `camelCase` functions, `UPPER_SNAKE` constants

## Test Infrastructure

- Node v22.17.0 / Bun 1.3.14 both available
- `node:test` verified working: runs TAP output, `test()` + `assert` pattern
- Assumption confirmed: `node:test` runs cleanly — no fallback to bun needed
- No existing test infrastructure to inherit patterns from
- Runner choice: `node --test test/*.test.js` via `npm test`. Justification: no new dep, matches plan preference, CommonJS-native, already verified working in this runtime.

## DW Verification

| DW-ID | Done-When Item | Status | Test Cases |
|-------|---------------|--------|------------|
| DW-1.1 | `npm test` exists and runs the suite green | COVERED | All tests in the file must pass; `npm test` wired to `node --test test/*.test.js` |
| DW-1.2 | Characterization assertions cover all 6 currently-working tokens across notion + slack + outlook | COVERED | `test_DW_1_2_heading_notion`, `test_DW_1_2_heading_slack`, `test_DW_1_2_heading_outlook`, `test_DW_1_2_paragraph_notion`, `test_DW_1_2_paragraph_slack`, `test_DW_1_2_paragraph_outlook`, `test_DW_1_2_list_notion`, `test_DW_1_2_list_slack`, `test_DW_1_2_list_outlook`, `test_DW_1_2_code_notion`, `test_DW_1_2_code_slack`, `test_DW_1_2_code_outlook`, `test_DW_1_2_codespan_notion`, `test_DW_1_2_codespan_slack`, `test_DW_1_2_codespan_outlook`, `test_DW_1_2_table_notion`, `test_DW_1_2_table_slack`, `test_DW_1_2_table_outlook` (18 characterization tests = 6 tokens × 3 platforms) |
| DW-1.3 | A placeholder/skipped case exists for each Phase-2 target (nested list crash, loose item, blockquote, hr, task list, strikethrough, image) | COVERED | 7 `todo` stubs: `todo_nested_list_crash`, `todo_loose_item_crash`, `todo_blockquote`, `todo_hr`, `todo_task_list`, `todo_strikethrough`, `todo_image` |

**All items COVERED:** YES

## Design Decisions

**Runner:** `node --test test/*.test.js`. Verified clean on Node v22.17.0. No `bun test` needed. Zero new deps.

**Test file structure:** Single file `test/render.test.js` organized in three `describe`-equivalent suites using `node:test`'s `describe()`:
1. `characterization — heading` — 3 subtests (notion/slack/outlook)
2. `characterization — paragraph` — 3 subtests
3. ... (one describe per token type, 6 total)
4. `Phase 2 targets (todo)` — 7 `it.todo()` stubs

**Assertion strategy for code blocks:** Assert on the structural table wrapper (`<table style="width: 100%`) and the `<pre style="margin: 0; white-space: pre;` substring, plus a content substring for the literal source text. Do NOT assert on specific `<span style=...>` ordering (hljs output is volatile).

**Assertion strategy for tables on slack:** Assert on the pre-wrapped text table structure (`<pre style=...>`) and content substrings (`Name  | Age`, `------+----`).

**Characterization discipline (WELC step 4):** Assertions lock what the code DOES now, not what it should. The nested-list crash is documented as a `todo` with the expected post-fix behavior, not tested as a passing case.

**No change to `src/`:** This phase is purely additive to `test/` and `package.json`.

## Prerequisites

- [x] `src/render.js` exports `convert` — verified
- [x] `src/tokens.js` exports `resolveTokens` — verified
- [x] `node:test` available and functional — verified
- [x] All 6 token outputs captured across all 3 platforms — probed and recorded above
- [x] Both crash inputs confirmed — nested list + loose item both throw as documented

## Recommendation

BUILD
- Add `"test": "node --test test/*.test.js"` to `package.json` scripts
- Create `test/render.test.js` with 18 characterization tests + 7 todo stubs
- Update `test/kitchen-sink.md` to add nested list and loose item examples (for reference; not used as test input since these crash — the test file uses inline fixtures)
