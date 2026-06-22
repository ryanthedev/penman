const { Marked } = require("marked");

// Terminal target: produce the exact command text to drop on the clipboard as
// PLAIN text (no rich/HTML flavor — a terminal can't use it).
//
// "Smart" extraction: if the markdown contains fenced code blocks, return their
// contents (the commands), ignoring surrounding prose; otherwise treat the whole
// input as the command. This covers both "here's my answer, grab the commands"
// and "this IS the command".
//
// The trailing newline is stripped so the LAST line sits at the prompt awaiting
// Enter rather than auto-executing on paste ("wait for Enter"). Earlier lines in
// a multi-line block still run on paste — that is inherent to how terminals
// handle pasted newlines and is not something the clipboard can change.
function toTerminalText(md) {
  const codeBlocks = [];
  const walk = (tokens) => {
    for (const t of tokens) {
      if (t.type === "code") codeBlocks.push(t.text);
      if (Array.isArray(t.tokens)) walk(t.tokens);
      if (Array.isArray(t.items)) for (const item of t.items) if (Array.isArray(item.tokens)) walk(item.tokens);
    }
  };
  walk(new Marked().lexer(md));

  const out = codeBlocks.length > 0 ? codeBlocks.join("\n") : md;
  // Strip trailing newlines/whitespace so the final command waits for Enter.
  return out.replace(/\s+$/, "");
}

module.exports = { toTerminalText };
