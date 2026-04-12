const { execFileSync, execSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

function copyToClipboard(html) {
  // Hex-encode the HTML and use osascript to set both the HTML and plain-text
  // clipboard flavors. This is the proven approach (used by downdraft, etc.)
  // — macOS apps read «class HTML» directly, so all inline styles, code block
  // backgrounds, and syntax highlighting survive intact.
  //
  // We deliberately skip RTF. NSAttributedString's HTML→RTF conversion strips
  // backgrounds and mangles colors. Word/Outlook read HTML just fine.

  const hex = Buffer.from(html, "utf-8").toString("hex");

  // Generate a plain-text fallback via textutil (strips tags, preserves structure).
  let plain;
  try {
    plain = execFileSync("textutil", ["-stdin", "-format", "html", "-convert", "txt", "-stdout"], {
      input: html,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    // Fallback: naive tag strip.
    plain = html.replace(/<[^>]+>/g, "").trim();
  }

  // Escape the plain text for AppleScript (backslashes and quotes).
  const escaped = plain.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Write the osascript to a temp file to avoid shell quoting issues with
  // the hex blob (can be tens of KB).
  const script = `set the clipboard to {text:"${escaped}", «class HTML»:«data HTML${hex}»}`;
  const tmp = path.join(os.tmpdir(), `penman-clip-${process.pid}.applescript`);
  fs.writeFileSync(tmp, script);
  try {
    execFileSync("osascript", [tmp], { stdio: "pipe", timeout: 10000 });
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

module.exports = { copyToClipboard };
