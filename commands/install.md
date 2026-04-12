---
description: Set up penman after installing the plugin. Installs bun deps in the plugin root and seeds `~/.penman.json5` if missing. Run once after `claude plugin add penman` and again after `claude plugin update penman` to refresh deps. Detects missing bun and asks before installing it.
argument-hint: (no arguments)
---

Set penman up in `${CLAUDE_PLUGIN_ROOT}`. Penman uses **bun** as its runtime and package manager. The MCP server is already declared in the plugin's `plugin.json` — Claude Code wires it up automatically. This command's only job is dependencies and config seeding.

## Steps

1. **Check for bun.** Run `command -v bun`.

2. **If bun is missing**, use AskUserQuestion to ask the user whether to install bun. Two options:
   - "Install bun" — run `curl -fsSL https://bun.sh/install | bash` and tell the user to restart their shell (or `exec $SHELL`) so bun is on PATH for the MCP subprocess.
   - "Cancel" — abort with a one-line message: "install bun manually from https://bun.sh and re-run /penman:install".

   Never install bun without confirmation.

3. **Install dependencies** in the plugin root:

   ```bash
   cd "${CLAUDE_PLUGIN_ROOT}" && bun install
   ```

4. **Seed `~/.penman.json5`** if it doesn't already exist. Use Bash to test for the file, then write the template only when missing:

   ```bash
   test -f "$HOME/.penman.json5" || cat > "$HOME/.penman.json5" <<'EOF'
   {
     // Penman config — supports comments (JSON5)
     // Override design tokens globally or per-platform.
     // Run `penman --for <platform> --tokens` to see all available tokens.

     // "tokens": {
     //   "codeFontFamily": "Fira Code, monospace",
     //   "codeBg": "#1a1a2e"
     // },

     // "platforms": {
     //   "slack": {
     //     "tokens": { "fontFamily": "Inter, sans-serif" }
     //   }
     // }
   }
   EOF
   ```

5. **Verify the MCP is reachable.** Call the `penman_platforms` MCP tool — if it returns the platform list, the server is healthy. If the call fails, report the error and suggest restarting Claude Code so the plugin's MCP registration is picked up.

6. **Print a one-line summary**: bun version, deps installed/already-up-to-date, config seeded/already-present, MCP healthy.

## When to run

- Right after `claude plugin add penman` (first install).
- After `claude plugin update penman` (the cached plugin path changes — `bun install` needs to run in the new directory).
- If the `penman` MCP tool stops responding.
