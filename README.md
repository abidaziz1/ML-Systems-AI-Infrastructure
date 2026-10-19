# ML Systems and AI Infrastructure: Interactive Paper Course

Learn 24 foundational ML systems papers part by part. Each paper is a short interactive lesson. You read one part, press **Next**, try a simulation, check yourself with a quiz, and move on.

The four foundations: **compilers**, **runtimes and memory**, **distributed ML**, **inference and serving**.

## Start here

Open `index.html` in a browser. No install, no build step, no server needed. Then open **Paper 1: TensorFlow** or **Paper 2: TVM**.

To serve it locally instead:

```
python3 -m http.server 8000
```

To publish it, enable GitHub Pages (Settings, Pages, deploy from branch, root folder). The site is plain files, so it works as is.

## What a lesson looks like

Paper 1 has 12 parts and 37 steps (about 3 hours). Paper 2 has 9 parts and 29 steps (about 2.5 hours). Every lesson follows the same pattern:

1. **A real-life example first.** You meet the idea in a kitchen, a library or a bakery before you see the paper's term for it.
2. **The paper's term and what the paper says.** A purple "In the paper" box separates the authors' claims from our explanation.
3. **Something to play with.** Sliders, clickable graphs, step-through diagrams and small simulations.
4. **A check.** Predict-first questions, quizzes with a reason for every wrong answer, and a final quiz that tells you which parts to revisit.
5. **A reading map.** Which sections of the real paper to read closely, which to skim, and the reading tasks to do while you read.

Every figure, table and widget carries a tag: **From the paper**, **Redrawn from the paper**, **Original diagram**, or **Toy model, not from the paper**. You can always tell the authors' data from our teaching aids.

Progress is saved in your browser only. Nothing is uploaded.

## The reading list

| Status | Papers |
|---|---|
| Ready | 1. TensorFlow (OSDI 2016), 2. TVM (OSDI 2018) |
| Planned | 3. Triton, 4. Ansor, 5. MLIR, 6. Clockwork, 7. ZeRO, 8. Megatron-LM (2021), 9. Alpa, 10. Orca, 11. FlashAttention, 12. PagedAttention |
| Planned | 13. FlexGen, 14. vAttention |
| Planned | 15. Sarathi-Serve, 16. DistServe, 17. Splitwise, 18. SGLang |
| Planned | 19. Megatron-LM (2019), 20. Alpa (revisit) |
| Planned | 21 to 24. MLSys 2026 frontier papers |

The full list with authors and venues lives in `assets/js/catalog.js`. The "Starter 10" filter on the home page marks the ten papers to read first.

## Repository layout

```
index.html                 course home page (reads assets/js/catalog.js)
assets/
  css/site.css             all styles, light and dark themes
  js/core.js               DOM, markup, storage helpers
  js/graphkit.js           draws small directed graphs as SVG
  js/ui.js                 sliders, segmented buttons, stat boxes
  js/engine.js             the lesson player and every block type
  js/glossary-common.js    terms shared by all lessons
  js/catalog.js            the 24-paper reading list
papers/
  01-tensorflow/           Paper 1: lesson text, widgets, glossary
  02-tvm/                  Paper 2: lesson, widgets, a shared cache simulation, an experiment
  _template/               copy this to start a new paper
docs/AUTHORING.md          how to write the next lesson
tests/smoke.cjs            browser test for every lesson
```

## Writing the next lesson

Read [docs/AUTHORING.md](docs/AUTHORING.md). In short: copy `papers/_template`, fill in the parts, register the paper in `assets/js/catalog.js`, and run the smoke test.

## Testing

The smoke test opens each lesson in headless Chromium, walks every step, answers every quiz, and fails on console errors, missing glossary terms or sideways scrolling on a phone.

```
npm install
npm test                       # all lessons, desktop width
MOBILE=1 npm test              # phone width
SHOTS=/tmp/shots npm test      # also save a screenshot of every step
```

## A note on accuracy

Each lesson ships a `VERIFY.md` that lists the facts to check against the original PDF: every number, section reference and paraphrase. Read the original paper too. The lesson is a guide to the paper, not a replacement for it.
