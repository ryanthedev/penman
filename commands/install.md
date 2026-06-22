---
description: Set up penman's runtime after installing the plugin. Checks for bun (penman's runtime) and helps install it if missing. Run once after `/plugin install penman@rtd`.
argument-hint: (no arguments)
---

Make sure penman's runtime is ready. Penman runs on **bun**. The MCP server and its dependencies ship bundled in `${CLAUDE_PLUGIN_ROOT}/dist/mcp.js` — no `bun install` needed, and the user config (`~/.penman.json5`) seeds itself on first run. The only thing this command checks is that bun is present, because the MCP server is launched *by* bun and can't bootstrap it itself.

## Steps

1. **Check for bun.** Run `command -v bun`.

2. **If bun is missing**, use AskUserQuestion to ask:
   - "Install bun" — run `curl -fsSL https://bun.sh/install | bash`, then tell the user to restart their shell (`exec $SHELL`) and restart Claude Code so bun is on PATH for the MCP subprocess.
   - "Cancel" — abort: "Install bun from https://bun.sh and re-run /penman:install".

   Never install bun without confirmation.

3. **Verify the MCP is reachable.** Call the `penman_platforms` MCP tool. If it returns the platform list, the server is healthy. If it fails, tell the user to restart Claude Code so the plugin's MCP registration is picked up (and confirm bun is on PATH).

4. **Print a one-line summary**: bun version, MCP healthy/unreachable.

## When to run

- Right after `/plugin install penman@rtd`, if bun isn't already installed.
- If the `penman` MCP tool stops responding — usually a restart away.

You do **not** need to re-run this after updates: the bundled server and its dependencies travel with the plugin into each new cached path.
