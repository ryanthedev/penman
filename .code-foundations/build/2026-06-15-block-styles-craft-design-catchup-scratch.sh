#!/usr/bin/env bash
set -e
cd /Users/r/repos/penman
echo "=== npm test ==="
npm test 2>&1

echo ""
echo "=== Edge case checks via node ==="
node -e "
const { convert } = require('./src/render.js');
const { resolveTokens } = require('./src/tokens.js');

// Edge 1: Deeply nested lists (>=3 levels) on notion + slack
try {
  const md3 = '- L1\n  - L2\n    - L3\n      - L4 deep';
  const n = convert(md3, resolveTokens('notion', 'light'), 'notion');
  const s = convert(md3, resolveTokens('slack', 'light'), 'slack');
  console.log('EDGE-1 deeply-nested-list notion: OK, includes L4=', n.includes('L4 deep'));
  console.log('EDGE-1 deeply-nested-list slack:  OK, includes L4=', s.includes('L4 deep'));
} catch(e) { console.log('EDGE-1 FAIL:', e.message); }

// Edge 2: Ordered list with block content — numbering preserved
try {
  const md = '1. First\n\n2. Second\n\n3. Third';
  const n = convert(md, resolveTokens('notion', 'light'), 'notion');
  console.log('EDGE-2 ordered-list-loose notion: OK, includes <ol>=', n.includes('<ol'));
  console.log('  has First=', n.includes('First'), 'Second=', n.includes('Second'), 'Third=', n.includes('Third'));
} catch(e) { console.log('EDGE-2 FAIL:', e.message); }

// Edge 3: Blockquote + hr on slack produce visible fallback, not empty/dropped tag
try {
  const bqMd = '> Some quote here.';
  const hrMd = '---';
  const bq = convert(bqMd, resolveTokens('slack', 'light'), 'slack');
  const hr = convert(hrMd, resolveTokens('slack', 'light'), 'slack');
  const bqHasBlockquote = bq.includes('<blockquote');
  const bqHasText = bq.includes('Some quote here.');
  const bqHasPrefix = bq.includes('> Some quote here.');
  const hrHasHr = hr.includes('<hr');
  const hrHasFallback = hr.includes('────────────────────');
  console.log('EDGE-3 blockquote/slack: has <blockquote>=', bqHasBlockquote, '(should be false), has text=', bqHasText, 'has "> " prefix=', bqHasPrefix);
  console.log('EDGE-3 hr/slack: has <hr>=', hrHasHr, '(should be false), has fallback=', hrHasFallback);
} catch(e) { console.log('EDGE-3 FAIL:', e.message); }

// Edge 4: Image with empty alt falls back to URL as label
try {
  const md = '![](https://example.com/no-alt.png)';
  const n = convert(md, resolveTokens('notion', 'light'), 'notion');
  const hasImg = n.includes('<img');
  const hasUrl = n.includes('https://example.com/no-alt.png');
  // Check that the URL appears as link text (label), not just as href
  const matches = n.match(/<a href=\"https:\/\/example\.com\/no-alt\.png\"[^>]*>([^<]*)<\/a>/);
  console.log('EDGE-4 image/empty-alt: has <img>=', hasImg, '(should be false), has URL=', hasUrl);
  console.log('  link label:', matches ? JSON.stringify(matches[1]) : 'NO MATCH');
} catch(e) { console.log('EDGE-4 FAIL:', e.message); }

// Edge 5: Task list mixed with normal list items
try {
  const md = '- [x] Done\n- [ ] Pending\n- Normal item\n- [x] Also done';
  const n = convert(md, resolveTokens('notion', 'light'), 'notion');
  const hasCheckmark = n.includes('☑');
  const hasOpenBox = n.includes('☐');
  const hasNormal = n.includes('Normal item');
  const noInput = !n.includes('<input');
  console.log('EDGE-5 task-list-mixed/notion: has ☑=', hasCheckmark, 'has ☐=', hasOpenBox, 'has Normal=', hasNormal, 'no <input>=', noInput);
} catch(e) { console.log('EDGE-5 FAIL:', e.message); }

// Edge 6: No <style> blocks anywhere in convert() output
try {
  const platforms = ['notion', 'slack', 'outlook', 'gmail'];
  const md = '# H1\n\npara\n\n- item\n\n\`\`\`js\ncode\n\`\`\`\n\n| A | B |\n|---|---|\n| 1 | 2 |';
  for (const p of platforms) {
    const out = convert(md, resolveTokens(p, 'light'), p);
    const hasStyle = out.includes('<style');
    console.log('EDGE-6 no-style-blocks/' + p + ': has <style>=', hasStyle, '(should be false)');
  }
} catch(e) { console.log('EDGE-6 FAIL:', e.message); }
"

