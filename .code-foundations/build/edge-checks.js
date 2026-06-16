"use strict";
const { convert } = require("../../src/render.js");
const { resolveTokens } = require("../../src/tokens.js");

let allPass = true;
function check(label, condition, detail) {
  if (!condition) {
    console.log("FAIL", label, detail || "");
    allPass = false;
  } else {
    console.log("PASS", label);
  }
}

// Edge 1: Deeply nested lists (>=3 levels) on notion + slack — must not throw
try {
  const md4 = "- L1\n  - L2\n    - L3\n      - L4 deep";
  const n = convert(md4, resolveTokens("notion", "light"), "notion");
  const s = convert(md4, resolveTokens("slack", "light"), "slack");
  check("EDGE-1 deeply-nested(4-levels)/notion: no throw", true);
  check("EDGE-1 deeply-nested(4-levels)/notion: L1 present", n.includes("L1"));
  check("EDGE-1 deeply-nested(4-levels)/notion: L4 deep present", n.includes("L4 deep"));
  check("EDGE-1 deeply-nested(4-levels)/slack: no throw", true);
  check("EDGE-1 deeply-nested(4-levels)/slack: L4 deep present", s.includes("L4 deep"));
} catch (e) {
  check("EDGE-1 deeply-nested: no throw", false, e.message);
}

// Edge 2: Ordered list with loose items (blank line between) — numbering via <ol>
try {
  const md = "1. First\n\n2. Second\n\n3. Third";
  const n = convert(md, resolveTokens("notion", "light"), "notion");
  check("EDGE-2 ordered-loose/notion: no throw", true);
  check("EDGE-2 ordered-loose/notion: has <ol>", n.includes("<ol"));
  check("EDGE-2 ordered-loose/notion: First present", n.includes("First"));
  check("EDGE-2 ordered-loose/notion: Second present", n.includes("Second"));
  check("EDGE-2 ordered-loose/notion: Third present", n.includes("Third"));
} catch (e) {
  check("EDGE-2 ordered-loose: no throw", false, e.message);
}

// Edge 3: Blockquote on slack — visible text fallback, not dropped/empty tag
try {
  const bqMd = "> Some quote here.";
  const bq = convert(bqMd, resolveTokens("slack", "light"), "slack");
  check("EDGE-3 blockquote/slack: no <blockquote> element", !bq.includes("<blockquote"));
  check("EDGE-3 blockquote/slack: content visible", bq.includes("Some quote here."));
  check("EDGE-3 blockquote/slack: '> ' prefix present", bq.includes("> Some quote here."));
} catch (e) {
  check("EDGE-3 blockquote/slack: no throw", false, e.message);
}

// Edge 3b: hr on slack — visible text fallback
try {
  const hrMd = "---";
  const hr = convert(hrMd, resolveTokens("slack", "light"), "slack");
  check("EDGE-3b hr/slack: no <hr> element", !hr.includes("<hr"));
  check("EDGE-3b hr/slack: Unicode rule fallback present", hr.includes("────────────────────"));
} catch (e) {
  check("EDGE-3b hr/slack: no throw", false, e.message);
}

// Edge 4: Image with empty alt falls back to URL as link text (label = URL)
try {
  const md = "![](https://example.com/no-alt.png)";
  const n = convert(md, resolveTokens("notion", "light"), "notion");
  check("EDGE-4 image/empty-alt: no <img>", !n.includes("<img"));
  check("EDGE-4 image/empty-alt: URL in output", n.includes("https://example.com/no-alt.png"));
  // The URL should appear as link text, not just in href
  // Pattern: <a href="URL" ...>URL</a>
  const linkTextMatch = n.match(/href="https:\/\/example\.com\/no-alt\.png"[^>]*>([^<]+)<\/a>/);
  const linkText = linkTextMatch ? linkTextMatch[1] : null;
  check(
    "EDGE-4 image/empty-alt: URL is link label (not just href)",
    linkText === "https://example.com/no-alt.png",
    `got link label: ${JSON.stringify(linkText)}`
  );
} catch (e) {
  check("EDGE-4 image/empty-alt: no throw", false, e.message);
}

// Edge 5: Task list mixed with normal list items
try {
  const md = "- [x] Done\n- [ ] Pending\n- Normal item\n- [x] Also done";
  const n = convert(md, resolveTokens("notion", "light"), "notion");
  check("EDGE-5 task-mixed/notion: has ☑", n.includes("☑"));
  check("EDGE-5 task-mixed/notion: has ☐", n.includes("☐"));
  check("EDGE-5 task-mixed/notion: Normal item present", n.includes("Normal item"));
  check("EDGE-5 task-mixed/notion: no <input>", !n.includes("<input"));
  // Normal item must not have a glyph prefix
  const normalWithGlyph = n.match(/[☐☑]\s*Normal item/);
  check("EDGE-5 task-mixed/notion: normal item has no glyph", !normalWithGlyph);
} catch (e) {
  check("EDGE-5 task-mixed: no throw", false, e.message);
}

// Edge 6: No <style> blocks in convert() output for any platform
try {
  const platforms = ["notion", "slack", "outlook", "gmail", "teams", "discord", "word", "google-docs"];
  const md = "# H1\n\npara\n\n- item\n\n```js\ncode\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |";
  for (const p of platforms) {
    const out = convert(md, resolveTokens(p, "light"), p);
    check(`EDGE-6 no-<style>-blocks/${p}`, !out.includes("<style"), `found <style> in output`);
  }
} catch (e) {
  check("EDGE-6 no-style-blocks: no throw", false, e.message);
}

console.log("\n" + (allPass ? "ALL EDGE CHECKS PASSED" : "SOME EDGE CHECKS FAILED"));
process.exit(allPass ? 0 : 1);
