// craft.js — Mode A: markdown → native Craft block JSON.
//
// penman cannot call Craft's MCP itself. This module is a *pure converter*:
// it turns markdown into a JSON-serializable array of Craft blocks that an
// orchestrating agent hands to `craft_write` (which round-trips each block's
// `markdown` field). The block shapes here mirror what `craft_read --format
// json` returns from a real Craft doc (verified against the live Craft MCP).
//
// Design (APOSD deep module): ONE public seam — `toCraftBlocks(md)`. The marked
// lexer, the marked token shapes, and the Craft block schema are all hidden
// inside. There is deliberately no method-per-block-type public surface.

"use strict";

const { Marked } = require("marked");

// Craft tops out at h4 in its block model — markdown h5/h6 clamp down so we
// never emit a textStyle Craft would reject.
const MAX_CRAFT_HEADING = 4;

// --- Block constructors (private) -------------------------------------------
// Each returns the plain-object shape `craft_read --format json` produces for
// that construct. Kept private so the public surface stays a single method.

function textBlock(markdown, extra) {
  return { type: "text", markdown, ...extra };
}

function headingBlock(depth, markdown) {
  const level = Math.min(depth, MAX_CRAFT_HEADING);
  return textBlock(markdown, { textStyle: `h${level}` });
}

function codeBlock(lang, rawCode) {
  const language = lang || "";
  const fence = language ? `\`\`\`${language}\n${rawCode}\n\`\`\`` : `\`\`\`\n${rawCode}\n\`\`\``;
  return { type: "code", language, rawCode, markdown: fence };
}

function lineBlock() {
  // Craft's divider block. `***` is the markdown Craft itself stores for it.
  return { type: "line", lineStyle: "regular", markdown: "***" };
}

function imageBlock(href, alt) {
  return { type: "image", url: href, markdown: `![${alt || ""}](${href})` };
}

// Unsupported / unmapped constructs degrade VISIBLY (never silently dropped):
// the original source is preserved verbatim and the block is clearly tagged so
// a downstream agent — or a human reading the JSON — can see what didn't map.
function unsupportedBlock(tokenType, rawSource) {
  return {
    type: "unsupported",
    unsupportedType: tokenType,
    markdown: rawSource,
  };
}

// --- List handling (private) ------------------------------------------------
// Craft has no list-container block. Each item becomes its own `type:"text"`
// block carrying a `listStyle`; nesting is expressed via `indentationLevel`.
// We walk nested lists explicitly (recursing into any `list` token inside an
// item) — this is the same nested structure that crashed the HTML renderer,
// so it is handled here independently rather than inherited.

// An item's own text — NOT including any nested list. `item.text` concatenates
// the nested list's source (e.g. "a\n- nested"), which would duplicate content
// the nested items already emit as their own blocks. The item's leading `text`
// token carries just this item's line, so prefer it.
function ownItemText(item) {
  const textToken = (item.tokens || []).find((t) => t.type === "text" || t.type === "paragraph");
  const source = textToken ? textToken.text : item.text;
  return (source || "").trim();
}

function listItemMarkdown(ordered, index, item) {
  const text = ownItemText(item);
  if (item.task) {
    const box = item.checked ? "[x]" : "[ ]";
    return `- ${box} ${text}`;
  }
  if (ordered) return `${index + 1}. ${text}`;
  return `- ${text}`;
}

function listStyleFor(ordered, item) {
  if (item.task) return "task";
  return ordered ? "numbered" : "bullet";
}

function walkList(listToken, indent, out) {
  listToken.items.forEach((item, i) => {
    const extra = { listStyle: listStyleFor(listToken.ordered, item) };
    if (indent > 0) extra.indentationLevel = indent;
    if (item.task) extra.taskInfo = { state: item.checked ? "done" : "todo" };
    out.push(textBlock(listItemMarkdown(listToken.ordered, i, item), extra));

    // Recurse into any nested list nested inside this item, one level deeper.
    for (const child of item.tokens || []) {
      if (child.type === "list") walkList(child, indent + 1, out);
    }
  });
}

// --- Token walker (private) -------------------------------------------------
// Append the block(s) for one top-level token to `out`. Lists append many;
// most tokens append exactly one. Unmapped tokens degrade visibly.

function walkToken(token, out) {
  switch (token.type) {
    case "space":
      return; // blank-line token — no block
    case "heading":
      out.push(headingBlock(token.depth, token.text));
      return;
    case "paragraph": {
      // A paragraph that is *only* a standalone image becomes an image block,
      // mirroring how Craft stores a dropped-in image.
      if (token.tokens && token.tokens.length === 1 && token.tokens[0].type === "image") {
        const img = token.tokens[0];
        out.push(imageBlock(img.href, img.text));
        return;
      }
      out.push(textBlock(token.text));
      return;
    }
    case "code":
      out.push(codeBlock(token.lang, token.text));
      return;
    case "blockquote": {
      // Craft stores a quote as a text block decorated `quote`; the markdown is
      // the conventional `> `-prefixed source.
      const quoted = token.text
        .split("\n")
        .map((line) => (line.length ? `> ${line}` : ">"))
        .join("\n");
      out.push(textBlock(quoted, { decorations: ["quote"] }));
      return;
    }
    case "hr":
      out.push(lineBlock());
      return;
    case "list":
      walkList(token, 0, out);
      return;
    case "image":
      out.push(imageBlock(token.href, token.text));
      return;
    default:
      // table, html (raw HTML), and any future/unknown construct have no clean
      // Craft-block equivalent. Preserve the source, mark it — do not drop it.
      out.push(unsupportedBlock(token.type, token.raw != null ? token.raw : ""));
      return;
  }
}

// --- Public seam ------------------------------------------------------------
// toCraftBlocks(markdown) -> Craft block object[]
//
//   markdown is external input → validated at this boundary (cc-defensive):
//     - non-string            -> throw (caller contract violation, surfaced loud)
//     - empty / whitespace    -> [] (documented edge case)
//   Otherwise: lex with an instance-scoped marked lexer (reuse the one parser;
//   no second markdown library) and walk the top-level tokens into blocks.
function toCraftBlocks(markdown) {
  if (typeof markdown !== "string") {
    throw new Error(`toCraftBlocks: markdown must be a string, got ${typeof markdown}`);
  }
  if (markdown.trim() === "") {
    return [];
  }

  // Instance-scoped — no global marked state, safe under concurrent calls.
  const marked = new Marked({ gfm: true, breaks: false });
  const tokens = marked.lexer(markdown);

  const blocks = [];
  for (const token of tokens) {
    walkToken(token, blocks);
  }
  return blocks;
}

module.exports = { toCraftBlocks };
