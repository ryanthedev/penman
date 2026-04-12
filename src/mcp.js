#!/usr/bin/env bun
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { ALL_PLATFORMS, getSystemTheme, resolveTokens } = require("./tokens");
const { convert } = require("./render");
const { copyToClipboard } = require("./clipboard");

const server = new McpServer({ name: "penman", version: "1.0.0" });

const PlatformEnum = z.enum(ALL_PLATFORMS);
const ThemeEnum = z.enum(["light", "dark"]);

const PLATFORM_GROUPS = {
  chat: ["teams", "slack", "discord"],
  document: ["word", "google-docs", "notion"],
  email: ["outlook", "gmail"],
  wiki: ["confluence", "jira"],
  presentation: ["powerpoint", "google-slides"],
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

main().catch((e) => {
  console.error("penman MCP fatal:", e);
  process.exit(1);
});
