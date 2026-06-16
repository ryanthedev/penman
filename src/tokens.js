const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const JSON5 = require("json5");

// --- Design tokens ---

const baseTokens = {
  light: {
    // Typography
    fontFamily: "sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    codeFontFamily: "Consolas, Courier New, monospace",
    codeFontSize: "12px",

    // Colors
    text: "#24292e",
    bg: "#ffffff",
    codeBg: "#f5f5f5",
    codeBorder: "#e0e0e0",
    codeText: "#24292e",
    inlineCodeBg: "#f0f0f0",
    inlineCodeBorder: "transparent",
    inlineCodeText: "#e01e5a",
    link: "#0366d6",

    // Syntax highlighting
    syntaxKeyword: "#d73a49",
    syntaxBuiltIn: "#005cc5",
    syntaxString: "#032f62",
    syntaxComment: "#6a737d",
    syntaxFunction: "#6f42c1",
    syntaxNumber: "#005cc5",
    syntaxVariable: "#e36209",
    syntaxTag: "#22863a",
    syntaxAttr: "#005cc5",
    syntaxDeletion: "#b31d28",
    syntaxDeletionBg: "#ffeef0",
    syntaxAddition: "#22863a",
    syntaxAdditionBg: "#f0fff4",
    syntaxMeta: "#005cc5",
    syntaxRegexp: "#032f62",
  },
  dark: {
    fontFamily: "sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    codeFontFamily: "Consolas, Courier New, monospace",
    codeFontSize: "12px",

    text: "#e1e4e8",
    bg: "#1e1e1e",
    codeBg: "#2d2d2d",
    codeBorder: "#444444",
    codeText: "#e1e4e8",
    inlineCodeBg: "#363636",
    inlineCodeBorder: "transparent",
    inlineCodeText: "#f97583",
    link: "#58a6ff",

    syntaxKeyword: "#f97583",
    syntaxBuiltIn: "#79b8ff",
    syntaxString: "#9ecbff",
    syntaxComment: "#6a737d",
    syntaxFunction: "#b392f0",
    syntaxNumber: "#79b8ff",
    syntaxVariable: "#ffab70",
    syntaxTag: "#85e89d",
    syntaxAttr: "#79b8ff",
    syntaxDeletion: "#fdaeb7",
    syntaxDeletionBg: "#86181d",
    syntaxAddition: "#85e89d",
    syntaxAdditionBg: "#144620",
    syntaxMeta: "#79b8ff",
    syntaxRegexp: "#9ecbff",
  },
};

// --- Platform token overrides ---

const platformOverrides = {
  // Chat platforms
  teams: {
    light: { fontFamily: "Segoe UI, sans-serif" },
    dark: { fontFamily: "Segoe UI, sans-serif" },
  },
  slack: {
    light: {
      fontFamily: "Lato, sans-serif",
      fontSize: "15px",
      lineHeight: "1.46668",
      codeFontFamily: "Monaco, Menlo, Consolas, monospace",
      text: "#1d1c1d",
    },
    dark: {
      fontFamily: "Lato, sans-serif",
      fontSize: "15px",
      lineHeight: "1.46668",
      codeFontFamily: "Monaco, Menlo, Consolas, monospace",
    },
  },
  discord: {
    light: {
      fontFamily: "gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: "16px",
      lineHeight: "1.375",
      codeFontFamily: "Consolas, Andale Mono WT, Andale Mono, Lucida Console, monospace",
      text: "#313338",
      bg: "#ffffff",
      codeBg: "#f2f3f5",
      codeBorder: "#e3e5e8",
      inlineCodeBg: "#e3e5e8",
      inlineCodeText: "#313338",
      link: "#006ce7",
    },
    dark: {
      fontFamily: "gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: "16px",
      lineHeight: "1.375",
      codeFontFamily: "Consolas, Andale Mono WT, Andale Mono, Lucida Console, monospace",
      text: "#dbdee1",
      bg: "#313338",
      codeBg: "#2b2d31",
      codeBorder: "#1e1f22",
      inlineCodeBg: "#2b2d31",
      inlineCodeText: "#dbdee1",
      link: "#00a8fc",
    },
  },

  // Document platforms
  word: {
    light: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.6",
      codeFontSize: "10pt",
      text: "#333333",
      inlineCodeText: "#c7254e",
    },
    dark: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.6",
      codeFontSize: "10pt",
    },
  },
  "google-docs": {
    light: {
      fontFamily: "Arial, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.5",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "10pt",
      text: "#000000",
      bg: "#ffffff",
    },
    dark: {
      fontFamily: "Arial, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.5",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "10pt",
    },
  },
  notion: {
    light: {
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: "16px",
      lineHeight: "1.5",
      codeFontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      codeFontSize: "14px",
      text: "#37352f",
      bg: "#ffffff",
      codeBg: "#f7f6f3",
      codeBorder: "#e4e3e0",
      inlineCodeBg: "rgba(135,131,120,0.15)",
      inlineCodeText: "#eb5757",
      link: "#37352f",
    },
    dark: {
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: "16px",
      lineHeight: "1.5",
      codeFontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      codeFontSize: "14px",
      text: "#ffffffcf",
      bg: "#191919",
      codeBg: "#252525",
      codeBorder: "#333333",
      inlineCodeBg: "rgba(135,131,120,0.15)",
      inlineCodeText: "#fe6d73",
      link: "#ffffffcf",
    },
  },

  // Email platforms
  outlook: {
    light: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.5",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "10pt",
      text: "#000000",
      bg: "#ffffff",
    },
    dark: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "11pt",
      lineHeight: "1.5",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "10pt",
    },
  },
  gmail: {
    light: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "14px",
      lineHeight: "1.5",
      codeFontFamily: "monospace",
      codeFontSize: "13px",
      text: "#222222",
      bg: "#ffffff",
    },
    dark: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "14px",
      lineHeight: "1.5",
      codeFontFamily: "monospace",
      codeFontSize: "13px",
    },
  },

  // Wiki platforms
  confluence: {
    light: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.714",
      codeFontFamily: "SFMono-Medium, SF Mono, Segoe UI Mono, Roboto Mono, monospace",
      codeFontSize: "12px",
      text: "#172b4d",
      bg: "#ffffff",
      codeBg: "#f4f5f7",
      codeBorder: "#dfe1e6",
      inlineCodeBg: "#f4f5f7",
      inlineCodeText: "#e53e3e",
      link: "#0052cc",
    },
    dark: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.714",
      codeFontFamily: "SFMono-Medium, SF Mono, Segoe UI Mono, Roboto Mono, monospace",
      codeFontSize: "12px",
    },
  },
  jira: {
    light: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.714",
      codeFontFamily: "SFMono-Medium, SF Mono, Segoe UI Mono, Roboto Mono, monospace",
      codeFontSize: "12px",
      text: "#172b4d",
      bg: "#ffffff",
      codeBg: "#f4f5f7",
      codeBorder: "#dfe1e6",
      inlineCodeBg: "#f4f5f7",
      inlineCodeText: "#e53e3e",
      link: "#0052cc",
    },
    dark: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.714",
      codeFontFamily: "SFMono-Medium, SF Mono, Segoe UI Mono, Roboto Mono, monospace",
      codeFontSize: "12px",
    },
  },

  // Presentation platforms
  powerpoint: {
    light: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "18pt",
      lineHeight: "1.4",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "14pt",
      text: "#000000",
      bg: "#ffffff",
    },
    dark: {
      fontFamily: "Calibri, sans-serif",
      fontSize: "18pt",
      lineHeight: "1.4",
      codeFontFamily: "Consolas, Courier New, monospace",
      codeFontSize: "14pt",
    },
  },
  "google-slides": {
    light: {
      fontFamily: "Arial, sans-serif",
      fontSize: "18pt",
      lineHeight: "1.4",
      codeFontFamily: "Courier New, monospace",
      codeFontSize: "14pt",
      text: "#000000",
      bg: "#ffffff",
    },
    dark: {
      fontFamily: "Arial, sans-serif",
      fontSize: "18pt",
      lineHeight: "1.4",
      codeFontFamily: "Courier New, monospace",
      codeFontSize: "14pt",
    },
  },

  // Notes platforms
  // Mode B: Craft's HTML paste handler consumes inline-styled HTML like the
  // other document platforms, so the existing convert() pipeline serves it for
  // free. (Mode A — native Craft block JSON — lives in src/craft.js.) Fonts
  // mirror Craft's editor stack so pasted content matches the surrounding doc.
  craft: {
    light: {
      fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: "17px",
      lineHeight: "1.5",
      codeFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      codeFontSize: "14px",
      text: "#2c2c2c",
      bg: "#ffffff",
      codeBg: "#f5f5f5",
      codeBorder: "#e4e4e4",
      inlineCodeBg: "#f0f0f0",
      inlineCodeText: "#c0392b",
      link: "#0a7cff",
    },
    dark: {
      fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: "17px",
      lineHeight: "1.5",
      codeFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      codeFontSize: "14px",
      text: "#e6e6e6",
      bg: "#1c1c1e",
      codeBg: "#2a2a2c",
      codeBorder: "#3a3a3c",
      inlineCodeBg: "#2a2a2c",
      inlineCodeText: "#ff6b6b",
      link: "#409cff",
    },
  },
};

// Platforms that require fully inlined styles (no <style> blocks)
const EMAIL_PLATFORMS = new Set(["outlook", "gmail"]);

const ALL_PLATFORMS = Object.keys(platformOverrides);

// --- System theme detection ---

function getSystemTheme() {
  try {
    execFileSync("defaults", ["read", "-g", "AppleInterfaceStyle"], { encoding: "utf-8" });
    return "dark";
  } catch {
    return "light";
  }
}

// --- Config loading ---

const CONFIG_NAMES = [".penman.json", ".penman.json5", ".penman.jsonc"];

function findConfig() {
  for (const dir of [process.cwd(), os.homedir()]) {
    for (const name of CONFIG_NAMES) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function loadConfig() {
  const p = findConfig();
  if (!p) return {};
  return JSON5.parse(fs.readFileSync(p, "utf-8"));
}

// --- Resolve tokens ---

function resolveTokens(platformName, theme) {
  const base = { ...baseTokens[theme] };
  const platformOvr = platformOverrides[platformName]?.[theme] || {};
  const config = loadConfig();
  const configGlobal = config.tokens || {};
  const configPlatform = config.platforms?.[platformName]?.tokens || {};

  return { ...base, ...platformOvr, ...configGlobal, ...configPlatform };
}

module.exports = {
  baseTokens,
  platformOverrides,
  EMAIL_PLATFORMS,
  ALL_PLATFORMS,
  getSystemTheme,
  findConfig,
  loadConfig,
  resolveTokens,
};
