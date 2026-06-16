# Discovery + Design: Phase 3 - Craft support (both modes)

## Files Found
- `src/tokens.js` — `platformOverrides` (12 platforms), `ALL_PLATFORMS = Object.keys(platformOverrides)`, `resolveTokens`, `EMAIL_PLATFORMS`.
- `src/mcp.js` — MCP server; `PLATFORM_GROUPS`, `penman`/`penman_html`/`penman_platforms` tools, `ok`/`err` helpers, `render()` helper, `PlatformEnum = z.enum(ALL_PLATFORMS)`.
- `src/render.js` — `convert(md, tokens, platform)`; instance-scoped `new Marked({renderer,...})`; the marked token tree is the parse to reuse.
- `bin/penman.js` — CLI arg-parsing loop (~:29); `--for/-f`, `--theme/-t`, `--tokens`, file/stdin input.
- `test/render.test.js` — node:test suite, 43 tests. Helpers `bodyOf()` + `assertContains()`. Contract: `convert(md, resolveTokens(platform, theme), platform) → htmlString`.
- `test/kitchen-sink.md` — input corpus incl. the nested-list / loose-list / blockquote / hr / task / strikethrough / image constructs (L95-142).
- `docs/code-standards.md` — present; conventions applied (see below).
- No `src/craft.js` yet (to be created).

## Current State
- 12 platforms; `ALL_PLATFORMS` derives from `platformOverrides` keys, so adding a `craft` key auto-extends both `ALL_PLATFORMS` and `PlatformEnum` (Mode B is "free" once the token entry exists).
- The HTML pipeline (`convert`) already handles every block type with chat fallbacks (Phase 2). Mode B for Craft just needs a token entry + a group.
- No native-block (Mode A) path exists. No second markdown parser — `marked` is the only one and must be reused.
- 43/43 tests green.

## Gaps
| # | Gap | Resolution |
|---|-----|------------|
| 1 | No `craft` entry in `platformOverrides` | Add a `craft` override (document-class fonts) → ALL_PLATFORMS becomes 13 |
| 2 | No `notes` group in `PLATFORM_GROUPS` | Add `notes: ["craft"]` so `penman_platforms` lists it |
| 3 | No `src/craft.js` | Create it: `toCraftBlocks(md) → object[]` walking the marked lexer |
| 4 | No `penman_craft` MCP tool | Register tool returning `JSON.stringify(toCraftBlocks(md))` as text, no clipboard |
| 5 | No CLI block flag | Add `--craft-blocks` (prints JSON to stdout, no clipboard) |

## Code Standards
- **CommonJS only** (`require`/`module.exports`); `src/craft.js` must not import an entry point (mirror `render.js`: may depend on `marked` directly).
- **Reuse instance-scoped marked** — `new Marked({gfm:true})` per call, no global state.
- **Error handling**: helpers throw plain `Error`; MCP tool bodies wrap in try/catch → `err(...)`, never throw out of a tool. CLI surfaces to stderr + exit.
- **Naming**: `camelCase` verb-first functions, `UPPER_SNAKE` module constants, lowercase-hyphenated platform keys.
- **Degrade gracefully, surface failures** — matches both code-standards "best-effort side calls degrade with a fallback, not a crash" and the cc-defensive/APOSD silent-failure rule.

## Test Infrastructure
- `node --test test/*.test.js` (node:test + node:assert/strict). New file `test/craft.test.js` matches the `*.test.js` glob and runs automatically.
- Pattern: call the unit directly, assert on its return; no clipboard, no MCP transport.

## Craft Block-JSON Schema — VERIFIED (resolves the MED-confidence assumption)

Inspected real Craft docs via `mcp__craft__craft_read blocks get <id> --format json` (Getting Started + Craft Handbook). The **actual** Craft block schema:

| Markdown construct | Craft block JSON |
|---|---|
| Heading (depth 1-6) | `{ type: "text", textStyle: "h1".."h4", markdown: "# ..." }` (Craft tops out at h4) |
| Paragraph | `{ type: "text", markdown: "..." }` |
| Bullet list item | `{ type: "text", listStyle: "bullet", markdown: "- ..." }` |
| Numbered list item | `{ type: "text", listStyle: "numbered", markdown: "1. ..." }` |
| Task item | `{ type: "text", listStyle: "task", taskInfo: { state: "todo"|"done" }, markdown: "- [ ] ..." }` |
| Code block | `{ type: "code", language: "js", rawCode: "...", markdown: "```js\n...\n```" }` |
| Blockquote | `{ type: "text", decorations: ["quote"], markdown: "> ..." }` |
| Divider / hr | `{ type: "line", lineStyle: "regular", markdown: "***" }` |
| Image | `{ type: "image", url: "...", markdown: "![alt](url)" }` |

Confirmed facts (not guessed):
- Every block carries `type` + `markdown`. **Lists are flattened** — Craft has no list-container block; each item is its own `type:"text"` block with a `listStyle`. Nesting is expressed via `indentationLevel` (integer, observed in the handbook).
- Headings are NOT a distinct type — they are `type:"text"` + `textStyle`. Craft supports `h1`–`h4` only (h5/h6 clamp to h4).
- `craft_write blocks add --markdown <text>` accepts markdown and Craft parses it. So a faithful, agent-consumable representation pairs the **structural block type** with the **markdown** for that block. The JSON we emit mirrors what `craft_read` returns, which is exactly what an agent feeding `craft_write` needs.

This means the seam is robust: each block's `markdown` field is the source of truth Craft itself round-trips; the typed fields (`textStyle`/`listStyle`/`type`/`taskInfo`) make the structure explicit for the agent.

## DW Verification

| DW-ID | Done-When Item | Status | Test Cases |
|-------|---------------|--------|------------|
| DW-3.1 | `penman --for craft` (+ MCP `penman` tool) produces styled HTML on the clipboard via the existing pipeline (Mode B) | COVERED | `craft.test.js`: `DW_3_1_craft_is_a_platform` (craft ∈ ALL_PLATFORMS, count 13), `DW_3_1_convert_craft_produces_html` (convert renders styled HTML for craft, document-class — not chat-flattened), `DW_3_1_craft_in_platform_groups` (notes group) |
| DW-3.2 | `toCraftBlocks(md)` returns a JSON-serializable Craft block array; headings, paragraphs, lists, code blocks, blockquotes, dividers map to their Craft block types | COVERED | `DW_3_2_heading_maps_to_textStyle`, `DW_3_2_paragraph_maps_to_text`, `DW_3_2_bullet_list`, `DW_3_2_ordered_list`, `DW_3_2_code_block_with_language`, `DW_3_2_blockquote_decoration`, `DW_3_2_divider_line`, `DW_3_2_output_is_json_serializable` (round-trips through `JSON.parse(JSON.stringify(...))`) |
| DW-3.3 | A `penman_craft` MCP tool and a CLI flag return the block JSON without touching the clipboard | COVERED | `DW_3_3_cli_craft_blocks_prints_json` (spawn `bin/penman.js --for craft --craft-blocks`, assert stdout is the JSON, clipboard untouched), `DW_3_3_cli_no_clipboard_call` (no copyToClipboard import path triggered — assert via spy/exec stdout-only). MCP tool covered by `DW_3_3_penman_craft_tool_shape` (unit-call the registered handler logic via toCraftBlocks + JSON, asserting no clipboard) |
| DW-3.4 | Unsupported constructs degrade visibly (logged/marked), never silently dropped; empty input → `[]`; tests cover the mapping + the former crash structure | COVERED | `DW_3_4_empty_input_returns_empty_array`, `DW_3_4_whitespace_input_returns_empty_array`, `DW_3_4_raw_html_degrades_visibly` (raw HTML block becomes a marked `unsupported` block, content preserved, not dropped), `DW_3_4_nested_list_does_not_crash` (the exact kitchen-sink nested structure walks without throwing), `DW_3_4_loose_list_does_not_crash`, `DW_3_4_non_string_input_throws` (boundary validation), `DW_3_4_table_degrades_visibly` |

**DW-ID count: 4 in table = 4 in prompt. All items COVERED:** YES

## Design Decisions

### Design: toCraftBlocks (APOSD design-it-twice)

#### Approaches Considered
1. **A — Flat walker with markdown-passthrough.** One public `toCraftBlocks(md)`. Internally lex with marked, iterate top-level tokens, map each to a `{type, ...typedFields, markdown}` block. Lists are expanded to one block per item (matching Craft's real flat-list schema), carrying `indentationLevel` for nesting. Each block's `markdown` is taken from the token's `raw`/reconstructed source. All per-token logic is private.
2. **B — Method-per-block-type public surface.** Export `headingBlock()`, `listBlock()`, `codeBlock()`, etc., and a thin `toCraftBlocks` that calls them. Caller (or tests) can target each.
3. **C — Build a normalized IR, then a Craft serializer off the IR.** Two layers: md→IR, IR→Craft blocks.

#### Comparison
| Criterion | A | B | C |
|-----------|---|---|---|
| Interface simplicity | 1 public method | ~8 public methods (classitis) | 2 public surfaces |
| Information hiding | High — marked + Craft schema both hidden | Low — block shapes leak into the public API | Medium — IR leaks |
| Caller ease of use | Pass md, get blocks | Caller must know block types | Caller fine, but extra concept |
| Matches Craft's real schema | Yes (flat lists, markdown field) | Yes but verbose | Yes but speculative (plan rejected an IR for one target — YAGNI) |
| Blast radius / new deps | None | None | New IR module, more surface to test |

#### Choice: A — Flat walker with markdown-passthrough
Rationale: One entry point hides both the marked token shapes and the Craft block schema behind a single seam — the APOSD deep-module ideal (Unix-file-I/O shape: tiny interface, real work hidden). B is textbook classitis (a method per block type is exactly the red flag the plan's constraint names). C is the IR the plan already rejected for being speculative with one extra target. Sacrifice: callers who want a single block type must still pass markdown for it — acceptable, no real caller needs that.

#### Depth Check
- Interface methods: **1** public (`toCraftBlocks`). Internal helpers private to the module.
- Hidden details: marked lexer invocation + token shapes; the Craft block field names (`textStyle`/`listStyle`/`taskInfo`/`lineStyle`/`decorations`); the h5/h6→h4 clamp; list flattening + `indentationLevel`; raw-HTML/table degradation policy.
- Common case complexity: **simple** — `toCraftBlocks(md)` → array.

### Pseudocode (cc-pseudocode-programming)

```
toCraftBlocks(markdown):
    # Boundary validation — markdown is external input (cc-defensive GC-1)
    If markdown is not a string: throw Error (programmer/caller contract violation surfaced loudly)
    If markdown is empty or whitespace-only: return []      # documented edge case

    Lex the markdown with an instance-scoped marked lexer (reuse, no 2nd parser)
    blocks = []
    For each top-level token:
        Append walkToken(token, indentLevel=0) to blocks    # may append >1 block (lists)
    Return blocks

walkToken(token, indent) -> array of blocks:
    Switch on token.type:
        heading   -> one text block, textStyle = clamp(h{depth} to h4), markdown = token.raw-trimmed
        paragraph -> one text block, markdown = token.text
        code      -> one code block, language = token.lang or "", rawCode = token.text, markdown = fenced
        blockquote-> one text block, decorations=["quote"], markdown = "> "-joined lines
        hr        -> one line block, lineStyle="regular", markdown="***"
        list      -> for each item: emit a text block with listStyle (bullet/numbered/task),
                     taskInfo if task, indentationLevel=indent, markdown=item source line;
                     THEN recurse into any nested list token inside the item at indent+1
                     (this is the structure that crashed the HTML path — walk it explicitly)
        image (top-level paragraph-wrapped) -> handled inside paragraph's inline; top-level
                     standalone image token -> image block
        table / html / unknown -> degrade VISIBLY: emit an "unsupported" block that PRESERVES
                     the raw source as markdown and is clearly marked (type:"unsupported",
                     unsupportedType: token.type). Never drop. (APOSD silent-failure red flag.)
    Return the block(s)
```
Correctness trace: empty→[] (early return). Heading depth 1-4 maps 1:1; 5/6 clamp. Lists emit one block per item and recurse on nested lists so 3-level nesting produces 3 indent levels without throwing (parseInline is never called — we read token fields, not re-parse). Unknown/degradable types are preserved + marked, so nothing vanishes. Non-string input throws at the boundary, before lexing.

### Defensive / boundary (cc-defensive)
- **Barricade**: `toCraftBlocks` is the public boundary; markdown is external input. Validate type at entry (string), handle empty/whitespace → `[]`. Inside the walker, token shapes are assumed (produced by marked, our own parser) — internal assumptions, not re-validated per token.
- **No silent drops**: table / raw-HTML / any unmapped token → a visible `unsupported` block carrying the original source. RF-12 (fallback masking failure) avoided — the degradation is observable in the output, not a swallowed null.
- **MCP tool**: wrap in try/catch → `err(...)`, never throw out (code-standards). **CLI**: `--craft-blocks` prints JSON to stdout and exits 0; on error, stderr + non-zero exit.
- **Mode B fallthrough guard**: unknown platform keys are already rejected by `ALL_PLATFORMS.includes()` (CLI) and `PlatformEnum` (MCP); craft joins that set, so an unknown key is never silently served craft/default tokens. Test asserts this.

## Prerequisites
- [x] Required files exist (`tokens.js`, `mcp.js`, `bin/penman.js`, test harness); `src/craft.js` to be created (in scope).
- [x] Dependencies available (`marked` already a dep; no new deps).
- [x] Craft schema verified against the live Craft MCP (assumption resolved — no UPDATE_PLAN needed).

## Recommendation
**BUILD.** Schema verified, no blocking unknowns. Implement Mode B (token entry + group), then `src/craft.js` `toCraftBlocks` (deep, single seam), then the `penman_craft` MCP tool + `--craft-blocks` CLI flag, then `test/craft.test.js` covering all four DW items plus the degradation/crash-structure edges.
