# Authoring a lesson

This guide shows how to turn the next paper into a lesson. Paper 1 (`papers/01-tensorflow/`) is the worked example. Read its `lesson-1.js` next to this guide.

## Quick start

1. Copy `papers/_template/` to `papers/NN-short-name/`.
2. In `lesson.js`, set `id`, `number`, `short` and `title`.
3. Replace the example parts with your own.
4. In `assets/js/catalog.js`, give the paper a `lesson` folder (for example `'papers/02-tvm/'`) and an `id` that matches `lesson.js`.
5. Run `node tests/smoke.cjs papers/NN-short-name`, then `MOBILE=1 node tests/smoke.cjs papers/NN-short-name`.
6. Write `VERIFY.md` in the lesson folder (see "Accuracy" below).

A lesson with no custom widgets needs only `index.html` and `lesson.js`. Large lessons split text into `lesson-1.js`, `lesson-2.js` and so on, each setting `window.XXX.pN = [...]`, with a small `lesson.js` that concatenates them. Paper 1 does this.

## Structure

```
lesson
  parts[]        a part is 2 to 6 steps on one topic (the menu on the left)
    steps[]      a step is one screen with Next and Back (5 minutes or less)
      blocks[]   the content on that screen
```

Give every part and step a unique, stable `id`. The page address uses them (`#dataflow/2`), and saved progress depends on them. Set `min` on each step: the realistic minutes, including time to play with a widget. Part 0 should be the welcome and a 60-second summary. The last part should be the wrap-up with a final quiz, a teach-back and a reading map.

## Block types

| `t` | What it does | Main fields |
|---|---|---|
| string | A paragraph | the string |
| `p` | Paragraph, optionally `lead: true` for larger text | `text` |
| `h` | Sub heading | `text` |
| `list` | Bullets or numbers | `items[]`, `ordered` |
| `callout` | A colored box | `kind`, `title?`, `body` (string or blocks) |
| `figure` | A diagram | `svg` string or `draw(host)`, `caption`, `source`, `alt` |
| `table` | A table | `head[]`, `rows[][]`, `caption`, `source` |
| `code` | Python code, colorized | `code`, `caption` |
| `facts` | Label and value rows | `rows[[label, value]]` |
| `flip` | Cards that flip on click | `cards[{front, back}]` |
| `tabs` | Tabbed content | `tabs[{label, body[]}]` |
| `compare` | Two columns, before and after | `left`, `right` |
| `reveal` | Hidden answer | `label`, `body[]` |
| `walk` | Step-through of a graph | `graph`, `frames[]` |
| `quiz` | One question, instant feedback | `id`, `q`, `options[]`, `answer`, `whyNot[]`, `explain`, `kind: 'predict'` |
| `widget` | A paper-specific interactive | `name`, `title`, `tag`, `opts` |
| `partmap` | Clickable list of parts | `skipFirst` |
| `finalquiz` | Scored quiz with parts to revisit | `questions[]` each with `part` |
| `teachback` | A text box and a checklist | `id`, `prompt`, `checklist[]` |
| `readmap` | What to read in the real paper | `rows[{section, how, note, part}]` |

Callout kinds: `idea` (key idea), `example` (real-life example), `paper` (what the paper says), `watch` (common trap), `try` (tasks for a widget), `note` (opinion or later context).

Text supports `**bold**`, `` `code` ``, `__emphasis__`, `[link](https://...)` and `{{glossary-key}}` or `{{glossary-key|shown text}}`. Anything else is escaped.

Quiz `answer` is an index, or an array of indexes for multiple answers. Write a `whyNot` reason for every wrong option. A wrong answer with no reason teaches nothing.

## Walkthroughs and graphs

`MLS.graph(host, spec)` draws a directed graph as SVG. A `walk` block gives each frame the full state of the graph, so Back works. Frame fields: `caption`, `active[]`, `done[]`, `dim[]`, `edges{'a>b': 'active'|'done'|'cut'|'grad'|'dim'}`, `subs{id: text}`, `labels{id: text}`, `badges{id: text}`. Edges accept a custom `path` and `labelAt` when you need to route around nodes.

## Widgets

A widget is a function on `MLS.widgets`:

```js
MLS.widgets.myWidget = function (host, opts, ctx) {
  // host: the element to fill. ctx.onCleanup(fn): runs when the student leaves the step.
};
```

Build controls with `MLS.ui` (`slider`, `seg`, `stat`, `msg`, `meterRow`, `btn`) and diagrams with `MLS.graph`. Rules:

- **Always tag simulations.** Pass `tag: 'Toy model, not from the paper'`. Never show invented numbers without that tag.
- **Make it keyboard and screen-reader friendly.** Use real buttons and range inputs. Put results in an `aria-live` region (`ui.msg` does).
- **Respect `prefers-reduced-motion`.** Start paused when `MLS.reducedMotion()` is true and offer a manual step.
- **Stop timers in `ctx.onCleanup`.**
- **Let wide diagrams scroll inside their frame.** Do not let the page scroll sideways. The smoke test checks this at 390 px.
- **Load widget files in `index.html`** after `engine.js` and before the lesson files.

## How to teach a step

Use this order inside a step. It works for undergrads who know the basics but not the field.

1. **Real-life example first.** A concrete scene (a kitchen, a library, a bakery). Put it before the paper's term.
2. **The term and the idea.** One short paragraph. Link jargon to the glossary.
3. **Something to do.** A widget or walkthrough. Add a `try` callout with numbered tasks.
4. **A check.** A predict-first quiz before the reveal, or a quiz after. Explain every wrong answer.
5. **What the paper says.** A purple `paper` callout, with the section name.

Also: ask a question before you answer it. Keep paragraphs to about 4 lines. Let students fail safely: a wrong answer should explain, not scold.

## Accuracy

Students will quote your lessons, so treat them like a citation.

- **Tag the source of everything visual.** `paper` (the authors' numbers), `redrawn` (the authors' figure, redrawn), `original` (our diagram), `toy` (a simulation we invented).
- **Paraphrase, do not quote** the paper unless you have the PDF open and copy exactly.
- **Check every "Try it" claim.** Drive the widget in a browser and read the numbers. Several of Paper 1's tasks were rewritten after this check found they were wrong or too weak.
- **If you cannot verify a fact, turn it into a reading task.** "While reading Section 6, note which hardware each experiment used" is honest. A guess stated as fact is not.
- **Keep opinion separate.** Use `callout` kind `note` with the title "Our take", and label judgment columns as opinion.
- **Write `VERIFY.md`.** List every number, section reference and paraphrase with a checkbox and where to look in the PDF. See `papers/01-tensorflow/VERIFY.md`.
- **Mark later work as later.** Anything not in the paper (what happened afterward, other papers) goes in a clearly labeled step or callout.

## Writing style

- Clear, direct language. Active voice. Short sentences mixed with longer ones.
- Speak to the student as "you".
- Use real numbers and concrete examples.
- No emojis. No dash used as a pause (use a period or a comma). Avoid stock phrases and hype words.
- No "Why it matters" sections. Show relevance with an example or a pointer to a later paper.
- Share a clear opinion when it helps, and mark it as opinion.

## Suggested outline for a paper

| Part | Purpose |
|---|---|
| Start here | Facts, goals, the paper in 60 seconds, course map |
| The problem | What was broken before, with a real-life example |
| The core idea | The one new idea, with a widget |
| Mechanisms (2 to 6 parts) | One part per major technique. Each has a real-life example, a widget, a check |
| The evidence | Predict first, show the paper's data, then a claims-versus-evidence table |
| Wrap-up | What came next, the final quiz, teach-back, reading map, references |

Connect each lesson to the other 23 papers: say which later paper picks up an idea, and use the same real-life examples when ideas return.

## Testing

```
node tests/smoke.cjs papers/NN-short-name
MOBILE=1 node tests/smoke.cjs papers/NN-short-name
SHOTS=/tmp/shots node tests/smoke.cjs papers/NN-short-name
```

The test fails on console errors, an unknown block or widget, an undefined glossary key, a quiz that rejects its own correct answer, and sideways page scrolling. Open a few screenshots and look at them yourself. A passing test does not mean a good diagram.
