/*
 * Template lesson. Copy this folder to papers/NN-short-name/, then:
 *   1. change id, number, short and title below,
 *   2. replace the example parts with your own,
 *   3. add the paper to assets/js/catalog.js (set `lesson` and `id`),
 *   4. run: node tests/smoke.cjs papers/NN-short-name
 *
 * Every block type the player supports appears once below. See docs/AUTHORING.md.
 */
MLS.start({
  id: 'template-lesson',
  number: 0,
  short: 'Template',
  title: 'Template: Replace With The Paper Title',
  home: '../../index.html',

  glossary: {
    example: { t: 'Example term', d: 'A short definition. Use {{example}} or {{example|custom text}} in any text to link to it.' }
  },

  parts: [
    {
      id: 'start',
      title: 'Start here',
      summary: 'What the paper is and how to use the lesson.',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome',
          min: 2,
          blocks: [
            { t: 'p', lead: true, text: 'One plain sentence on what the paper does. Strings in a blocks list are paragraphs too.' },
            'A plain string is shorthand for a paragraph. Inline markup: **bold**, `code`, __emphasis__, [a link](https://example.com), and a glossary term like {{example}}.',
            { t: 'facts', rows: [['Paper', 'Title'], ['Authors', 'Names'], ['Venue', 'Conference and year']] },
            { t: 'list', ordered: true, items: ['By the end you can explain X.', 'You can compare Y and Z.'] },
            { t: 'partmap', skipFirst: true }
          ]
        }
      ]
    },
    {
      id: 'gallery',
      title: 'Block gallery',
      summary: 'One of every block type.',
      steps: [
        {
          id: 'text-blocks',
          title: 'Text, callouts and tables',
          min: 3,
          blocks: [
            { t: 'h', text: 'A sub heading' },
            { t: 'callout', kind: 'idea', body: 'Key idea. The one thing to remember.' },
            { t: 'callout', kind: 'example', body: 'Real-life example. Put this BEFORE the paper\'s terms.' },
            { t: 'callout', kind: 'paper', body: 'In the paper. What the authors actually say, with the section name.' },
            { t: 'callout', kind: 'watch', body: 'Common trap. A mistake students make.' },
            { t: 'callout', kind: 'try', body: ['Try it. Tell the student exactly what to do in the widget.', '1. Do this.', '2. Then this.'] },
            { t: 'callout', kind: 'note', title: 'Our take', body: 'Opinion or later context. Keep it clearly separate from the paper.' },
            { t: 'table', head: ['Column A', 'Column B'], rows: [['one', 'two'], ['three', 'four']], source: 'paper', caption: 'Tag every table: paper, redrawn, toy or original.' },
            { t: 'code', code: '# Python is colorized\ndef add(a, b):\n    return a + b', caption: 'A code example.' },
            { t: 'compare', left: { title: 'Before', body: ['The old way.'] }, right: { title: 'After', body: ['The new way.'] } },
            { t: 'reveal', label: 'Show the answer', body: ['Hidden content that appears on click.'] }
          ]
        },
        {
          id: 'interactive-blocks',
          title: 'Interactive blocks',
          min: 4,
          blocks: [
            { t: 'flip', hint: 'Click to flip', cards: [{ front: 'Term', back: 'Definition and a real-life example.' }, { front: 'Another term', back: 'Its meaning.' }] },
            { t: 'tabs', tabs: [{ label: 'Option one', body: ['Content of the first tab.'] }, { label: 'Option two', body: ['Content of the second tab.'] }] },
            {
              t: 'figure',
              source: 'original',
              caption: 'Figures can be an SVG string or a draw function. Always add a source tag.',
              svg: '<svg viewBox="0 0 300 80"><rect x="10" y="10" width="120" height="60" rx="10" fill="none" stroke="currentColor"/><text x="70" y="45" text-anchor="middle">A box</text></svg>'
            },
            {
              t: 'walk',
              alt: 'A two-node walkthrough',
              graph: {
                width: 500, height: 120,
                nodes: [{ id: 'a', label: 'A', cx: 90, cy: 60 }, { id: 'b', label: 'B', cx: 400, cy: 60 }],
                edges: [{ from: 'a', to: 'b', label: 'data' }]
              },
              frames: [
                { caption: 'Frame one. Describe what is happening.', active: ['a'] },
                { caption: 'Frame two. The data moves.', active: ['b'], done: ['a'], edges: { 'a>b': 'active' } }
              ]
            },
            { t: 'quiz', id: 'tpl-q1', kind: 'predict', q: 'Single answer. Use kind "predict" to ask before teaching.', options: ['Wrong', 'Right', 'Wrong too'], answer: 1, whyNot: ['Say why this is wrong.', null, 'Say why this is wrong.'], explain: 'Why the right answer is right.' },
            { t: 'quiz', id: 'tpl-q2', q: 'Multiple answers: pass an array of indexes.', options: ['Yes', 'Yes too', 'No'], answer: [0, 1], explain: 'Why these two.' }
            /* { t: 'widget', name: 'yourWidget', title: 'Name', tag: 'Toy model, not from the paper', opts: {} } */
          ]
        }
      ]
    },
    {
      id: 'wrapup',
      title: 'Wrap-up',
      summary: 'Final quiz and a reading plan.',
      steps: [
        {
          id: 'final',
          title: 'Final quiz and reading plan',
          min: 5,
          blocks: [
            {
              t: 'finalquiz',
              questions: [
                { part: 'gallery', q: 'Each question names the part to revisit if missed.', options: ['A', 'B'], answer: 0, explain: 'Why.' }
              ]
            },
            { t: 'teachback', id: 'tb1', prompt: 'Explain the paper in five sentences.', checklist: ['Covered the problem.', 'Covered the idea.'] },
            { t: 'readmap', rows: [{ section: 'Introduction', how: 'Read closely', note: 'Why.', part: 'gallery' }] }
          ]
        }
      ]
    }
  ]
});
