#!/usr/bin/env bun
const fs = require("fs");

const { ALL_PLATFORMS, ALL_TARGETS, TERMINAL_TARGET, getSystemTheme, resolveTokens } = require("../src/tokens");
const { convert } = require("../src/render");
const { toCraftBlocks } = require("../src/craft");
const { toTerminalText } = require("../src/terminal");
const { copyToClipboard, copyPlainToClipboard } = require("../src/clipboard");

function usage() {
  console.error("Usage: penman --for <platform> [--theme dark|light] [file]");
  console.error("       cat file.md | penman --for teams");
  console.error("");
  console.error(`Targets: ${ALL_TARGETS.join(", ")}`);
  console.error("");
  console.error("Options:");
  console.error("  --for, -f       Target platform (or \"terminal\" for a plain-text command)");
  console.error("  --theme, -t     Force light or dark (default: system)");
  console.error("  --tokens        Print resolved tokens as JSON and exit");
  console.error("  --craft-blocks  Print native Craft block JSON (Mode A) to stdout, no clipboard");
  console.error("");
  console.error("Config: ~/.penman.json5 (supports comments)");
  process.exit(1);
}

const args = process.argv.slice(2);
let platformName = null;
let themeOverride = null;
let filePath = null;
let printTokens = false;
let craftBlocks = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--for" || args[i] === "-f") {
    platformName = args[++i];
  } else if (args[i] === "--theme" || args[i] === "-t") {
    themeOverride = args[++i];
  } else if (args[i] === "--tokens") {
    printTokens = true;
  } else if (args[i] === "--craft-blocks") {
    craftBlocks = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    usage();
  } else {
    filePath = args[i];
  }
}

// --craft-blocks is Mode A: markdown → native Craft block JSON to stdout. It is
// platform-agnostic (the blocks aren't styled per platform) and never touches
// the clipboard, so it skips platform/theme/token resolution entirely. Reading
// input (file or stdin) is shared with the HTML path below.
function readInput(consume) {
  if (filePath) {
    consume(fs.readFileSync(filePath, "utf-8"));
  } else if (!process.stdin.isTTY) {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => consume(data));
  } else {
    console.error("Error: no input. Provide a file or pipe markdown via stdin.");
    usage();
  }
}

if (craftBlocks) {
  readInput((md) => {
    try {
      const blocks = toCraftBlocks(md);
      console.log(JSON.stringify(blocks, null, 2));
    } catch (e) {
      console.error(`penman --craft-blocks failed: ${e.message}`);
      process.exit(1);
    }
  });
  return;
}

// Terminal target: plain command text, no tokens/theme/HTML. Like --craft-blocks,
// it short-circuits before platform/token resolution.
if (platformName === TERMINAL_TARGET) {
  readInput((md) => {
    const text = toTerminalText(md);
    copyPlainToClipboard(text);
    const lineCount = text.length === 0 ? 0 : text.split("\n").length;
    console.log(`Copied ${lineCount} line${lineCount === 1 ? "" : "s"} as plain text (terminal). The last line waits for Enter.`);
  });
  return;
}

if (!platformName || !ALL_TARGETS.includes(platformName)) {
  if (platformName) console.error(`Unknown target: ${platformName}. Use ${ALL_TARGETS.join(", ")}.`);
  usage();
}

const theme = themeOverride || getSystemTheme();
if (theme !== "light" && theme !== "dark") {
  console.error(`Unknown theme: ${theme}. Use light or dark.`);
  process.exit(1);
}

const tokens = resolveTokens(platformName, theme);

if (printTokens) {
  console.log(JSON.stringify(tokens, null, 2));
  process.exit(0);
}

function run(md) {
  const html = convert(md, tokens, platformName);
  copyToClipboard(html);
  console.log(`Copied to clipboard (${platformName}, ${theme})`);
}

readInput(run);
