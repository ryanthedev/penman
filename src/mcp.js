#!/usr/bin/env bun
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { ALL_PLATFORMS, ALL_TARGETS, TERMINAL_TARGET, getSystemTheme, resolveTokens } = require("./tokens");
const { convert } = require("./render");
const { toCraftBlocks } = require("./craft");
const { toTerminalText } = require("./terminal");
const { copyToClipboard, copyPlainToClipboard } = require("./clipboard");

const os = require("os");
const path = require("path");
const fs = require("fs");

const server = new McpServer({ name: "penman", version: "1.2.0" });

const PlatformEnum = z.enum(ALL_TARGETS);
const ThemeEnum = z.enum(["light", "dark"]);

const PLATFORM_GROUPS = {
  chat: ["teams", "slack", "discord"],
  document: ["word", "google-docs", "notion"],
  email: ["outlook", "gmail"],
  wiki: ["confluence", "jira"],
  presentation: ["powerpoint", "google-slides"],
  notes: ["craft"],
  terminal: ["terminal"],
};

function ok(text) {
  return { content: [{ type: "text", text }] };
}

function err(text) {
  return { isError: true, content: [{ type: "text", text }] };
}

function render(markdown, platform, theme) {
  const resolvedTheme = theme || getSystemTheme();
  const tokens = resolveTokens(platform, resolvedTheme);
  const html = convert(markdown, tokens, platform);
  return { html, resolvedTheme };
}

server.tool(
  "penman",
  `Convert markdown to platform-styled rich text and copy it to the macOS clipboard, ready to paste into the target app with formatting intact. Use this whenever the user asks to "pen" something — "pen this", "can you pen this", "pen it for Slack" — or otherwise wants to send formatted content somewhere to paste. Pick the "terminal" target to copy a multi-line command as plain text for pasting into a shell. Supports: ${ALL_TARGETS.join(", ")}. Theme defaults to the macOS system theme.`,
  {
    markdown: z.string().min(1).describe("Markdown source to convert."),
    platform: PlatformEnum.describe("Target — picks fonts, colors, and code styling. Use \"terminal\" to copy a multi-line command as plain text. Call `penman_platforms` to see options."),
    theme: ThemeEnum.optional().describe("Force light or dark. Defaults to the macOS system theme. Ignored for the terminal target."),
  },
  async ({ markdown, platform, theme }) => {
    try {
      if (platform === TERMINAL_TARGET) {
        const text = toTerminalText(markdown);
        copyPlainToClipboard(text);
        const lineCount = text.length === 0 ? 0 : text.split("\n").length;
        return ok(`Copied ${lineCount} line${lineCount === 1 ? "" : "s"} as plain text — paste into your terminal with ⌘V. The last line waits for you to press Enter.`);
      }
      const { html, resolvedTheme } = render(markdown, platform, theme);
      copyToClipboard(html);
      return ok(`Copied to clipboard — styled for ${platform} (${resolvedTheme}). Paste into the app with ⌘V.`);
    } catch (e) {
      return err(`penman failed: ${e.message}`);
    }
  }
);

server.tool(
  "penman_html",
  "Convert markdown to platform-styled HTML and return it as text without touching the clipboard. Use this to preview output, embed it elsewhere, or debug styling without side effects.",
  {
    markdown: z.string().min(1).describe("Markdown source to convert."),
    platform: PlatformEnum.describe("Target platform."),
    theme: ThemeEnum.optional().describe("Force light or dark. Defaults to system theme."),
  },
  async ({ markdown, platform, theme }) => {
    try {
      const { html, resolvedTheme } = render(markdown, platform, theme);
      return ok(`<!-- penman: ${platform} / ${resolvedTheme} -->\n${html}`);
    } catch (e) {
      return err(`penman_html failed: ${e.message}`);
    }
  }
);

server.tool(
  "penman_craft",
  "Convert markdown to native Craft block JSON (Mode A) and return it as text — WITHOUT touching the clipboard. penman cannot call Craft's MCP itself: take the returned block array and feed it to Craft's `craft_write` (each block's `markdown` field round-trips). Use this for high-fidelity Craft inserts; use `penman --for craft` (Mode B) when you just want styled HTML on the clipboard to paste.",
  {
    markdown: z.string().min(1).describe("Markdown source to convert to Craft blocks."),
  },
  async ({ markdown }) => {
    try {
      const blocks = toCraftBlocks(markdown);
      return ok(JSON.stringify(blocks, null, 2));
    } catch (e) {
      return err(`penman_craft failed: ${e.message}`);
    }
  }
);

server.tool(
  "penman_platforms",
  "List the targets penman can convert for, grouped by category (chat, document, email, wiki, presentation, notes, terminal). Call this first if you don't know which target the user wants.",
  {},
  async () => {
    const lines = ["Available penman targets:\n"];
    for (const [group, names] of Object.entries(PLATFORM_GROUPS)) {
      const present = names.filter((n) => ALL_TARGETS.includes(n));
      if (present.length === 0) continue;
      lines.push(`  ${group}: ${present.join(", ")}`);
    }
    const grouped = new Set(Object.values(PLATFORM_GROUPS).flat());
    const ungrouped = ALL_TARGETS.filter((p) => !grouped.has(p));
    if (ungrouped.length > 0) lines.push(`  other: ${ungrouped.join(", ")}`);
    return ok(lines.join("\n"));
  }
);

// Seeded into ~/.penman.json5 on first server boot if the user has no config
// yet. All-commented so an untouched file changes nothing — it's a discoverable
// starting point, not active overrides.
const CONFIG_TEMPLATE = `{
  // Penman config — supports comments (JSON5)
  // Override design tokens globally or per-platform.
  // Run \`penman --for <platform> --tokens\` to see all available tokens.

  // "tokens": {
  //   "codeFontFamily": "Fira Code, monospace",
  //   "codeBg": "#1a1a2e"
  // },

  // "platforms": {
  //   "slack": {
  //     "tokens": { "fontFamily": "Inter, sans-serif" }
  //   }
  // }
}
`;

// Lazy-seed the user config on first run. Replaces the old install-command
// step. Best-effort: a read-only home or a race must never stop the server,
// which runs fine with no user config (built-in tokens cover every platform).
function ensureUserConfig() {
  try {
    const home = os.homedir();
    const names = [".penman.json", ".penman.json5", ".penman.jsonc"];
    if (names.some((n) => fs.existsSync(path.join(home, n)))) return;
    // "wx" → fail instead of clobbering if another process wins the race.
    fs.writeFileSync(path.join(home, ".penman.json5"), CONFIG_TEMPLATE, { flag: "wx" });
  } catch {
    // Non-fatal by design.
  }
}

async function main() {
  ensureUserConfig();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Exported so tests (and any tooling) can assert on the platform grouping
// without booting the stdio transport. `render` is exported as the seam tests
// use to check Mode A/B token resolution.
module.exports = { PLATFORM_GROUPS, render, main, ensureUserConfig };

// Only connect the stdio transport when run as the entry point (penman-mcp),
// not when imported by a test. `require.main === module` is true only for the
// directly-executed file.
if (require.main === module) {
  main().catch((e) => {
    console.error("penman MCP fatal:", e);
    process.exit(1);
  });
}
