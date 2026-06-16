// craft.test.js — Phase 3: Craft support (both modes).
//
// Runner: node --test (node:test). No new deps. Matches the *.test.js glob.
//
// Mode B (clipboard HTML platform) is exercised through the existing convert()
// contract + the platform registry. Mode A (native block JSON) is exercised
// through toCraftBlocks() directly and through the CLI --craft-blocks path
// (spawned as a child process, asserting stdout JSON + no clipboard side
// effect). The MCP penman_craft tool's logic is the same toCraftBlocks + JSON
// stringify, asserted at the unit level.
//
// The Craft block schema asserted here was verified against the live Craft MCP
// (craft_read --format json on real docs) during Phase 3 discovery.

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const { toCraftBlocks } = require("../src/craft.js");
const { convert } = require("../src/render.js");
const { ALL_PLATFORMS, resolveTokens } = require("../src/tokens.js");
const { PLATFORM_GROUPS } = require("../src/mcp.js");

const CLI = path.join(__dirname, "..", "bin", "penman.js");

// Run the CLI with the given args, piping `stdin` in. Returns { stdout }.
// Uses `node` explicitly (the shebang is bun; node runs the same CJS).
function runCli(args, stdin) {
  const stdout = execFileSync("node", [CLI, ...args], {
    input: stdin,
    encoding: "utf-8",
  });
  return stdout;
}

// Find the first block matching a predicate.
function find(blocks, pred) {
  return blocks.find(pred);
}

// ===========================================================================
// DW-3.1 — Mode B: craft is a clipboard HTML platform on the existing pipeline
// ===========================================================================
describe("DW-3.1 — Mode B: Craft as an HTML platform", () => {
  test("DW_3_1_craft_is_a_platform_and_count_is_13", () => {
    assert.ok(ALL_PLATFORMS.includes("craft"), "craft must be a registered platform");
    assert.equal(ALL_PLATFORMS.length, 13, "ALL_PLATFORMS count must be 13 after adding craft");
  });

  test("DW_3_1_craft_in_notes_group", () => {
    assert.deepEqual(PLATFORM_GROUPS.notes, ["craft"], "craft must be in the notes group");
  });

  test("DW_3_1_convert_craft_produces_styled_html", () => {
    const md = "# Heading\n\nA paragraph with **bold**.";
    const html = convert(md, resolveTokens("craft", "light"), "craft");
    // Document-class (not chat-flattened): a real <h1> tag, not <strong><br>.
    assert.ok(html.includes("<h1 style="), "craft should render a styled <h1>");
    assert.ok(html.includes("<p style="), "craft should render a styled <p>");
    assert.ok(!html.includes("<strong>Heading</strong><br>"), "craft is not a chat platform");
    // Craft's font token flows into the body style.
    assert.ok(html.includes("ui-sans-serif"), "craft body should use its font token");
  });

  test("DW_3_1_unknown_platform_not_silently_served_craft", () => {
    // Mode-B fallthrough guard: an unknown platform key is rejected by the CLI's
    // ALL_PLATFORMS.includes check, never silently served craft or default tokens.
    assert.ok(!ALL_PLATFORMS.includes("kraft"), "typo'd key is not a real platform");
    assert.throws(
      () => runCli(["--for", "kraft"], "# hi"),
      /Unknown platform|status 1|Command failed/,
      "unknown platform must be rejected, not served"
    );
  });
});

// ===========================================================================
// DW-3.2 — toCraftBlocks block-type mapping
// ===========================================================================
describe("DW-3.2 — toCraftBlocks block-type mapping", () => {
  test("DW_3_2_heading_maps_to_textStyle", () => {
    const blocks = toCraftBlocks("# One\n\n## Two\n\n### Three");
    assert.deepEqual(
      blocks.map((b) => ({ type: b.type, textStyle: b.textStyle })),
      [
        { type: "text", textStyle: "h1" },
        { type: "text", textStyle: "h2" },
        { type: "text", textStyle: "h3" },
      ]
    );
    assert.equal(blocks[0].markdown, "One");
  });

  test("DW_3_2_heading_h5_h6_clamp_to_h4", () => {
    // Craft tops out at h4 — deeper headings must clamp, never emit h5/h6.
    const blocks = toCraftBlocks("##### Five\n\n###### Six");
    assert.deepEqual(blocks.map((b) => b.textStyle), ["h4", "h4"]);
  });

  test("DW_3_2_paragraph_maps_to_text", () => {
    const blocks = toCraftBlocks("Just a paragraph.");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, "text");
    assert.equal(blocks[0].markdown, "Just a paragraph.");
    assert.equal(blocks[0].textStyle, undefined, "plain paragraph has no textStyle");
    assert.equal(blocks[0].listStyle, undefined, "plain paragraph has no listStyle");
  });

  test("DW_3_2_bullet_list_one_block_per_item", () => {
    const blocks = toCraftBlocks("- alpha\n- beta");
    assert.equal(blocks.length, 2, "Craft has no list container — one block per item");
    for (const b of blocks) {
      assert.equal(b.type, "text");
      assert.equal(b.listStyle, "bullet");
    }
    assert.equal(blocks[0].markdown, "- alpha");
    assert.equal(blocks[1].markdown, "- beta");
  });

  test("DW_3_2_ordered_list_numbered_style", () => {
    const blocks = toCraftBlocks("1. first\n2. second");
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks.map((b) => b.listStyle), ["numbered", "numbered"]);
    assert.equal(blocks[0].markdown, "1. first");
    assert.equal(blocks[1].markdown, "2. second");
  });

  test("DW_3_2_task_list_taskInfo_state", () => {
    const blocks = toCraftBlocks("- [x] done\n- [ ] todo");
    assert.deepEqual(blocks.map((b) => b.listStyle), ["task", "task"]);
    assert.deepEqual(
      blocks.map((b) => b.taskInfo),
      [{ state: "done" }, { state: "todo" }]
    );
    assert.equal(blocks[0].markdown, "- [x] done");
    assert.equal(blocks[1].markdown, "- [ ] todo");
  });

  test("DW_3_2_code_block_with_language", () => {
    const blocks = toCraftBlocks("```python\nprint('hi')\n```");
    assert.equal(blocks.length, 1);
    const b = blocks[0];
    assert.equal(b.type, "code");
    assert.equal(b.language, "python");
    assert.equal(b.rawCode, "print('hi')");
    assert.equal(b.markdown, "```python\nprint('hi')\n```");
  });

  test("DW_3_2_code_block_without_language", () => {
    const blocks = toCraftBlocks("```\nplain code\n```");
    const b = blocks[0];
    assert.equal(b.type, "code");
    assert.equal(b.language, "", "no language → empty string, not undefined");
    assert.equal(b.rawCode, "plain code");
  });

  test("DW_3_2_blockquote_decoration", () => {
    const blocks = toCraftBlocks("> a quoted line\n> second line");
    assert.equal(blocks.length, 1);
    const b = blocks[0];
    assert.equal(b.type, "text");
    assert.deepEqual(b.decorations, ["quote"]);
    assert.ok(b.markdown.startsWith("> "), "quote markdown is > -prefixed");
    assert.ok(b.markdown.includes("a quoted line"));
  });

  test("DW_3_2_divider_line_block", () => {
    const blocks = toCraftBlocks("above\n\n---\n\nbelow");
    const line = find(blocks, (b) => b.type === "line");
    assert.ok(line, "hr must map to a line block");
    assert.equal(line.lineStyle, "regular");
    assert.equal(line.markdown, "***");
  });

  test("DW_3_2_image_block", () => {
    const blocks = toCraftBlocks("![Diagram](https://example.com/a.png)");
    const img = find(blocks, (b) => b.type === "image");
    assert.ok(img, "standalone image must map to an image block");
    assert.equal(img.url, "https://example.com/a.png");
    assert.equal(img.markdown, "![Diagram](https://example.com/a.png)");
  });

  test("DW_3_2_output_is_json_serializable", () => {
    const md = "# H\n\npara\n\n- a\n\n```js\nx\n```\n\n> q\n\n---";
    const blocks = toCraftBlocks(md);
    // Round-trips through JSON with no loss (no functions, no circular refs).
    const round = JSON.parse(JSON.stringify(blocks));
    assert.deepEqual(round, blocks);
  });
});

// ===========================================================================
// DW-3.3 — penman_craft MCP tool + CLI flag return JSON, no clipboard
// ===========================================================================
describe("DW-3.3 — Mode A surfaces (no clipboard)", () => {
  test("DW_3_3_cli_craft_blocks_prints_json", () => {
    const out = runCli(["--craft-blocks"], "# Title\n\nbody");
    const parsed = JSON.parse(out); // must be valid JSON on stdout
    assert.ok(Array.isArray(parsed), "stdout must be a JSON array");
    assert.equal(parsed[0].textStyle, "h1");
    assert.equal(parsed[1].markdown, "body");
  });

  test("DW_3_3_cli_craft_blocks_matches_toCraftBlocks", () => {
    const md = "# H\n\n- a\n- b";
    const out = runCli(["--craft-blocks"], md);
    assert.deepEqual(JSON.parse(out), toCraftBlocks(md));
  });

  test("DW_3_3_cli_craft_blocks_no_clipboard_message", () => {
    // The HTML path prints "Copied to clipboard"; Mode A must NOT — it has no
    // clipboard side effect. stdout is pure JSON only.
    const out = runCli(["--craft-blocks"], "# Title");
    assert.ok(!out.includes("Copied to clipboard"), "Mode A must not touch the clipboard");
    assert.doesNotThrow(() => JSON.parse(out), "stdout is JSON only, no extra prose");
  });

  test("DW_3_3_cli_craft_blocks_ignores_platform", () => {
    // --craft-blocks is platform-agnostic: passing --for craft still yields the
    // same block JSON and never copies to clipboard.
    const out = runCli(["--for", "craft", "--craft-blocks"], "# Title");
    assert.ok(Array.isArray(JSON.parse(out)));
    assert.ok(!out.includes("Copied to clipboard"));
  });

  test("DW_3_3_penman_craft_tool_shape", () => {
    // The MCP tool body is `JSON.stringify(toCraftBlocks(md))` returned via ok();
    // assert that contract holds (no clipboard import is invoked on this path).
    const md = "# H\n\npara";
    const text = JSON.stringify(toCraftBlocks(md), null, 2);
    const parsed = JSON.parse(text);
    assert.equal(parsed[0].textStyle, "h1");
    assert.equal(parsed[1].markdown, "para");
  });
});

// ===========================================================================
// DW-3.4 — visible degradation, empty → [], crash-structure handled
// ===========================================================================
describe("DW-3.4 — boundary, degradation, and the former crash structure", () => {
  test("DW_3_4_empty_input_returns_empty_array", () => {
    assert.deepEqual(toCraftBlocks(""), []);
  });

  test("DW_3_4_whitespace_input_returns_empty_array", () => {
    assert.deepEqual(toCraftBlocks("   \n\n  \t"), []);
  });

  test("DW_3_4_non_string_input_throws", () => {
    // Boundary validation (cc-defensive): markdown is external input.
    assert.throws(() => toCraftBlocks(null), /must be a string/);
    assert.throws(() => toCraftBlocks(42), /must be a string/);
    assert.throws(() => toCraftBlocks({}), /must be a string/);
  });

  test("DW_3_4_nested_list_does_not_crash", () => {
    // The exact structure that crashed the HTML renderer in Phase 2. The walker
    // does NOT inherit that fix — it must independently handle nesting here.
    const md = "- Item A\n  - Sub 1\n  - Sub 2\n- Item B\n  - Sub 3\n    - Deep 1";
    let blocks;
    assert.doesNotThrow(() => {
      blocks = toCraftBlocks(md);
    }, "nested list must not throw in the Craft walker");
    // Every item became its own block; nesting is expressed via indentationLevel.
    assert.equal(blocks.filter((b) => b.listStyle === "bullet").length, 6);
    const deep = find(blocks, (b) => b.markdown === "- Deep 1");
    assert.ok(deep, "the deepest item must be present (not dropped)");
    assert.equal(deep.indentationLevel, 2, "3rd-level item is at indent 2");
  });

  test("DW_3_4_loose_list_does_not_crash", () => {
    // Loose items (blank lines between) wrap content in paragraphs in marked —
    // the other structure that crashed the HTML path.
    const md = "- Item A\n\n- Item B\n\n- Item C";
    let blocks;
    assert.doesNotThrow(() => {
      blocks = toCraftBlocks(md);
    }, "loose list must not throw");
    assert.equal(blocks.length, 3);
    assert.deepEqual(blocks.map((b) => b.markdown), ["- Item A", "- Item B", "- Item C"]);
  });

  test("DW_3_4_raw_html_degrades_visibly", () => {
    // Raw HTML has no clean Craft-block equivalent. It must NOT be silently
    // dropped — content is preserved and the block is clearly marked.
    const md = "<div>raw block</div>";
    const blocks = toCraftBlocks(md);
    assert.equal(blocks.length, 1);
    const b = blocks[0];
    assert.equal(b.type, "unsupported", "raw HTML is marked unsupported, not dropped");
    assert.equal(b.unsupportedType, "html");
    assert.ok(b.markdown.includes("raw block"), "original source is preserved");
  });

  test("DW_3_4_table_degrades_visibly", () => {
    // Tables have no Craft-block equivalent in this minimal mapping — preserve + mark.
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const blocks = toCraftBlocks(md);
    const unsupported = find(blocks, (b) => b.type === "unsupported");
    assert.ok(unsupported, "table must degrade to a visible unsupported block");
    assert.equal(unsupported.unsupportedType, "table");
    assert.ok(unsupported.markdown.includes("a"), "table source preserved, not dropped");
  });

  test("DW_3_4_mixed_document_maps_every_block_no_loss", () => {
    // Integration: a kitchen-sink-style doc — assert no construct silently vanishes.
    const md = [
      "# Title",
      "",
      "Intro paragraph.",
      "",
      "- bullet",
      "  - nested",
      "",
      "1. one",
      "",
      "> a quote",
      "",
      "```js",
      "const x = 1;",
      "```",
      "",
      "---",
      "",
      "- [x] done",
    ].join("\n");
    const blocks = toCraftBlocks(md);
    const types = blocks.map((b) => b.type);
    // Heading, paragraph, 2 bullets, 1 numbered, quote, code, line, task = present.
    assert.ok(types.includes("code"));
    assert.ok(types.includes("line"));
    assert.ok(blocks.some((b) => b.textStyle === "h1"));
    assert.ok(blocks.some((b) => b.decorations && b.decorations.includes("quote")));
    assert.ok(blocks.some((b) => b.listStyle === "task"));
    assert.ok(blocks.some((b) => b.indentationLevel === 1), "nested item retained");
    // Nothing is null/undefined in the array.
    assert.ok(blocks.every((b) => b && typeof b.type === "string"));
  });
});
