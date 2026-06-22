const { test } = require("node:test");
const assert = require("node:assert");
const { toTerminalText } = require("../src/terminal");

test("single fenced code block → just the command, no trailing newline", () => {
  const md = "Run this:\n\n```bash\nbun install\n```\n";
  assert.strictEqual(toTerminalText(md), "bun install");
});

test("prose around a code block is dropped; only the command remains", () => {
  const md = "Here's how:\n\n```sh\ncd app\nmake build\n```\n\nThen reload.";
  assert.strictEqual(toTerminalText(md), "cd app\nmake build");
});

test("multiple code blocks are joined in order", () => {
  const md = "```\ngit add -A\n```\n\nand\n\n```\ngit commit -m wip\n```";
  assert.strictEqual(toTerminalText(md), "git add -A\ngit commit -m wip");
});

test("no fenced code → whole input verbatim, trailing whitespace stripped", () => {
  const md = "echo hello && echo world\n\n";
  assert.strictEqual(toTerminalText(md), "echo hello && echo world");
});

test("multi-line raw command (no fences) is preserved across lines", () => {
  const md = "for f in *.txt; do\n  echo \"$f\"\ndone\n";
  assert.strictEqual(toTerminalText(md), "for f in *.txt; do\n  echo \"$f\"\ndone");
});

test("trailing newline is always stripped so the last line waits for Enter", () => {
  const out = toTerminalText("```\nrm -rf /tmp/x\n```\n\n\n");
  assert.ok(!out.endsWith("\n"), "must not end with a newline");
  assert.strictEqual(out, "rm -rf /tmp/x");
});
