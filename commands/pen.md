---
description: Convert markdown to platform-styled rich text and copy it to the clipboard. Pass the platform as a flag (e.g. `--slack`, `--teams`, `--notion`, `--outlook`) and the source as a file path, inline text, or nothing (then it'll ask). Calls the penman MCP under the hood.
argument-hint: --<platform> [--dark|--light] [file-or-text]
---

Arguments: `$ARGUMENTS`

Take whatever the user passed and turn it into a single `mcp__penman__penman` call. Don't hand-roll the conversion — the MCP does it.

## How to handle the request

1. **Parse `$ARGUMENTS`** into:
   - `platform` — the first `--<name>` flag that isn't `--dark` or `--light`. Examples: `--slack`, `--teams`, `--notion`, `--outlook`, `--gmail`.
   - `theme` — `--dark` or `--light` if present, otherwise leave unset (the MCP defaults to system theme).
   - `source` — everything else. May be a file path, inline markdown, or absent.

2. **Resolve the platform.** If no `--<platform>` flag was passed, call `mcp__penman__penman_platforms` to get the live list of platforms (don't hardcode it), then use AskUserQuestion to ask the user to pick one. Don't guess.

3. **Resolve the markdown content:**
   - If `source` is an existing file path → Read it.
   - If `source` is non-empty inline text → use it directly.
   - If `source` is empty → AskUserQuestion with three options:
     - "Clipboard" — read it via `pbpaste`.
     - "File path" — follow up for the path, then Read it.
     - "Paste inline" — ask the user to paste into the next message.

4. **Call the MCP.** Invoke `mcp__penman__penman` with `markdown`, `platform`, and `theme` (only if explicitly set). If the user asked for a preview instead of a clipboard copy, use `mcp__penman__penman_html` and show the returned HTML.

5. **Report** the tool's response verbatim — it confirms the platform/theme and the clipboard state.

## Examples

- `/penman:pen --teams ./notes.md` — convert `notes.md` for Teams, copy.
- `/penman:pen --slack --dark` — ask where the markdown is, then convert for Slack in dark mode.
- `/penman:pen --notion # Hello\n\nworld` — convert the inline text for Notion.
- `/penman:pen` — ask for both platform and source, then convert.
