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
// Regression guard: the exact inputs that crashed before Phase 2 must now
// render without throwing. These were Phase-1 crash detection tests; after
// the list handler switched from parseInline to parse(), they must pass.
// ---------------------------------------------------------------------------
describe("regression — formerly-crashing inputs now render without throwing", () => {
  test("nested list no longer throws on notion (Phase 2 fix verified)", () => {
    const nestedMd = "- Item A\n  - Sub 1\n  - Sub 2\n- Item B";
    // Must not throw — and must produce visible content
    const html = bodyOf(convert(nestedMd, resolveTokens("notion", "light"), "notion"));
    assert.ok(html.includes("Item A"), "nested list: Item A must appear in output");
    assert.ok(html.includes("Sub 1"), "nested list: Sub 1 must appear in output");
    assert.ok(html.includes("Sub 2"), "nested list: Sub 2 must appear in output");
    assert.ok(html.includes("Item B"), "nested list: Item B must appear in output");
  });

  test("loose list item no longer throws on notion (Phase 2 fix verified)", () => {
    const looseMd = "- Item A\n\n- Item B (loose)";
    // Must not throw — and must produce visible content
    const html = bodyOf(convert(looseMd, resolveTokens("notion", "light"), "notion"));
    assert.ok(html.includes("Item A"), "loose list: Item A must appear in output");
    assert.ok(html.includes("Item B (loose)"), "loose list: Item B must appear in output");
  });
});

// ---------------------------------------------------------------------------
// DW-2.1 — Nested and loose list items render without crashing
// ---------------------------------------------------------------------------
describe("DW-2.1 — nested and loose list items", () => {
  // DW-2.1: nested list on document platforms (notion/outlook)
  test("DW_2_1_nested_list_notion", () => {
    const md = "- Item A\n  - Sub 1\n  - Sub 2\n- Item B";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Outer ul
      '<ul style="margin: 0 0 12px 0; padding-left: 24px;">',
      // Outer Item A li wrapping inner ul
      '<li style="margin: 0 0 4px 0;">Item A',
      // Inner nested ul appears inside Item A's li
      '<ul style="margin: 0 0 12px 0; padding-left: 24px;"><li style="margin: 0 0 4px 0;">Sub 1</li><li style="margin: 0 0 4px 0;">Sub 2</li></ul>',
      // Item B is a sibling at the outer level
      '<li style="margin: 0 0 4px 0;">Item B</li>',
    ], "nested-list/notion");
    // Must not contain <input> (no task glyphs bleed in)
    assert.ok(!html.includes("<input"), "nested-list/notion: must not contain <input>");
  });

  // DW-2.1: nested list on chat platforms (slack)
  test("DW_2_1_nested_list_slack", () => {
    const md = "- Item A\n  - Sub 1\n  - Sub 2\n- Item B";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    // Chat: all items appear as bullet-prefixed lines; nested items are
    // flattened into the same flow (structure lost, content preserved)
    assertContains(html, [
      "• Item A",
      "• Sub 1",
      "• Sub 2",
      "• Item B",
    ], "nested-list/slack");
    // No structural list tags on chat
    assert.ok(!html.includes("<ul"), "nested-list/slack: must not contain <ul>");
    assert.ok(!html.includes("<li"), "nested-list/slack: must not contain <li>");
  });

  // DW-2.1: deeply nested list (3 levels) on document platforms
  test("DW_2_1_nested_list_3_levels_notion", () => {
    const md = "- L1\n  - L2\n    - L3 deep";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, ["L1", "L2", "L3 deep"], "nested-list/3-levels/notion");
    // Must have 3 nested ul elements
    const ulCount = (html.match(/<ul /g) || []).length;
    assert.ok(ulCount >= 3, `nested-list/3-levels/notion: expected ≥3 <ul>, got ${ulCount}`);
  });

  // DW-2.1: loose list items (blank line between items) on document platforms
  test("DW_2_1_loose_list_notion", () => {
    const md = "- Item A\n\n- Item B (loose)\n\n- Item C";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    // Loose items have paragraph tokens — parse() wraps them in <p>; the li still renders
    assertContains(html, [
      '<ul style="margin: 0 0 12px 0; padding-left: 24px;">',
      "Item A",
      "Item B (loose)",
      "Item C",
    ], "loose-list/notion");
    // Must not have thrown (if we get here, it didn't throw)
    assert.ok(html.includes("<li"), "loose-list/notion: must contain <li> elements");
  });

  // DW-2.1: loose list items on chat platforms
  test("DW_2_1_loose_list_slack", () => {
    const md = "- Item A\n\n- Item B (loose)";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      "• Item A",
      "• Item B (loose)",
    ], "loose-list/slack");
    assert.ok(!html.includes("<ul"), "loose-list/slack: must not contain <ul>");
  });

  // DW-2.1: ordered list numbering preserved with block content
  test("DW_2_1_ordered_list_notion", () => {
    const md = "1. First item\n2. Second item\n3. Third item";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      '<ol style="margin: 0 0 12px 0; padding-left: 24px;">',
      "First item",
      "Second item",
      "Third item",
    ], "ordered-list/notion");
  });
});

// ---------------------------------------------------------------------------
// DW-2.2 — Blockquote and hr: styled on document/email, text fallback on chat
// ---------------------------------------------------------------------------
describe("DW-2.2 — blockquote and hr", () => {
  // DW-2.2: blockquote on a document platform (notion)
  test("DW_2_2_blockquote_notion", () => {
    const md = "> This is a blockquote.\n> It spans multiple lines.";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Styled blockquote with border-left using notion's codeBorder token
      "<blockquote style=\"border-left: 3px solid #e4e3e0;",
      // Italic style applied to the blockquote
      "font-style: italic;",
      // Content survives
      "This is a blockquote.",
      "It spans multiple lines.",
    ], "blockquote/notion");
    // Must not be stripped (not an <input> or invisible element)
    assert.ok(html.includes("<blockquote"), "blockquote/notion: must contain <blockquote>");
  });

  // DW-2.2: blockquote visible text fallback on chat platform (slack)
  test("DW_2_2_blockquote_slack", () => {
    const md = "> This is a blockquote.\n> It spans multiple lines.";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    // Chat: no <blockquote> (stripped on paste) — visible text with "> " prefix
    assertContains(html, [
      // Each line prefixed with "> " in a white-space:pre span
      "white-space: pre;",
      // The "> " prefix must appear for each content line
      "> This is a blockquote.",
      "> It spans multiple lines.",
    ], "blockquote/slack");
    // Must not emit a bare unstyled <blockquote> that would be stripped
    assert.ok(!html.includes("<blockquote"), "blockquote/slack: must not contain <blockquote>");
    // Content must still appear
    assert.ok(html.includes("This is a blockquote."), "blockquote/slack: content must be visible");
  });

  // DW-2.2: blockquote on email platform (outlook) — must be styled, not chat fallback
  test("DW_2_2_blockquote_outlook", () => {
    const md = "> A quote for email.";
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    // Outlook is not a chat platform — structural blockquote must be used
    assertContains(html, [
      "<blockquote style=\"border-left: 3px solid",
      "A quote for email.",
    ], "blockquote/outlook");
  });

  // DW-2.2: hr on a document platform (notion)
  test("DW_2_2_hr_notion", () => {
    const md = "---";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Styled hr with notion's border token
      '<hr style="border: none; border-top: 1px solid #e4e3e0; margin: 16px 0;">',
    ], "hr/notion");
  });

  // DW-2.2: hr visible text fallback on chat platform (slack)
  test("DW_2_2_hr_slack", () => {
    const md = "---";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    // Chat: <hr> is stripped on paste — render Unicode rule characters instead
    assertContains(html, [
      "────────────────────",
    ], "hr/slack");
    // Must not emit a bare <hr> that would vanish on paste
    assert.ok(!html.includes("<hr"), "hr/slack: must not contain <hr>");
  });

  // DW-2.2: hr on email platform (outlook) — styled, not chat fallback
  test("DW_2_2_hr_outlook", () => {
    const md = "---";
    const html = bodyOf(convert(md, resolveTokens("outlook", "light"), "outlook"));
    assertContains(html, [
      '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;">',
    ], "hr/outlook");
  });
});

// ---------------------------------------------------------------------------
// DW-2.3 — Task lists, strikethrough, and images
// ---------------------------------------------------------------------------
describe("DW-2.3 — task lists, strikethrough, images", () => {
  // DW-2.3: task list glyphs on a document platform (notion)
  test("DW_2_3_task_list_notion", () => {
    const md = "- [x] Completed task\n- [ ] Pending task\n- [x] Another done item";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    // Glyphs must appear instead of <input>
    assertContains(html, [
      "☑ Completed task",
      "☐ Pending task",
      "☑ Another done item",
    ], "task-list/notion");
    // No <input> elements — they are stripped on paste
    assert.ok(!html.includes("<input"), "task-list/notion: must not contain <input>");
  });

  // DW-2.3: task list glyphs on chat platform (slack)
  test("DW_2_3_task_list_slack", () => {
    const md = "- [x] Completed\n- [ ] Pending";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      "☑ Completed",
      "☐ Pending",
    ], "task-list/slack");
    assert.ok(!html.includes("<input"), "task-list/slack: must not contain <input>");
  });

  // DW-2.3: mixed task and normal items (normal items must not get glyphs)
  test("DW_2_3_task_list_mixed_notion", () => {
    const md = "- [x] Done\n- [ ] Pending\n- Normal item";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, ["☑ Done", "☐ Pending", "Normal item"], "task-list/mixed/notion");
    assert.ok(!html.includes("<input"), "task-list/mixed/notion: no <input>");
    // Normal item must not have a glyph prefix
    assert.ok(!html.match(/[☐☑] Normal item/), "task-list/mixed/notion: normal item must not have glyph");
  });

  // DW-2.3: strikethrough renders with inline text-decoration style
  test("DW_2_3_strikethrough_notion", () => {
    const md = "This has ~~struck-through~~ words.";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      '<del style="text-decoration: line-through;">struck-through</del>',
    ], "strikethrough/notion");
  });

  // DW-2.3: strikethrough on chat platform (del is inline, survives paste)
  test("DW_2_3_strikethrough_slack", () => {
    const md = "~~crossed out~~";
    const html = bodyOf(convert(md, resolveTokens("slack", "light"), "slack"));
    assertContains(html, [
      '<del style="text-decoration: line-through;">crossed out</del>',
    ], "strikethrough/slack");
  });

  // DW-2.3: image renders as <a href>alt</a> (not <img> which is stripped on paste)
  test("DW_2_3_image_notion", () => {
    const md = "![Architecture diagram](https://example.com/arch.png)";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // Link-with-alt: destination preserved, alt text as label
      '<a href="https://example.com/arch.png"',
      'Architecture diagram',
    ], "image/notion");
    // No <img> — stripped on paste, losing the URL
    assert.ok(!html.includes("<img"), "image/notion: must not contain <img>");
  });

  // DW-2.3: image with empty alt falls back to URL as label
  test("DW_2_3_image_empty_alt_notion", () => {
    const md = "![](https://example.com/no-alt.png)";
    const html = bodyOf(convert(md, resolveTokens("notion", "light"), "notion"));
    assertContains(html, [
      // URL itself is the link label when alt is empty
      '<a href="https://example.com/no-alt.png"',
      "https://example.com/no-alt.png",
    ], "image/empty-alt/notion");
    assert.ok(!html.includes("<img"), "image/empty-alt/notion: must not contain <img>");
  });

  // DW-2.3: image on email platform (outlook) — link colors are inlined by post-pass
  test("DW_2_3_image_outlook", () => {
    const md = "![Diagram](https://example.com/img.png)";
    const html = convert(md, resolveTokens("outlook", "light"), "outlook");
    // Email post-pass inlines link colors onto <a> tags
    assert.ok(html.includes("https://example.com/img.png"), "image/outlook: URL must appear");
    assert.ok(html.includes("Diagram"), "image/outlook: alt text must appear");
    assert.ok(!html.includes("<img"), "image/outlook: must not contain <img>");
  });
});
