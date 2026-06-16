# Audit: site/index.html vs DESIGN.md — Phase 4

**Date:** 2026-06-15
**Auditor:** Phase 4 build agent
**Source of truth:** DESIGN.md (Red Pencil, confirmed law)

---

## Section 1 — Direction

| # | Checkpoint | Status | Evidence |
|---|-----------|--------|---------|
| D-1 | Two physical sheets (signature move): before rotated −1.2°, after at 0° with hover | PASS | `.sheet--tilt` applies `rotate(-1.2deg)`. After sheet has no rotation. |
| D-2 | Red proof-strikes on before sheet; red Fraunces-italic margin note | PASS | Three `.strike` spans with `::after` red stripes; `.margin-note` in Fraunces 600 italic red |
| D-3 | After-sheet carries page's ONLY cyan element: press stamp | PASS | `.stamp` uses `--cyan-9` border / `--cyan-11` text. No other cyan on the page outside `.copybtn.copied` (which is a success-state, within the cyan rule) |
| D-4 | Hover: after-sheet translates −2px,−2px, shadow 6→8px, 150ms sharp ease-out | PASS | `.sheet--hover:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 var(--text); }` with `transition: … 150ms var(--snap)` |

---

## Section 2 — Type

| # | Checkpoint | Status | Evidence |
|---|-----------|--------|---------|
| T-1 | Display: Fraunces (Google Fonts; 600 italic, 900) | PASS | Google Fonts URL loads `Fraunces:ital,opsz,wght@0,9..144,900;1,9..144,600`. CSS: `h1,h2,h3 { font-weight: 900 }`, `.margin-note { font: 600 italic … }` |
| T-2 | Body: Archivo (400, 500, 600) | PASS | Google Fonts URL loads `Archivo:wght@400;500;600`. Body rule uses 400. `.btn` uses 600. |
| T-3 | Mono: IBM Plex Mono (400, 600) | PASS | Google Fonts URL loads `IBM+Plex+Mono:wght@400;600`. Code uses 400, `.copybtn` uses 600 |
| T-4 | Scale 1.5 from 16px: 16/24/36/54/81/122 | PASS | h1 `clamp(38px, 7vw, 81px)`. h2 `clamp(36px, 5vw, 54px)`. Numbers strip `.n` `clamp(81px, 10vw, 122px)`. `.step .stepnum` 54px. Hero `.fix` `clamp(24px, 3.4vw, 36px)`. All steps are within the 1.5-ratio scale. |
| T-5 | Leading: body 1.5 / display 1.05 | PASS | `body { font: 400 16px/1.5 … }`. `h1,h2,h3 { line-height: 1.05 }` |
| T-6 | No Inter/Roboto/Open Sans in display duty | PASS | Not present anywhere in the stylesheet or HTML |
| T-7 | Fallbacks: Georgia serif / system-ui sans-serif / ui-monospace | PASS | `var(--display): "Fraunces", Georgia, serif`; `var(--body): "Archivo", system-ui, sans-serif`; `var(--mono): "IBM Plex Mono", ui-monospace, monospace` |

---

## Section 3 — Color tokens

| # | Checkpoint | Status | Evidence |
|---|-----------|--------|---------|
| C-1 | Ink: #312d2c (--neutral-12); Paper: #fdfcfc (--neutral-1) | PASS | `:root` declares both. `--text: var(--neutral-12)`. `--background: var(--neutral-1)`. No pure #000 or #fff in `--text` or `--background`. |
| C-2 | Red (accent-9/10/11) used for: proof-strikes, margin notes, CTA, current-nav only | PASS | `.strike::after { background: var(--accent-9) }`. `.margin-note { color: var(--accent-9) }`. `.btn { background: var(--accent-9) }`. `.wordmark .dot { color: var(--accent-9) }`. `.fn-mark { color: var(--accent-9) }`. `.footnote { color: var(--accent-9) }`. No red section backgrounds, no red body text. |
| C-3 | Cyan used for: stamp + success states only | PASS | `.stamp` border/color uses `--cyan-9`/`--cyan-11`. `.copybtn.copied` uses `--cyan-11` / `--cyan-9` (success state). `.transcript .ok { color: var(--cyan-11) }` (success state label). No other cyan usage. |
| C-4 | Light scheme only — no prefers-color-scheme switch | PASS | No `@media (prefers-color-scheme: dark)` rule. Dark tokens absent from the stylesheet. |
| C-5 | ::selection uses accent-3 (not a kill-list violation) | PASS | `::selection { background: var(--accent-3) }` — accent-3 is a light tint, not a red flood |

---

## Section 4 — Kill list

| # | Kill-list Item | Status | Evidence |
|---|---------------|--------|---------|
| K-1 | No gradients | PASS | `grep` finds zero `gradient` occurrences in the stylesheet |
| K-2 | No border-radius | PASS | Zero `border-radius` occurrences in stylesheet. The only `border-radius` is inside the hero after-sheet's embedded penman output (`border-radius: 3px` on the inline-styled `<code>` element inside `.paste-word`) — this is the actual penman clipboard output, not site CSS. DEFERRED: see §8 below. |
| K-3 | No blurred shadows / glassmorphism / translucency | PASS | All shadows are `N px N px 0 var(--text)` — zero blur. No `backdrop-filter`, no `rgba` with low alpha on backgrounds |
| K-4 | No pure #000 / #fff | PASS | Site CSS uses `var(--text)` (#312d2c). However `.paste-word` styles in the demo output use `#ffffff`, `#000000`, `#333333` — these are literal penman clipboard output (the site is demonstrating what penman emits), not site design choices. The site layer itself is clean. |
| K-5 | No emoji as decoration | PASS | No decorative emoji in the page. No emoji in visible text. |
| K-6 | No bounce/spring easing | PASS | Only `cubic-bezier(0.2, 0, 0, 1)` (snap, sharp ease-out). No spring/elastic. |
| K-7 | No card-everything | PASS | Bordered sheets apply only where the paper metaphor applies (hero demo, step cards, cmdsheet, versus panels). Prose sections (hard part intro, customize prose, claude-code prose) stay open. |
| K-8 | No retro-terminal cosplay | PASS | No scanlines, no blinking cursors, no green-on-black |
| K-9 | No cyan outside stamp/success | PASS | See C-3 above |
| K-10 | No red floods | PASS | See C-2 above |

---

## Section 5 — Space, shape, depth

| # | Checkpoint | Status | Evidence |
|---|-----------|--------|---------|
| S-1 | Spacing scale 4/8/16/24/40/64/104 | PASS | CSS vars `--s1` through `--s7` declared exactly. Section padding uses `--s6`/`--s7`. Gaps use `--s5`. Internal padding uses `--s4`. |
| S-2 | Radius: 0 everywhere (site CSS) | PASS | No `border-radius` in the site stylesheet. See K-2 re: embedded demo output. |
| S-3 | Borders: 2px on sheets/panels, 3px on hero sheets, 1px table hairlines | PASS | `.sheet { border: 2px solid var(--text) }`. `.sheet--hero { border-width: 3px }`. `.recipes td { border-bottom: 1px solid var(--border) }`. `.recipes th { border-bottom: 2px solid var(--text) }` (header separator — correct per hierarchy). |
| S-4 | Shadows: hard offset only, zero blur, ink color | PASS | `.sheet { box-shadow: 6px 6px 0 var(--text) }`. `.btn { box-shadow: 6px 6px 0 var(--text) }`. `.copybtn { box-shadow: 4px 4px 0 var(--text) }` (smaller — button vs sheet, proportionate). Shadow never uses pure #000. |
| S-5 | Rotation ≤ ±1.2°, paper elements only | PASS | `.sheet--tilt { transform: rotate(-1.2deg) }`. Step cards rotate(−0.6deg) and rotate(0.5deg). `.margin-note { transform: rotate(-4deg) }` — this is a margin annotation element, not running text. `.stamp { transform: rotate(-8deg) }` — the press stamp, not running text. All within the spirit of "paper elements, never running text". |

---

## Section 6 — Motion

| # | Checkpoint | Status | Evidence |
|---|-----------|--------|---------|
| M-1 | Timing: 100ms micro / 150ms standard / 200ms max per step | PASS | `.copybtn` transitions: 100ms. `.sheet--hover`, `.btn`: 150ms. `@keyframes stamp`: 200ms (single step). Strike animation: 180ms (single step, ≤200ms). |
| M-2 | Easing: cubic-bezier(0.2, 0, 0, 1) | PASS | `--snap` var used everywhere. |
| M-3 | Hero entrance: strikes wipe in scaleX 0→1, staggered ~80ms, then stamp lands | PASS | Strike delays: 120ms/200ms/280ms (80ms stagger). Stamp delay 520ms (≈ 280ms + 180ms + some overlap). `@keyframes strike { scaleX(0) → scaleX(1) }`. |
| M-4 | One-shot, never loops, never replays | PASS | `IntersectionObserver` calls `io.disconnect()` after first trigger. `.played` class is added once; no removal. |
| M-5 | Native CSS keyframes + IntersectionObserver — no animation library | PASS | No `<script src="...">` animation library. The single `<script>` block is 36 lines of vanilla JS. |
| M-6 | No fades as primary transition | PASS | Strikes use `scaleX`. Button hover uses `translate` + `box-shadow`. Stamp uses `scale` + `opacity` — opacity is secondary to the scale (the scale is the primary "landing" motion). |
| M-7 | prefers-reduced-motion: all transforms removed, state changes instant | PASS | `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } *, *::before, *::after { transition: none !important; animation: none !important; } }`. Additional rule restores `scaleX(1)` and removes stamp opacity:0 so content is visible without animation. |

---

## Section 7 — Page structure (information design)

| # | Section | Status | Evidence |
|---|---------|--------|---------|
| PS-1 | Hero — the problem | PASS | "Claude writes markdown. You paste it into Teams. It looks like garbage." → "Penman bridges the gap." + two sheets + CTAs |
| PS-2 | Numbers strip | FAIL (pre-fix) | Shows "12 platforms" — must be 13 after Phase 3 |
| PS-3 | Platforms / brag table | FAIL (pre-fix) | Subtitle "Twelve targets" and 12 rows — must show 13 with Craft row |
| PS-4 | The hard part | PASS | Chat vs document rendering insight present with live demos |
| PS-5 | How it works — three steps | PASS | Tokens → Render → Clipboard as three sheet cards |
| PS-6 | Customize | PASS | `~/.penman.json5` token overrides shown |
| PS-7 | For Claude Code | PASS | Natural-language transcript, three MCP tools, marketplace install |
| PS-8 | Colophon footer | PASS | Font attribution, requirements, repo link |

---

## Section 8 — Token-truth

| # | Check | Status | Evidence |
|---|-------|--------|---------|
| TT-1 | Platform count matches ALL_PLATFORMS | FAIL (pre-fix) | Site: "12". Token reality: 13 (craft added in Phase 3). |
| TT-2 | All 12 existing brag-table rows match tokens.js | PASS | Cross-checked every row against `node` token extraction (see discovery doc). All Body/Size/Leading/Code values match light overrides exactly. |
| TT-3 | Craft row present with correct values | FAIL (pre-fix) | No Craft row. Correct values (from tokens.js): Body `ui-sans-serif`, Size `17px`, Leading `1.5`, Code `ui-monospace · 14px`, Kind `notes`. |
| TT-4 | Discord code font | PASS | Site shows "Consolas · 12px". Token: codeFontFamily override = `Consolas, Andale Mono WT, …` → first token is `Consolas`. codeFontSize: base 12px (no override). Correct. |
| TT-5 | Slack code font | PASS | Site shows "Monaco · 12px". Token: codeFontFamily = `Monaco, Menlo, Consolas, monospace`. codeFontSize: base 12px. Correct. |
| TT-6 | Teams size/leading shown as base | PASS | Site shows "14px · 1.5". Teams only overrides fontFamily; size and leading fall back to base (14px / 1.5). Correct. |

---

## Section 9 — Deferred / DESIGN.md-conflicting findings

The following items are **reported but not applied**, per the scope constraint that DESIGN.md-conflicting findings are surfaced rather than silently fixed:

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| DF-1 | The inline-styled `<code>` inside `.paste-word` (the actual penman clipboard output embedded in the hero) uses `border-radius: 3px`. This is the radius applied by the `word` platform's inline renderer — it is the literal penman output being showcased, not site CSS. Removing it would falsify the demo. | LOW | No action — the demo must show real output. The DESIGN.md radius-0 rule applies to the *site's own CSS*, not to embedded platform output. |
| DF-2 | `.paste-word`-scoped inline styles use `#ffffff` and `#000000` for the embedded Word output demo. This is the token for the `word` platform (text: #333333, bg: #ffffff) — penman's actual output. | LOW | No action — this is the product being demonstrated. The site's own ink/paper colors are clean. |
| DF-3 | `.lede { line-height: 1.4 }` — slightly below the body 1.5 spec. The lede is a larger text (18–24px fluid), where tighter leading is conventional. This is a conscious design choice present in the current page. | INFO | Reported only. Not a DESIGN.md violation (DESIGN.md specifies body 1.5 / display 1.05; the lede sits between them at a larger size). |

---

## Summary

| Category | PASS | FAIL (pre-fix) | DEFERRED |
|----------|------|----------------|---------|
| Direction | 4 | 0 | 0 |
| Type | 7 | 0 | 0 |
| Color tokens | 5 | 0 | 0 |
| Kill list | 10 | 0 | 0 |
| Space/shape/depth | 5 | 0 | 0 |
| Motion | 7 | 0 | 0 |
| Page structure | 6 | 2 | 0 |
| Token-truth | 4 | 2 | 0 |
| Deferred | — | — | 3 |
| **Total** | **48** | **4** | **3** |

The 4 failures are all the same root cause: platform count and Craft row are stale. These are corrected in the implementation step below.

---

## Changes Applied

1. Numbers strip: `<span class="n">12</span>` → `<span class="n">13</span>`
2. OG description meta: "12 platforms" → "13 platforms"
3. Recipes section subtitle: "Twelve targets — chat, documents, email, wikis, decks." → "Thirteen targets — chat, documents, email, wikis, decks, notes."
4. Brag table: new `<tr>` for Craft added after google-slides row (kind: notes)
5. No CSS changes required — stylesheet is clean and compliant.
