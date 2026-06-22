// Bundle entrypoint. `bun build` rolls this (and everything it requires) into a
// self-contained dist/mcp.js, which is what the plugin actually runs.
//
// We start the server explicitly here rather than relying on the
// `require.main === module` guard in mcp.js: once bundled, mcp.js is no longer
// the entry module, so that guard is false. Keeping the start logic out of
// mcp.js also lets tests require it without booting the stdio transport.
const { main } = require("./mcp");

main().catch((e) => {
  console.error("penman MCP fatal:", e);
  process.exit(1);
});
