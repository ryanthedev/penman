# Review: Phase 3 - Craft Block JSON + Mode B

## Executed Results (Step 0)

| Command | Result |
|---------|--------|
| `npm test` (node --test test/*.test.js) | 72 pass / 0 fail / 0 skip |
| CLI `printf '# Hi\n\ntext' \| node bin/penman.js --craft-blocks` | Valid JSON array to stdout, no clipboard message |
| CLI `--for craft --craft-blocks` | Platform flag ignored; block JSON emitted, no clipboard |
| Empty whitespace input via `--craft-blocks` | Prints `[]` |
| `toCraftBlocks(null/42/{})` | All throw with "must be a string" |
| JSON round-trip (JSON.parse(JSON.stringify(blocks))) | OK — no loss, no circular refs |
| Nested list (former crash structure) | 6 blocks produced, `indentationLevel: 2` on deep item |
| Mode B: `convert(md, resolveTokens('craft','light'), 'craft')` | `<h1 style=...>`, `ui-sans-serif`, no chat flattening |

---

## Requirement Fulfillment

### DW-3.1
PREMISE:  "`penman --for craft` (and the MCP `penman` tool) produces styled HTML on the clipboard via the existing pipeline (Mode B)."
EVIDENCE: src/tokens.js:328-357 (craft token entry with `ui-sans-serif` font stack); src/mcp.js:40-57 (`penman` tool calls `render()`→`copyToClipboard()`); bin/penman.js:97-103 (`run()` calls `convert()` then `copyToClipboard()`); test/craft.test.js:47-78 (DW-3.1 describe block, 4 tests)
TRACE:    `printf '# Hi\n\ntext' | node bin/penman.js --for craft` → `resolveTokens('craft','light')` merges craft overrides into base tokens → `convert(md, tokens, 'craft')` renders `<h1 style="...">Hi</h1>` with `ui-sans-serif` font → `copyToClipboard(html)` → "Copied to clipboard". Test `DW_3_1_convert_craft_produces_styled_html` ran and passed.
VERDICT:  PASS

### DW-3.2
PREMISE:  "`toCraftBlocks(md)` returns a JSON-serializable Craft block array; headings, paragraphs, lists, code blocks, blockquotes, and dividers map to their Craft block types."
EVIDENCE: src/craft.js:29-185 (full implementation); test/craft.test.js:83-193 (12 tests in DW-3.2 describe block)
TRACE:    `toCraftBlocks("# One\n\npara\n\n- a\n\n\`\`\`js\nx\n\`\`\`\n\n> q\n\n---")` → marked lexer emits tokens → walkToken dispatches each: heading→`{type:"text",textStyle:"h1"}`, paragraph→`{type:"text",markdown:"para"}`, list→`{type:"text",listStyle:"bullet"}`, code→`{type:"code",language:"js",rawCode:"x"}`, blockquote→`{type:"text",decorations:["quote"]}`, hr→`{type:"line",lineStyle:"regular"}`. JSON round-trip test passed. All 12 DW-3.2 tests passed.
VERDICT:  PASS

### DW-3.3
PREMISE:  "A `penman_craft` MCP tool and a CLI flag return the block JSON without touching the clipboard."
EVIDENCE: src/mcp.js:77-91 (`penman_craft` tool calls `toCraftBlocks(markdown)` then `ok(JSON.stringify(blocks, null, 2))` — no `copyToClipboard` call); bin/penman.js:66-77 (`--craft-blocks` branch calls `toCraftBlocks()` then `console.log(JSON.stringify(...))` then `return` — no clipboard path); test/craft.test.js:198-238 (5 tests in DW-3.3 describe block)
TRACE:    `printf '# Title\n\nA paragraph.' | node bin/penman.js --craft-blocks` → `craftBlocks` flag set → `readInput` triggers → `toCraftBlocks(md)` → `console.log(JSON.stringify(blocks, null, 2))` → JSON array on stdout, no "Copied to clipboard" string. Test `DW_3_3_cli_craft_blocks_no_clipboard_message` passed. `DW_3_3_penman_craft_tool_shape` verifies MCP path unit-level.
VERDICT:  PASS

### DW-3.4
PREMISE:  "Unsupported constructs degrade visibly (logged/marked), never silently dropped; empty input → `[]`; tests cover the mapping + the former crash structure."
EVIDENCE: src/craft.js:49-58 (`unsupportedBlock()` preserves `unsupportedType` + `markdown` verbatim); src/craft.js:151-154 (default case in walkToken routes to `unsupportedBlock`); src/craft.js:167-171 (empty/whitespace → `[]`); test/craft.test.js:243-342 (8 tests in DW-3.4 describe block, including empty, whitespace, non-string, nested list crash structure, loose list, raw HTML, table, mixed doc)
TRACE:    `toCraftBlocks("<div>raw block</div>")` → marked lexes as `html` token → `walkToken` hits `default` → `unsupportedBlock("html", "<div>raw block</div>")` → `{type:"unsupported",unsupportedType:"html",markdown:"<div>raw block</div>"}`. `DW_3_4_raw_html_degrades_visibly` passed. `toCraftBlocks("")` → trim is "" → returns `[]`, test `DW_3_4_empty_input_returns_empty_array` passed. `toCraftBlocks(null)` → typeof check → throws "must be a string, got object", test `DW_3_4_non_string_input_throws` passed.
VERDICT:  PASS

---

## Test-DW Coverage

| DW Item | Tests | Status |
|---------|-------|--------|
| DW-3.1 | `DW_3_1_craft_is_a_platform_and_count_is_13`, `DW_3_1_craft_in_notes_group`, `DW_3_1_convert_craft_produces_styled_html`, `DW_3_1_unknown_platform_not_silently_served_craft` | Ran, all PASS |
| DW-3.2 | 12 tests covering heading, h5/h6 clamp, paragraph, bullet list, ordered list, task list, code+language, code no language, blockquote, divider, image, JSON serializability | Ran, all PASS |
| DW-3.3 | `DW_3_3_cli_craft_blocks_prints_json`, `DW_3_3_cli_craft_blocks_matches_toCraftBlocks`, `DW_3_3_cli_craft_blocks_no_clipboard_message`, `DW_3_3_cli_craft_blocks_ignores_platform`, `DW_3_3_penman_craft_tool_shape` | Ran, all PASS |
| DW-3.4 | 8 tests covering empty, whitespace, non-string×3, nested-list-crash-structure, loose list, raw HTML, table, mixed kitchen-sink | Ran, all PASS |

- [x] All DW items have corresponding automated tests that ran in Step 0
- [x] Test coverage matches the stated "100% of render/serialize logic" level — every branch in `walkToken` (space, heading, paragraph, paragraph-with-image, code, blockquote, hr, list, image, default) and every block constructor has at least one test; boundary conditions (empty, whitespace, non-string) are covered; the nested/loose list crash structure is independently exercised

---

## Edge Cases

| Edge Case | Handling | Evidence |
|-----------|----------|----------|
| Unsupported constructs (nested tables, raw HTML) degrade to visible marker, never silently dropped | `unsupportedBlock()` at craft.js:49-58; `default` case at craft.js:150-154 | `DW_3_4_raw_html_degrades_visibly` (PASS), `DW_3_4_table_degrades_visibly` (PASS); verified in scratch output |
| Empty/whitespace-only → `[]` | craft.js:170-172 — `markdown.trim() === ""` check | `DW_3_4_empty_input_returns_empty_array` and `DW_3_4_whitespace_input_returns_empty_array` (both PASS); CLI with whitespace-only stdin printed `[]` |
| Code blocks carry language | craft.js:34-38 — `codeBlock(lang, rawCode)` sets `language` field; empty string when no lang | `DW_3_2_code_block_with_language` (`language: "python"`) and `DW_3_2_code_block_without_language` (`language: ""`) both PASS |
| Nested/loose-list crash structure handled independently (not inherited from HTML renderer) | craft.js:62-104 — `walkList` and `ownItemText` walk the marked token tree independently; no shared code path with src/render.js | `DW_3_4_nested_list_does_not_crash` and `DW_3_4_loose_list_does_not_crash` PASS; scratch confirmed 6-block output with `indentationLevel: 2` |
| JSON-serializable round-trip | No functions, no circular refs in output objects; verified via `JSON.parse(JSON.stringify(blocks))` | `DW_3_2_output_is_json_serializable` PASS; scratch round-trip test OK |
| Non-string input rejected at boundary | craft.js:167-169 — `typeof markdown !== "string"` throws | `DW_3_4_non_string_input_throws` covers null/42/{} — all PASS; scratch independently confirmed |

All prompt-listed edge cases: HANDLED.

---

## Dead Code

None found. No unreachable branches (every `switch` case has a `return`, the `default` is reachable by any unmapped token). No debug `console.log` statements in implementation files. No unused imports (`Marked` is used in `toCraftBlocks`; all imports in mcp.js and bin/penman.js are used on their respective paths).

One minor observation: `imageBlock` and `find` (in the test helper) are both used; no dead code in tests.

---

## Correctness Dimensions

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Concurrency | N/A | `toCraftBlocks` is a pure function. `new Marked({...})` inside the function creates an instance-local lexer; comment at craft.js:174 explicitly notes "no global marked state, safe under concurrent calls." MCP tool is async but creates no shared mutable state across invocations. |
| Error Handling | PASS | Non-string input throws loud (craft.js:167-169). CLI catches and exits with code 1 (bin/penman.js:70-74). MCP tool catches and returns `err()` response (mcp.js:87-89). Empty/whitespace returns `[]` (documented edge case, not error). |
| Resources | N/A | No file handles, no DB connections, no persistent sockets opened by craft.js or the craft path. The `new Marked()` instance is GC'd after each call. |
| Boundaries | PASS | Heading depth clamped to MAX_CRAFT_HEADING=4 (craft.js:19, 30). Empty `lang` normalized to `""` not `undefined` (craft.js:35). `token.raw != null ? token.raw : ""` guards the unsupported block (craft.js:153). `ownItemText` falls back through `.text` if no text/paragraph token found (craft.js:72-74). |
| Security | N/A | `toCraftBlocks` is a pure Markdown-to-JSON converter — no shell execution, no network calls, no file I/O. Output is a plain JS object array serialized to JSON; no injection surface. CLI reads stdin or a file path already resolved by the caller — no user-controlled path traversal in this module. |

---

## Notes (non-blocking)

- `DW_3_3_penman_craft_tool_shape` (craft.test.js:229-237) tests the MCP tool's logic by re-executing `toCraftBlocks` + `JSON.stringify` in the test process rather than invoking the MCP server's stdio transport. This is reasonable (the tool body is a two-liner), but it does not exercise error propagation through `err()` on a throw. A test for `toCraftBlocks(null)` routed through the `err()` path would be theoretically completist; the existing non-string throw test in DW-3.4 is sufficient coverage in practice.
- The `--craft-blocks` branch in bin/penman.js uses a top-level `return` (line 77) inside a CommonJS module script body. In Node.js CJS modules the module body is wrapped in a function, so this is valid and works as observed (confirmed by running tests). It is an unusual pattern; `process.exit(0)` would be more conventional and equally correct.
- `ALL_PLATFORMS.length === 13` is hard-coded in the test (`DW_3_1_craft_is_a_platform_and_count_is_13`). This assertion will break if a future phase adds a platform, requiring a test update. Non-blocking; it is a deliberate snapshot guard.

---

**Verdict: PASS**
