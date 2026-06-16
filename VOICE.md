# Voice: Deadpan Craftsman

How penman talks. README, site copy, MCP tool descriptions, error messages, commit subjects. One voice everywhere.

This is the prose companion to DESIGN.md. DESIGN.md governs how the site *looks*; this governs how penman *reads*. Where DESIGN.md says the personality is "dry, precise, craftsman," this is the operating manual for it.

## The job we're talking about

Claude writes you something good. A migration guide, a postmortem, a release note. Now it has to go to other people, and those people live in Slack, a Google Doc, an Outlook thread. You paste the markdown in and it falls apart: the table becomes a wall of pipes, the headings vanish, the code block loses its background.

penman's job is that one handoff. Take what Claude made, move it where the other person will read it, keep it looking like someone cared.

Lead with that job. Not with the feature list. Not with "rich text conversion." The handoff.

## The four dials

| Dial | Where penman sits |
|---|---|
| Funny ↔ Serious | Serious, but dry. A flat, true line lands harder than a joke. No puns, no exclamation points. |
| Formal ↔ Casual | Casual. Contractions always. Write like you'd explain it to the dev at the next desk. |
| Respectful ↔ Irreverent | A little irreverent. It's allowed to find the broken paste annoying and say so. |
| Hype ↔ Matter-of-fact | Matter-of-fact, hard. No "powerful," no "seamless," no "effortlessly." Show the thing working instead. |

## Rules

**Name the job, not the feature.** "Move what Claude wrote into Slack without it breaking" beats "markdown-to-rich-text conversion engine."

**Be concrete.** Slack gets Lato at 15px. Word gets Calibri at 11pt. Real numbers, real app names. A specific detail is more convincing than any adjective.

**Have an opinion.** penman skips RTF on purpose, because macOS mangles the colors. Say that. Don't hide the decision behind passive voice.

**Short, then long.** Vary the sentence length hard. A three-word sentence next to a thirty-word one reads like a person. Six even sentences in a row read like a machine.

**Cut the adverbs and the throat-clearing.** No "it's worth noting," no "in order to," no "effectively." Delete the opener and see if the sentence still stands. It usually does.

**One em-dash, tops.** Use periods. Colons. Parentheses. The em-dash pile-up is the loudest tell there is.

## Banned

Marketing words that say nothing: powerful, seamless, effortless, robust, elegant, blazing-fast, game-changing, leverage, utilize, streamline, supercharge, unlock, elevate, delight. Also: emoji as decoration, "🚀", and any sentence that could appear in any other tool's README unchanged.

## Sound check

Bad: "Penman is a powerful tool that seamlessly transforms your markdown into beautifully formatted rich text across a comprehensive range of platforms."

Good: "Claude writes it clean. You paste it into Teams. Your team sees a mess. penman fixes the paste."

The first could be any product. The second could only be this one.
