# penman

Claude just wrote you a clean migration guide. Now it has to go in front of other people, and those people live in Slack, a Google Doc, an Outlook thread. So you paste the markdown in. The table turns into a wall of pipes, the headings vanish, the code block loses its background, and the thing Claude made look sharp now looks like you didn't try.

penman handles that one handoff. Give it markdown and a target, and it drops styled rich text on your clipboard. Cmd+V into the app. Code keeps its syntax colors, tables keep their borders, headings look like headings, and the font matches what the app actually uses: Slack gets Lato, Word gets Calibri, Gmail gets Arial. You stop thinking about it.

## Install

From the [RTD marketplace](https://github.com/ryanthedev/rtd-claude-inn):

```bash
/plugin marketplace add ryanthedev/rtd-claude-inn
/plugin install penman@rtd
```

penman runs on [Bun](https://bun.sh). If you already have it, you're done — the server ships bundled and seeds its config on first run. If you don't, run `/penman:install` and it'll help you install bun.

## Usage

Tell Claude where it's going:

```
/penman:pen --slack
/penman:pen --teams ./notes.md
/penman:pen --word --dark
/penman:pen --terminal ./setup.md
```

Pass a platform flag. Add a file or some inline text if you want, or leave it off and penman asks. Or just say it in plain words — "can you pen this for Slack" works too. There's a plain CLI:

```bash
penman --for slack < notes.md
penman --for word --theme dark notes.md
penman --for terminal ./setup.md
```

### MCP tools

Four tools Claude can call on its own:

- `penman`: convert and copy to the clipboard
- `penman_html`: convert and hand back the HTML, clipboard untouched
- `penman_craft`: convert to Craft blocks (JSON), for writing straight into Craft
- `penman_platforms`: list what's on offer

## Platforms

| Group | Targets |
|---|---|
| Chat | slack, teams, discord |
| Document | word, google-docs, notion |
| Email | outlook, gmail |
| Wiki | confluence, jira |
| Presentation | powerpoint, google-slides |
| Notes | craft |
| Terminal | terminal |

Thirteen styled platforms. Each carries its own font stack, sizes, and colors, matched to what the app uses natively. Slack is Lato at 15px. Word is Calibri at 11pt. Notion is its system-ui stack at 16px. The values aren't approximations; they're what each app actually renders.

`terminal` is the odd one out: not styled at all. It copies a multi-line command as **plain text** (a terminal can't use rich text), pulling the commands out of any fenced code blocks and stripping the trailing newline so the last line waits for you to press Enter instead of running on paste.

### Craft is special

Craft has a real block API, not just a paste handler. So penman talks to it two ways. `penman --for craft` does the usual thing and puts styled HTML on the clipboard. But `penman --for craft --craft-blocks` (and the `penman_craft` tool) skips the clipboard and emits Craft's own block JSON instead, which Claude can write into a Craft doc directly with the Craft MCP. Higher fidelity: real toggles, real dividers, real code blocks.

## How it works

Three steps:

1. **Tokens**: pick the fonts, colors, and code styling for the platform and theme. Your overrides from `~/.penman.json5` get merged on top.
2. **Render**: [marked](https://github.com/markedjs/marked) parses the markdown, [highlight.js](https://github.com/highlightjs/highlight.js) colors the code, and every element gets an inline `style` attribute. No `<style>` blocks anywhere. Paste targets strip those on sight.
3. **Clipboard**: hex-encode the HTML and set it through `osascript` as `«class HTML»`, with a plain-text fallback for apps that want it.

### Chat platforms get a different render

Slack, Teams, and Discord tear out most HTML structure when you paste. An `<h1>` becomes nothing. A `<p>` collapses. A `<table>` dumps its cells inline as a run-on mess. So penman renders those three differently: bold for headings, `<br>` for spacing, and tables drawn as text inside a `<pre>` block so the columns still line up.

Word, Notion, Outlook, and Gmail are easier. They take real semantic HTML with explicit inline styles on every element, and absolute `pt`/`px` sizes instead of `em`.

### Custom tokens

Override anything, globally or per platform, in `~/.penman.json5`:

```json5
{
  "tokens": {
    "codeFontFamily": "Fira Code, monospace"
  },
  "platforms": {
    "slack": {
      "tokens": { "fontFamily": "Inter, sans-serif" }
    }
  }
}
```

Run `penman --for <platform> --tokens` to dump what's there.

## Requirements

- macOS. The clipboard path uses `osascript` and `textutil`.
- [Bun](https://bun.sh).

## License

ISC
