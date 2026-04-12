#!/usr/bin/env bun
const fs = require("fs");

const { ALL_PLATFORMS, getSystemTheme, resolveTokens } = require("../src/tokens");
const { convert } = require("../src/render");
const { copyToClipboard } = require("../src/clipboard");

function usage() {
  console.error("Usage: penman --for <platform> [--theme dark|light] [file]");
  console.error("       cat file.md | penman --for teams");
  console.error("");
  console.error(`Platforms: ${ALL_PLATFORMS.join(", ")}`);
  console.error("");
  console.error("Options:");
  console.error("  --for, -f     Target platform");
  console.error("  --theme, -t   Force light or dark (default: system)");
  console.error("  --tokens      Print resolved tokens as JSON and exit");
  console.error("");
  console.error("Config: ~/.penman.json5 (supports comments)");
  process.exit(1);
}

const args = process.argv.slice(2);
let platformName = null;
let themeOverride = null;
let filePath = null;
let printTokens = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--for" || args[i] === "-f") {
    platformName = args[++i];
  } else if (args[i] === "--theme" || args[i] === "-t") {
    themeOverride = args[++i];
  } else if (args[i] === "--tokens") {
    printTokens = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    usage();
  } else {
    filePath = args[i];
  }
}

if (!platformName || !ALL_PLATFORMS.includes(platformName)) {
  if (platformName) console.error(`Unknown platform: ${platformName}. Use ${ALL_PLATFORMS.join(", ")}.`);
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

if (filePath) {
  run(fs.readFileSync(filePath, "utf-8"));
} else if (!process.stdin.isTTY) {
  let data = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => run(data));
} else {
  console.error("Error: no input. Provide a file or pipe markdown via stdin.");
  usage();
}
