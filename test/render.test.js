// render.test.js — characterization tests for src/render.js
//
// Runner: node --test (node:test, built-in since Node 18). No new deps.
// Justification: Node v22 is available; node:test is zero-install and runs
// cleanly as confirmed during Phase 1 discovery. Bun is also available but
// adding `bun test` would require a bun-specific test API or jest compat layer.
//
// Contract: tests call convert(md, resolveTokens(platform, theme), platform)
// and assert on the returned HTML string via substring containment.
// Volatile hljs <span> ordering is NOT asserted — only structural substrings.
//
// Phase-2 targets are registered as todo stubs at the bottom of this file.
// When Phase 2 is complete, each todo becomes a real test by replacing
// test.todo() with test() and adding assertions.

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { convert } = require("../src/render.js");
const { resolveTokens } = require("../src/tokens.js");

// ---------------------------------------------------------------------------
// Helper: extract body content (strip <html><head>...<body ...> wrapper)
// ---------------------------------------------------------------------------
function bodyOf(html) {
  return html.replace(/^[\s\S]*?<body[^>]*>/m, "").replace(/<\/body>[\s\S]*$/m, "");
}

// ---------------------------------------------------------------------------
// Helper: assert that `html` contains every substring in `substrings`
// ---------------------------------------------------------------------------
function assertContains(html, substrings, label) {
  for (const s of substrings) {
    assert.ok(
      html.includes(s),
      `${label}: expected output to contain: ${JSON.stringify(s)}\n\nActual output:\n${html}`
    );
  }
}

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: HEADING
// Locks current output of the heading renderer across notion / slack / outlook.
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — heading", () => {
  const md = "# Heading One\n\n## Heading Two\n\n### Heading Three";

  test("DW_1_2_heading_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // h1 at Notion's 16px base × 1.8 = 28.8 → rounded to 29px
      '<h1 style="font-size: 29px; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading One</h1>',
      // h2 at 16 × 1.5 = 24px
      '<h2 style="font-size: 24px; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading Two</h2>',
      // h3 at 16 × 1.25 = 20px
      '<h3 style="font-size: 20px; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading Three</h3>',
    ], "heading/notion");
  });

  test("DW_1_2_heading_slack", () => {
    // Slack is a CHAT_PLATFORM: headings flatten to <strong>text</strong><br>
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      "<strong>Heading One</strong><br>",
      "<strong>Heading Two</strong><br>",
      "<strong>Heading Three</strong><br>",
    ], "heading/slack");
    // No structural heading tags on chat platform
    assert.ok(!html.includes("<h1"), "heading/slack: must not contain <h1>");
    assert.ok(!html.includes("<h2"), "heading/slack: must not contain <h2>");
  });

  test("DW_1_2_heading_outlook", () => {
    // Outlook base font is 11pt; h1 at 1.8 → 19.8 → rounded to 20pt
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      '<h1 style="font-size: 20pt; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading One</h1>',
      '<h2 style="font-size: 17pt; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading Two</h2>',
      '<h3 style="font-size: 14pt; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;">Heading Three</h3>',
    ], "heading/outlook");
  });
});

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: PARAGRAPH
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — paragraph", () => {
  const md = "First paragraph.\n\nSecond paragraph with **bold** and *italic*.";

  test("DW_1_2_paragraph_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      '<p style="margin: 0 0 12px 0;">First paragraph.</p>',
      '<p style="margin: 0 0 12px 0;">Second paragraph with <strong>bold</strong> and <em>italic</em>.</p>',
    ], "paragraph/notion");
  });

  test("DW_1_2_paragraph_slack", () => {
    // Chat: paragraphs flatten to text<br><br>
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      "First paragraph.<br><br>",
      "Second paragraph with <strong>bold</strong> and <em>italic</em>.<br><br>",
    ], "paragraph/slack");
    assert.ok(!html.includes("<p "), "paragraph/slack: must not contain <p> tags");
  });

  test("DW_1_2_paragraph_outlook", () => {
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      '<p style="margin: 0 0 12px 0;">First paragraph.</p>',
      '<p style="margin: 0 0 12px 0;">Second paragraph with <strong>bold</strong> and <em>italic</em>.</p>',
    ], "paragraph/outlook");
  });
});

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: LIST (flat — unordered + ordered)
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — list (flat)", () => {
  const md = "- Alpha\n- Beta\n- Gamma\n\n1. First\n2. Second\n3. Third";

  test("DW_1_2_list_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      '<ul style="margin: 0 0 12px 0; padding-left: 24px;">',
      '<li style="margin: 0 0 4px 0;">Alpha</li>',
      '<li style="margin: 0 0 4px 0;">Beta</li>',
      '<li style="margin: 0 0 4px 0;">Gamma</li>',
      '</ul>',
      '<ol style="margin: 0 0 12px 0; padding-left: 24px;">',
      '<li style="margin: 0 0 4px 0;">First</li>',
      '<li style="margin: 0 0 4px 0;">Second</li>',
      '<li style="margin: 0 0 4px 0;">Third</li>',
      '</ol>',
    ], "list/notion");
  });

  test("DW_1_2_list_slack", () => {
    // Chat: unordered → bullet prefix; ordered → number prefix; separated by <br>
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      "• Alpha<br>",
      "• Beta<br>",
      "• Gamma<br>",
      "1. First<br>",
      "2. Second<br>",
      "3. Third<br>",
    ], "list/slack");
    // Chat lists end with double <br>
    assert.ok(html.includes("Gamma<br><br>") || html.includes("Gamma<br>\n<br>") || html.includes("<br><br>"),
      "list/slack: list blocks must be followed by <br><br>");
  });

  test("DW_1_2_list_outlook", () => {
    // Outlook is a document platform — same structural HTML as notion
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      '<ul style="margin: 0 0 12px 0; padding-left: 24px;">',
      '<li style="margin: 0 0 4px 0;">Alpha</li>',
      '<ol style="margin: 0 0 12px 0; padding-left: 24px;">',
      '<li style="margin: 0 0 4px 0;">First</li>',
    ], "list/outlook");
  });
});

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: CODE (fenced code block)
// Assertions avoid volatile hljs span ordering; focus on structural wrapper.
// Source text is asserted via plain-text content (tags stripped) because
// hljs splits tokens like `const` and `1` into separate <span> elements.
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — code block", () => {
  const md = "```js\nconst x = 1;\n```";

  // Strip all HTML tags to get visible text content
  function textOf(html) {
    return html.replace(/<[^>]+>/g, "");
  }

  test("DW_1_2_code_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Notion code background from token override
      "background: #f7f6f3;",
      // Table wrapper (code blocks use table for background survival)
      '<table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 12px 0;">',
      // Pre/code structure inside table
      '<pre style="margin: 0; white-space: pre;',
      "<code>",
      // Code font from notion token override
      "SFMono-Regular, Menlo, Consolas, monospace",
    ], "code/notion");
    // The source text must appear in the rendered plain-text content
    // (hljs splits `const` and `1` into separate spans — check via tag strip)
    assert.ok(textOf(html).includes("const x = 1;"), "code/notion: source text must appear in plain-text content");
    // No trailing <br> on document platforms
    assert.ok(!html.endsWith("</table><br>"), "code/notion: document platforms must not trail with <br>");
  });

  test("DW_1_2_code_slack", () => {
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      '<table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 12px 0;">',
      '<pre style="margin: 0; white-space: pre;',
      "<code>",
      // Slack gets trailing <br> after code table (chat mode)
      "</table><br>",
    ], "code/slack");
    assert.ok(textOf(html).includes("const x = 1;"), "code/slack: source text must appear in plain-text content");
  });

  test("DW_1_2_code_outlook", () => {
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      '<table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 12px 0;">',
      // Outlook code font
      "Consolas, Courier New, monospace",
      // Outlook code font size (pt-based)
      "font-size: 10pt",
      "<code>",
    ], "code/outlook");
    assert.ok(textOf(html).includes("const x = 1;"), "code/outlook: source text must appear in plain-text content");
  });
});

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: CODESPAN (inline code)
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — codespan (inline code)", () => {
  const md = "Use the `console.log()` function for debugging.";

  test("DW_1_2_codespan_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Notion inline code uses rgba background
      "background: rgba(135,131,120,0.15);",
      // Notion inline code color
      "color: #eb5757;",
      // Notion mono font
      "SFMono-Regular, Menlo, Consolas, monospace",
      "<code",
      "console.log()",
    ], "codespan/notion");
  });

  test("DW_1_2_codespan_slack", () => {
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      // Slack inline code uses base bg (#f0f0f0) — slack has no inlineCodeBg override
      "background: #f0f0f0;",
      // Slack inline code color — base inlineCodeText
      "color: #e01e5a;",
      // Slack mono font override
      "Monaco, Menlo, Consolas, monospace",
      "<code",
      "console.log()",
    ], "codespan/slack");
  });

  test("DW_1_2_codespan_outlook", () => {
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      "background: #f0f0f0;",
      "color: #e01e5a;",
      // Outlook font override
      "Consolas, Courier New, monospace",
      // Outlook uses pt sizes
      "font-size: 10pt;",
      "<code",
      "console.log()",
    ], "codespan/outlook");
  });
});

// ---------------------------------------------------------------------------
// DW-1.2 — Characterization: TABLE
// ---------------------------------------------------------------------------
describe("DW-1.2 characterization — table", () => {
  // Left-aligned Name, right-aligned Age
  const md = "| Name | Age |\n|:---|---:|\n| Alice | 30 |\n| Bob | 25 |";

  test("DW_1_2_table_notion", () => {
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Notion uses #e4e3e0 border color
      "border: 1px solid #e4e3e0;",
      "<thead>",
      "<tbody>",
      // Left-aligned header cell
      '<th style="text-align: left;',
      // Right-aligned header cell
      '<th style="text-align: right;',
      // Notion header background
      "background: #f7f6f3;",
      "Name",
      "Age",
      "Alice",
      "30",
      "Bob",
      "25",
    ], "table/notion");
  });

  test("DW_1_2_table_slack", () => {
    // Slack/chat: table → preformatted ASCII table inside a table-cell
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      // Still wrapped in a table (for background survival)
      '<table style="width: 100%; border-collapse: collapse; border: none;',
      // Text table content inside <pre>
      '<pre style="margin: 0; white-space: pre;',
      "Name",
      "Age",
      // Separator line
      "---",
      "Alice",
      "30",
      "Bob",
      "25",
      // Chat tables also get a trailing <br>
      "</table><br>",
    ], "table/slack");
    // Must NOT contain <thead> or <th> — chat uses text table
    assert.ok(!html.includes("<thead>"), "table/slack: must not contain <thead>");
    assert.ok(!html.includes("<th "), "table/slack: must not contain <th>");
  });

  test("DW_1_2_table_outlook", () => {
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      // Outlook uses base border color #e0e0e0 (no platform override for codeBorder)
      "border: 1px solid #e0e0e0;",
      "<thead>",
      "<tbody>",
      '<th style="text-align: left;',
      '<th style="text-align: right;',
      // Outlook header background = base codeBg
      "background: #f5f5f5;",
      "Name",
      "Age",
      "Alice",
      "30",
    ], "table/outlook");
  });
});

// ---------------------------------------------------------------------------
// Body wrapper — characterization tests for the outer HTML envelope
// ---------------------------------------------------------------------------
describe("characterization — body wrapper", () => {
  const md = "Hello world.";

  test("notion body includes font-family and color but no bg fight", () => {
    const html = convert(md, resolveTokens("notion", "light"), "notion");
    assertContains(html, [
      "<html>",
      '<meta charset="utf-8">',
      "<body style=\"",
      "font-family:",
      "color: #37352f;",
      "background: #ffffff;",
    ], "body/notion");
  });

  test("slack body omits color and background (chat platform theme wins)", () => {
    const html = convert(md, resolveTokens("slack", "light"), "slack");
    // Slack is a CHAT_PLATFORM: body style must not set color or background
    const bodyTagMatch = html.match(/<body style="([^"]*)"/);
    assert.ok(bodyTagMatch, "slack: must have <body style=...>");
    const bodyStyle = bodyTagMatch[1];
    assert.ok(!bodyStyle.includes("color:"), "slack body style must not set color");
    assert.ok(!bodyStyle.includes("background:"), "slack body style must not set background");
    // Must still set font-family
    assert.ok(bodyStyle.includes("font-family:"), "slack body style must set font-family");
  });

  test("outlook body includes font-family and color", () => {
    const html = convert(md, resolveTokens("outlook", "light"), "outlook");
    assertContains(html, [
      "font-family: Calibri, sans-serif;",
      "color: #000000;",
    ], "body/outlook");
  });
});

// ---------------------------------------------------------------------------
// Dirty test: convert() must throw (not silently fail) for crash inputs
// This guards the regression: Phase 2 fix must eliminate these throws.
// If convert() starts silently returning empty output, this test fails —
// which means the fix must be validated properly, not by swallowing errors.
// ---------------------------------------------------------------------------
describe("crash detection — nested list and loose item currently throw", () => {
  test("nested list throws on notion (current behavior — crash to be fixed in Phase 2)", () => {
    const nestedMd = "- Item A\n  - Sub 1\n  - Sub 2\n- Item B";
    assert.throws(
      () => convert(nestedMd, resolveTokens("notion", "light"), "notion"),
      /Token with "list" type was not found/,
      "nested list must throw the known parseInline error"
    );
  });

  test("loose list item throws on notion (current behavior — crash to be fixed in Phase 2)", () => {
    const looseMd = "- Item A\n\n- Item B (loose)";
    assert.throws(
      () => convert(looseMd, resolveTokens("notion", "light"), "notion"),
      /Token with "paragraph" type was not found/,
      "loose list item must throw the known parseInline error"
    );
  });
});

// ---------------------------------------------------------------------------
// DW-1.3 — Phase-2 targets (todo stubs)
// Each names the expected post-fix behavior for Phase 2 to implement.
// ---------------------------------------------------------------------------
describe("DW-1.3 Phase-2 targets — todo stubs", () => {
  // NESTED LIST CRASH
  // Expected post-fix: nested list items render via block parsing (not parseInline).
  // notion: <ul><li>Item A<ul><li>Sub 1</li><li>Sub 2</li></ul></li><li>Item B</li></ul>
  // slack: "• Item A\n  ◦ Sub 1\n  ◦ Sub 2\n• Item B" (or equivalent chat-mode flattened)
  test.todo("DW_2_1 nested-list renders without crashing on chat + document platforms");

  // LOOSE ITEM CRASH
  // Expected post-fix: loose list items (separated by blank lines, containing paragraph tokens)
  // render via block parsing. Each item's paragraph content renders without throwing.
  test.todo("DW_2_1 loose list item renders without crashing on chat + document platforms");

  // BLOCKQUOTE
  // Expected post-fix: document/email → <blockquote> with border-left/padding styling;
  // chat → visible text fallback (e.g., "> " prefix per line or styled inline span)
  test.todo("DW_2_2 blockquote renders styled on document/email platforms and as visible text on chat platforms");

  // HR (thematic break)
  // Expected post-fix: document/email → <hr style="..."> with border styling;
  // chat → visible text fallback (e.g., "───" or "---" in a span)
  test.todo("DW_2_2 hr renders styled on document/email platforms and as visible text on chat platforms");

  // TASK LIST
  // Expected post-fix: task items render ☐ (unchecked) and ☑ (checked) glyphs instead of
  // <input type="checkbox"> elements, which are stripped on paste.
  test.todo("DW_2_3 task list items render ☐/☑ glyphs, never <input> elements");

  // STRIKETHROUGH
  // Expected post-fix: ~~text~~ renders as <del style="...">text</del> (or platform fallback).
  // Current behavior produces unstyled <del>; Phase 2 adds inline styles.
  test.todo("DW_2_3 strikethrough renders as styled <del> with appropriate text-decoration");

  // IMAGE
  // Expected post-fix: ![alt](url) renders as <a href="url">alt</a> (link-with-alt degradation)
  // so paste handlers keep the destination + meaning even when <img> is stripped.
  // Empty alt → URL as label: <a href="url">url</a>
  test.todo("DW_2_3 image renders as <a href=url>alt</a>; empty alt falls back to URL as label");
});
