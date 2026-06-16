<!-- base-commit: 7581c2e04b65a0f4ce2bd41fc945239a4a70b086 -->
<!-- generated: 2026-06-15 -->

# Code Standards

Scope: the penman CLI + MCP server (`src/`, `bin/`). The marketing site (`site/index.html`) is governed separately by `DESIGN.md` (law) — see its own section below.

## Forbidden Patterns

- **No `<style>` blocks or external CSS in rendered output.** Every style is inlined on the element. Paste handlers strip `<style>`/`<head>` CSS, so a `<style>` rule renders as nothing in the target app. State styles as `style="..."` attributes built from tokens.
  ```js
  // DON'T: <style>.code{background:#f5f5f5}</style> ... <pre class="code">
  // DO:
  `<pre style="margin: 0; white-space: pre; color: ${tokens.codeText};">`
  ```
- **No global marked state.** Use an instance-scoped `new Marked({ renderer, ... })` per `convert()` call — the server handles concurrent requests. `render.js:206`.
- **No RTF on the clipboard.** macOS HTML→RTF conversion (`NSAttributedString`) strips backgrounds and mangles colors. penman sets the `«class HTML»` flavor directly. See the comment block in `clipboard.js`.
- **No bare `<pre>` for code-block backgrounds.** Paste handlers strip `<pre>` backgrounds; wrap code in a single-cell `<table>` whose `<td>` carries the background — table-cell backgrounds survive universally (`render.js:106`).

## Error Handling

- MCP tool bodies wrap the whole operation in `try/catch` and return `err(...)` (sets `isError: true`); never throw out of a tool. `mcp.js:46-54`.
- Helpers throw plain `Error`; the caller (tool or CLI) decides how to surface it.
- Best-effort side calls degrade gracefully with a fallback, not a crash: `textutil` plain-text generation falls back to a naive tag strip (`clipboard.js:19-28`); `defaults read` theme detection falls back to `"light"` (`tokens.js:331-338`).

## Imports & Dependency Direction

- **CommonJS only** (`require` / `module.exports`), `"type": "commonjs"`. Shebang is `#!/usr/bin/env bun`.
- Dependency direction: `bin/penman.js` and `src/mcp.js` are entry points → both depend on `tokens` + `render` + `clipboard`. Those three never import an entry point. `render` depends on `tokens` (for `EMAIL_PLATFORMS`); `tokens` depends on nothing internal.

## Testing Patterns

- **There is no automated test harness yet.** `test/` holds a single fixture (`kitchen-sink.md`) exercised by hand. New rendering work should ship a runnable assertion script (e.g. `node`-driven snapshot/contains checks over `convert()` output per platform) and a `test` npm script, since `package.json` `scripts` is currently empty.
- Render checks should call `convert(md, resolveTokens(platform, theme), platform)` directly and assert on the returned HTML string — no clipboard, no MCP transport needed.

## Naming Conventions

- Functions: `camelCase`, verb-first (`resolveTokens`, `buildHljsRules`, `copyToClipboard`, `inlineHljsStyles`).
- Module-level constants: `UPPER_SNAKE` (`ALL_PLATFORMS`, `EMAIL_PLATFORMS`, `CHAT_PLATFORMS`, `HEADING_SCALES`).
- The resolved token object is conventionally `t` in style-builder helpers, `tokens` at call sites.
- Platform keys are lowercase, hyphenated (`google-docs`, `powerpoint`).

## File Organization

- `bin/penman.js` — CLI entry (arg parsing, stdin/file input).
- `src/mcp.js` — MCP server (tool definitions, zod schemas, `ok`/`err`).
- `src/render.js` — markdown → styled HTML (the marked renderer). **The only place markdown block/inline tokens are handled.**
- `src/tokens.js` — design tokens, platform overrides, config loading, theme detection.
- `src/clipboard.js` — macOS clipboard write.
- New platforms: add a key to `platformOverrides` in `tokens.js` (+ group it in `PLATFORM_GROUPS` in `mcp.js`). `ALL_PLATFORMS` derives from `platformOverrides` keys automatically.

## Technology Decisions

- **macOS-only** clipboard path (`osascript` / `textutil` / `defaults`). Cross-platform clipboard is out of scope.
- **Platform-aware rendering is the core idea:** `CHAT_PLATFORMS` (Slack/Teams/Discord) get flattened `<br>`-separated output with `<strong>` headings because they strip structural HTML on paste; `EMAIL_PLATFORMS` (Outlook/Gmail) get link colors inlined because they strip `<a>` defaults. Any new block handler must provide a chat-mode branch.
- Tokens resolve by precedence: base theme → platform override → config global → config per-platform (`resolveTokens`, `tokens.js:362-370`). Config is JSON5 from `~/.penman.json5` (or cwd).
- `marked` v18, `gfm: true`, `breaks: false`; `highlight.js` for syntax, with hljs classes either kept (chat/doc) or inlined to `style=` (email) via a single rule map (`buildHljsRules`).

## Site (`site/index.html`)

- Governed by `DESIGN.md` ("Red Pencil") — **re-read it before any site edit; it is law.** Deviations edit `DESIGN.md` first, then code.
- Static single-file HTML/CSS, no framework, no build step, no animation library. Light scheme only in v1. WCAG AA (tokens are contrast-checked in `DESIGN.md`).

## Exemplar Files

- `src/render.js` — the canonical pattern for a token-driven, inline-styled, platform-aware renderer. Read it before adding any block handler.
- `src/tokens.js` `resolveTokens` — the canonical token-precedence + config-merge pattern.
