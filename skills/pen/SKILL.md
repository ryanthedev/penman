---
name: pen
description: 'Convert markdown to platform-styled rich text and copy it to the macOS clipboard, ready to paste with formatting intact into Slack, Teams, Discord, Notion, Word, Outlook, Gmail, Confluence, Jira, PowerPoint, Google Docs, Google Slides, or Craft — or copy a multi-line shell command as plain text for the terminal. In penman, to "pen" something means convert-and-copy it: "pen this", "pen it", and "can you pen this" all mean run this. Not for: penetration ("pen") testing, drafting or writing new prose, or publishing/deploying sites to the web.'
when_to_use: 'The user says "pen this", "can you pen this", "pen it", "pen this for Slack" (or Teams, Discord, Notion, Word, Outlook, Gmail, Confluence, Jira, PowerPoint, Google Docs, Google Slides, Craft), or "pen this command for the terminal" — or otherwise asks to put formatted content or a shell command on the clipboard to paste somewhere.'
argument-hint: --<target> [--dark|--light] [file-or-text]
---

# pen

Turn whatever the user passed into a single `mcp__penman__penman` call. The MCP does the conversion and the clipboard write — don't hand-roll either.

Arguments: `$ARGUMENTS`

## How to handle the request

1. **Parse `$ARGUMENTS`** into:
   - `platform` — the first `--<name>` flag that isn't `--dark` or `--light` (e.g. `--slack`, `--teams`, `--notion`, `--terminal`).
   - `theme` — `--dark` or `--light` if present, otherwise leave unset (the MCP defaults to system theme; the terminal target ignores theme).
   - `source` — everything else. May be a file path, inline markdown, or absent.

2. **Resolve the target.** If no `--<target>` flag was passed, call `mcp__penman__penman_platforms` to get the live list (don't hardcode it), then use AskUserQuestion to have the user pick one. Don't guess. Use `terminal` when the user wants a command they can paste into a shell.

3. **Resolve the markdown content:**
   - If `source` is an existing file path → Read it.
   - If `source` is non-empty inline text → use it directly.
   - If `source` is empty → AskUserQuestion with three options:
     - "Clipboard" — read it via `pbpaste`.
     - "File path" — follow up for the path, then Read it.
     - "Paste inline" — ask the user to paste into the next message.

4. **Call the MCP.** Invoke `mcp__penman__penman` with `markdown`, `platform`, and `theme` (only if explicitly set). For a preview instead of a clipboard copy, use `mcp__penman__penman_html` and show the returned HTML.

5. **Report** the tool's response verbatim — it confirms the target/theme and the clipboard state.

## The terminal target

`--terminal` copies a multi-line command as **plain text** (no rich formatting — a terminal can't use it). penman extracts fenced code blocks if the markdown has any, otherwise copies the whole input, and strips the trailing newline so the last line waits for you to press Enter rather than auto-running on paste.

## Examples

- "can you pen this for slack" → resolve the source, then `mcp__penman__penman` with `platform: "slack"`.
- `/penman:pen --teams ./notes.md` — convert `notes.md` for Teams, copy.
- `/penman:pen --terminal ./setup.md` — copy the commands from `setup.md` as plain text for the shell.
- `/penman:pen` — ask for both target and source, then convert.
