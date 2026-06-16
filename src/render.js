const { Marked } = require("marked");
const hljs = require("highlight.js");
const { EMAIL_PLATFORMS } = require("./tokens");

// Chat platforms (Slack, Teams, Discord) aggressively strip HTML structure on
// paste — `<h1>` and `<p>` get flattened into inline runs with no spacing. We
// render them as flat `<br><br>`-separated text with `<strong>` headings,
// which survives their paste handlers and still produces visible structure.
const CHAT_PLATFORMS = new Set(["slack", "teams", "discord"]);

const HEADING_SCALES = { 1: 1.8, 2: 1.5, 3: 1.25, 4: 1.1, 5: 1, 6: 0.9 };

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

// Single source of truth for highlight.js class → CSS rule.
// Used to build both the <style> block (chat/doc platforms) and the
// inline-style replacer (email platforms that strip <style> tags).
function buildHljsRules(t) {
  return {
    "hljs-keyword": `color: ${t.syntaxKeyword}; font-weight: bold;`,
    "hljs-built_in": `color: ${t.syntaxBuiltIn};`,
    "hljs-type": `color: ${t.syntaxKeyword};`,
    "hljs-literal": `color: ${t.syntaxBuiltIn};`,
    "hljs-number": `color: ${t.syntaxNumber};`,
    "hljs-string": `color: ${t.syntaxString};`,
    "hljs-comment": `color: ${t.syntaxComment}; font-style: italic;`,
    "hljs-function": `color: ${t.syntaxFunction};`,
    "hljs-title": `color: ${t.syntaxFunction};`,
    "hljs-params": `color: ${t.text};`,
    "hljs-attr": `color: ${t.syntaxAttr};`,
    "hljs-attribute": `color: ${t.syntaxString};`,
    "hljs-selector-tag": `color: ${t.syntaxTag};`,
    "hljs-selector-class": `color: ${t.syntaxFunction};`,
    "hljs-tag": `color: ${t.syntaxTag};`,
    "hljs-name": `color: ${t.syntaxTag};`,
    "hljs-variable": `color: ${t.syntaxVariable};`,
    "hljs-template-variable": `color: ${t.syntaxVariable};`,
    "hljs-deletion": `color: ${t.syntaxDeletion}; background: ${t.syntaxDeletionBg};`,
    "hljs-addition": `color: ${t.syntaxAddition}; background: ${t.syntaxAdditionBg};`,
    "hljs-meta": `color: ${t.syntaxMeta};`,
    "hljs-regexp": `color: ${t.syntaxRegexp};`,
    "hljs-symbol": `color: ${t.syntaxBuiltIn};`,
    "hljs-bullet": `color: ${t.syntaxVariable};`,
    "hljs-link": `color: ${t.link}; text-decoration: underline;`,
    "hljs-emphasis": `font-style: italic;`,
    "hljs-strong": `font-weight: bold;`,
  };
}

function inlineHljsStyles(html, rules) {
  return html.replace(/<span class="([^"]+)">/g, (_, classes) => {
    const styles = classes
      .split(/\s+/)
      .map((cls) => rules[cls])
      .filter(Boolean);
    return styles.length > 0 ? `<span style="${styles.join(" ")}">` : "<span>";
  });
}

function inlineLinkStyles(html, t) {
  return html.replace(/<a /g, `<a style="color: ${t.link};" `);
}

function buildBodyStyle(t, isChat) {
  if (isChat) {
    // Chat platforms (Slack, Teams, Discord) impose their own theme. Setting
    // color or background fights the native dark/light mode and produces
    // mismatched greys. Only set typography — let the platform's theme win.
    return `font-family: ${t.fontFamily}; font-size: ${t.fontSize}; line-height: ${t.lineHeight};`;
  }
  return `font-family: ${t.fontFamily}; font-size: ${t.fontSize}; line-height: ${t.lineHeight}; color: ${t.text}; background: ${t.bg};`;
}

function buildCodeBlockStyle(t) {
  return `background: ${t.codeBg}; border: 1px solid ${t.codeBorder}; border-radius: 4px; padding: 12px; font-family: ${t.codeFontFamily}; font-size: ${t.codeFontSize}; color: ${t.codeText}; overflow-x: auto; white-space: pre;`;
}

function buildInlineCodeStyle(t) {
  return `background: ${t.inlineCodeBg}; border: 1px solid ${t.inlineCodeBorder}; border-radius: 3px; padding: 2px 5px; font-family: ${t.codeFontFamily}; font-size: ${t.codeFontSize}; color: ${t.inlineCodeText};`;
}

function highlight(text, lang) {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(text, { language: lang }).value;
  }
  return hljs.highlightAuto(text).value;
}

function convert(md, tokens, platformName) {
  const isEmail = EMAIL_PLATFORMS.has(platformName);
  const isChat = CHAT_PLATFORMS.has(platformName);
  const codeBlockStyle = buildCodeBlockStyle(tokens);
  const inlineCodeStyle = buildInlineCodeStyle(tokens);
  const hljsRules = buildHljsRules(tokens);

  const renderer = {
    code({ text, lang }) {
      let highlighted = highlight(text, lang);
      highlighted = inlineHljsStyles(highlighted, hljsRules);
      // Wrap code in a single-cell table — <pre> background gets stripped by
      // every paste handler (Word, Notion, etc.), but table cell backgrounds
      // survive universally.
      const cellStyle = `background: ${tokens.codeBg}; padding: 12px; font-family: ${tokens.codeFontFamily}; font-size: ${tokens.codeFontSize};`;
      const wrapper = `<table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 12px 0;"><tr><td style="${cellStyle}"><pre style="margin: 0; white-space: pre; color: ${tokens.codeText};"><code><span style="color: ${tokens.codeText};">${highlighted}</span></code></pre></td></tr></table>`;
      return isChat ? wrapper + "<br>" : wrapper;
    },
    codespan({ text }) {
      return `<code style="${inlineCodeStyle}">${text}</code>`;
    },
    heading({ tokens: inline, depth }) {
      const text = this.parser.parseInline(inline);
      if (isChat) {
        return `<strong>${text}</strong><br>`;
      }
      const scale = HEADING_SCALES[depth] || 1;
      const baseSize = parseFloat(tokens.fontSize);
      const unit = tokens.fontSize.replace(/[\d.]/g, "") || "pt";
      const size = `${Math.round(baseSize * scale)}${unit}`;
      const style = `font-size: ${size}; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.25;`;
      return `<h${depth} style="${style}">${text}</h${depth}>`;
    },
    paragraph({ tokens: inline }) {
      const text = this.parser.parseInline(inline);
      if (isChat) {
        return `${text}<br><br>`;
      }
      return `<p style="margin: 0 0 12px 0;">${text}</p>`;
    },
    list({ ordered, items }) {
      // Render a single list item's content for document/email platforms.
      // Item tokens may be:
      //   - inline-only (tight items): [text, ...] — parse() dispatches inline
      //   - block-content (loose items): [paragraph, ...] — parse() wraps in <p>
      //   - nested list: [text, list, ...] — parse() calls list renderer recursively
      //   - task item: [checkbox, text, ...] — filter checkbox first, prepend glyph
      //
      // parseInline() cannot handle block-level tokens like `list` or `paragraph`,
      // which is the crash source. parse() handles all token types correctly and
      // still dispatches inline tokens through the inline renderer when appropriate.
      const renderItemDoc = (item) => {
        if (item.task) {
          // Task items carry a leading `checkbox` token that parse() renders as
          // <input type="checkbox"> — stripped on paste. Remove it, prepend the
          // Unicode glyph instead so the checked state survives without a form element.
          const glyph = item.checked ? "☑" : "☐";
          const contentTokens = item.tokens.filter((t) => t.type !== "checkbox");
          return `${glyph} ${this.parser.parse(contentTokens)}`;
        }
        return this.parser.parse(item.tokens);
      };

      if (isChat) {
        // Chat platforms (Slack, Teams, Discord) strip <ul>/<ol>/<li> on paste.
        // Render as bullet/number prefixed lines joined by <br>. Nested lists
        // are flattened: the inner list() renderer recursively returns its own
        // bullet lines, and we strip the trailing <br><br> so the joined output
        // doesn't accumulate extra blank lines between levels. All visible
        // content (bullets, text) is preserved even when structural tags are lost.
        const chatLines = items.map((item, i) => {
          const bullet = ordered ? `${i + 1}. ` : "• ";
          if (item.task) {
            const glyph = item.checked ? "☑" : "☐";
            const inlineTokens = item.tokens.filter((t) => t.type !== "checkbox" && t.type !== "list");
            const text = stripTags(this.parser.parse(inlineTokens)).trim();
            return `${bullet}${glyph} ${text}`;
          }
          // Split item.tokens into the inline/block-text portion and any nested
          // lists. Render text inline via parse(), then append the nested list's
          // chat output (trimming its trailing <br><br> to avoid double spacing).
          const inlineTokens = item.tokens.filter((t) => t.type !== "list");
          const nestedListTokens = item.tokens.filter((t) => t.type === "list");
          const text = stripTags(this.parser.parse(inlineTokens)).trim();
          const itemLine = `${bullet}${text}`;
          if (nestedListTokens.length === 0) return itemLine;
          const nested = nestedListTokens
            .map((lt) => this.parser.parse([lt]).replace(/<br><br>$/, ""))
            .join("<br>");
          return `${itemLine}<br>${nested}`;
        });
        return `${chatLines.join("<br>")}<br><br>`;
      }
      const tag = ordered ? "ol" : "ul";
      const inner = items
        .map((item) => `<li style="margin: 0 0 4px 0;">${renderItemDoc(item)}</li>`)
        .join("");
      return `<${tag} style="margin: 0 0 12px 0; padding-left: 24px;">${inner}</${tag}>`;
    },
    blockquote({ tokens: blockTokens }) {
      // <blockquote> is stripped by all paste handlers, so it only works on
      // document/email platforms that preserve structural HTML. Chat gets a
      // text-prefix fallback using the conventional `> ` quoting style.
      const inner = this.parser.parse(blockTokens);
      if (isChat) {
        // Strip HTML, prefix each non-empty line with `> `, and preserve line
        // breaks via white-space: pre so the quote structure survives paste.
        const text = stripTags(inner).trim();
        const prefixed = text
          .split("\n")
          .map((line) => (line.trim() ? `> ${line}` : ">"))
          .join("\n");
        return `<span style="white-space: pre;">${prefixed}</span><br><br>`;
      }
      // Border-left gives the visual indent that distinguishes a quote from body
      // text; padding separates the text from the border line.
      const style = `border-left: 3px solid ${tokens.codeBorder}; margin: 0 0 12px 0; padding: 8px 12px; color: ${tokens.text}; font-style: italic;`;
      return `<blockquote style="${style}">${inner}</blockquote>`;
    },
    hr() {
      // <hr> is stripped by all paste handlers. Chat gets a Unicode rule that
      // survives as plain text. Document/email get a styled horizontal rule.
      if (isChat) {
        // U+2500 BOX DRAWINGS LIGHT HORIZONTAL × 20 — visible in every monospaced
        // and proportional font; short enough not to wrap on narrow viewports.
        return `<span>────────────────────</span><br><br>`;
      }
      return `<hr style="border: none; border-top: 1px solid ${tokens.codeBorder}; margin: 16px 0;">`;
    },
    del({ tokens: inlineTokens }) {
      // <del> is an inline element that survives paste in both document and chat
      // platforms, so no chat-mode branch is needed. Add the style explicitly
      // because paste handlers strip browser default text-decoration rules.
      return `<del style="text-decoration: line-through;">${this.parser.parseInline(inlineTokens)}</del>`;
    },
    image({ href, text }) {
      // <img> is stripped on paste by every platform — the src URL is lost.
      // Degrade to a hyperlink so the destination + alt text both survive.
      // Empty alt falls back to the URL itself so the link is still meaningful.
      const label = text || href;
      return `<a href="${href}" style="color: ${tokens.link};">${label}</a>`;
    },
    table({ header, rows }) {
      if (isChat) {
        // Chat platforms (Slack, Teams, Discord) strip <table> entirely.
        // Render as a text-aligned table inside a <pre> block instead.
        const allRows = [header, ...rows];
        // Compute column widths from plain text content.
        const colWidths = header.map((_, ci) =>
          Math.max(...allRows.map((r) => stripTags(this.parser.parseInline(r[ci].tokens)).length))
        );
        const pad = (text, width, align) => {
          const gap = width - text.length;
          if (gap <= 0) return text;
          if (align === "right") return " ".repeat(gap) + text;
          if (align === "center") {
            const l = Math.floor(gap / 2);
            return " ".repeat(l) + text + " ".repeat(gap - l);
          }
          return text + " ".repeat(gap);
        };
        const fmtRow = (cells) =>
          cells
            .map((c, i) => pad(stripTags(this.parser.parseInline(c.tokens)), colWidths[i], c.align))
            .join(" | ");
        const headerLine = fmtRow(header);
        const sep = colWidths.map((w) => "-".repeat(w)).join("-+-");
        const bodyLines = rows.map((r) => fmtRow(r));
        const table = [headerLine, sep, ...bodyLines].join("\n");
        const cellBg = `background: ${tokens.codeBg}; padding: 8px 12px; font-family: ${tokens.codeFontFamily}; font-size: ${tokens.codeFontSize};`;
        return `<table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 12px 0;"><tr><td style="${cellBg}"><pre style="margin: 0; white-space: pre; color: ${tokens.codeText};">${table}</pre></td></tr></table><br>`;
      }

      const border = `1px solid ${tokens.codeBorder}`;
      const cellStyle = (align) => {
        const ta = align ? `text-align: ${align}; ` : "";
        return `${ta}padding: 6px 12px; border: ${border};`;
      };
      const thStyle = (align) => `${cellStyle(align)} font-weight: bold; background: ${tokens.codeBg};`;

      const ths = header
        .map((c) => `<th style="${thStyle(c.align)}">${this.parser.parseInline(c.tokens)}</th>`)
        .join("");
      const head = `<thead><tr>${ths}</tr></thead>`;

      const bodyRows = rows
        .map((row) => {
          const tds = row
            .map((c) => `<td style="${cellStyle(c.align)}">${this.parser.parseInline(c.tokens)}</td>`)
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      const tbody = `<tbody>${bodyRows}</tbody>`;

      return `<table style="width: 100%; border-collapse: collapse; border: ${border}; margin: 0 0 12px 0;">${head}${tbody}</table>`;
    },
  };

  // Instance-scoped marked — no global state, safe under concurrent calls.
  const marked = new Marked({ renderer, gfm: true, breaks: false });
  const body = marked.parse(md);
  const bodyStyle = buildBodyStyle(tokens, isChat);

  // All styles are now inlined — no <style> block needed. Email platforms
  // also get inline link styles since they strip <a> default colors.
  let html = `<html><head><meta charset="utf-8"></head><body style="${bodyStyle}">${body}</body></html>`;
  if (isEmail) html = inlineLinkStyles(html, tokens);
  return html;
}

module.exports = { convert };
