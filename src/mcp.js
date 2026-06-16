#!/usr/bin/env bun
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { ALL_PLATFORMS, getSystemTheme, resolveTokens } = require("./tokens");
const { convert } = require("./render");
const { toCraftBlocks } = require("./craft");
const { copyToClipboard } = require("./clipboard");

const server = new McpServer({ name: "penman", version: "1.1.0" });

const PlatformEnum = z.enum(ALL_PLATFORMS);
const ThemeEnum = z.enum(["light", "dark"]);

const PLATFORM_GROUPS = {
  chat: ["teams", "slack", "discord"],
  document: ["word", "google-docs", "notion"],
  email: ["outlook", "gmail"],
  wiki: ["confluence", "jira"],
  presentation: ["powerpoint", "google-slides"],
  notes: ["craft"],
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
  `Convert markdown to platform-styled HTML, transcode it to RTF, and copy to the macOS clipboard ready to paste into the target app. Supports: ${ALL_PLATFORMS.join(", ")}. Theme defaults to the system theme. Use this when the user wants to send formatted content somewhere.`,
  {
    markdown: z.string().min(1).describe("Markdown source to convert."),
    platform: PlatformEnum.describe("Target platform — picks fonts, colors, and code styling. Call `penman_platforms` to see options."),
    theme: ThemeEnum.optional().describe("Force light or dark. Defaults to the macOS system theme."),
  },
  async ({ markdown, platform, theme }) => {
    try {
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
  "List the platforms penman can target, grouped by category (chat, document, email, wiki, presentation). Call this first if you don't know which platform the user wants.",
  {},
  async () => {
    const lines = ["Available penman platforms:\n"];
    for (const [group, names] of Object.entries(PLATFORM_GROUPS)) {
      const present = names.filter((n) => ALL_PLATFORMS.includes(n));
      if (present.length === 0) continue;
      lines.push(`  ${group}: ${present.join(", ")}`);
    }
    const grouped = new Set(Object.values(PLATFORM_GROUPS).flat());
    const ungrouped = ALL_PLATFORMS.filter((p) => !grouped.has(p));
    if (ungrouped.length > 0) lines.push(`  other: ${ungrouped.join(", ")}`);
    return ok(lines.join("\n"));
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Exported so tests (and any tooling) can assert on the platform grouping
// without booting the stdio transport. `render` is exported as the seam tests
// use to check Mode A/B token resolution.
module.exports = { PLATFORM_GROUPS, render };

// Only connect the stdio transport when run as the entry point (penman-mcp),
// not when imported by a test. `require.main === module` is true only for the
// directly-executed file.
if (require.main === module) {
  main().catch((e) => {
    console.error("penman MCP fatal:", e);
    process.exit(1);
  });
}
