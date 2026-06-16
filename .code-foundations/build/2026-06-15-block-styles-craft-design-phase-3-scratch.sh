#!/bin/bash
set -e
cd /Users/r/repos/penman

echo "=== npm test ==="
npm test 2>&1

echo ""
echo "=== CLI --craft-blocks test ==="
printf '# Hi\n\ntext' | node bin/penman.js --craft-blocks 2>&1

echo ""
echo "=== CLI --craft-blocks with --for craft (should ignore --for and still produce JSON) ==="
printf '# Hi\n\ntext' | node bin/penman.js --for craft --craft-blocks 2>&1

echo ""
echo "=== Verify --craft-blocks stdout is valid JSON only (no clipboard message) ==="
out=$(printf '# Title\n\nA paragraph.' | node bin/penman.js --craft-blocks 2>&1)
echo "$out"
echo "---JSON parse check---"
echo "$out" | node -e "let d=''; process.stdin.on('data', c=>d+=c); process.stdin.on('end', ()=>{ JSON.parse(d); console.log('JSON parse: OK'); })"

echo ""
echo "=== Verify empty markdown returns [] ==="
printf '   \n\n  ' | node bin/penman.js --craft-blocks 2>&1

echo ""
echo "=== Verify non-string input rejects (in node, calling directly) ==="
node -e "
const { toCraftBlocks } = require('./src/craft.js');
let thrown = false;
try { toCraftBlocks(null); } catch(e) { thrown = true; console.log('null threw:', e.message); }
if (!thrown) console.log('ERROR: null did not throw');
thrown = false;
try { toCraftBlocks(42); } catch(e) { thrown = true; console.log('42 threw:', e.message); }
if (!thrown) console.log('ERROR: 42 did not throw');
thrown = false;
try { toCraftBlocks({}); } catch(e) { thrown = true; console.log('{} threw:', e.message); }
if (!thrown) console.log('ERROR: {} did not throw');
"

echo ""
echo "=== JSON round-trip check ==="
node -e "
const { toCraftBlocks } = require('./src/craft.js');
const md = '# H\n\npara\n\n- a\n- b\n\n\`\`\`js\nconst x=1;\n\`\`\`\n\n> q\n\n---\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<div>html</div>';
const blocks = toCraftBlocks(md);
const round = JSON.parse(JSON.stringify(blocks));
const same = JSON.stringify(blocks) === JSON.stringify(round);
console.log('JSON round-trip:', same ? 'OK' : 'FAIL');
console.log('Blocks:', JSON.stringify(blocks, null, 2));
"

echo ""
echo "=== Nested list crash test (former crash structure) ==="
node -e "
const { toCraftBlocks } = require('./src/craft.js');
const md = '- Item A\n  - Sub 1\n  - Sub 2\n- Item B\n  - Sub 3\n    - Deep 1';
const blocks = toCraftBlocks(md);
console.log('block count:', blocks.length);
const deep = blocks.find(b => b.markdown === '- Deep 1');
console.log('Deep item:', deep);
console.log('Nested list: OK');
"

echo ""
echo "=== Mode B: craft is a platform, convert() produces HTML ==="
node -e "
const { convert } = require('./src/render.js');
const { resolveTokens } = require('./src/tokens.js');
const html = convert('# Test\n\nA paragraph.', resolveTokens('craft', 'light'), 'craft');
console.log('Has h1:', html.includes('<h1 style='));
console.log('Has ui-sans-serif:', html.includes('ui-sans-serif'));
console.log('Is not chat-flattened:', !html.includes('<strong>Test</strong><br>'));
"
