/* Paper 2, parts 0 to 2: start, problem, pipeline. */
(function () {
  'use strict';
  var MLS = window.MLS;
  window.TVML = window.TVML || {};

  /* ---------- Figures ---------- */
  function memoryTrips(host) {
    MLS.graph(host, {
      width: 800,
      height: 130,
      ariaLabel: 'Three library calls with a round trip to main memory between each',
      nodes: [
        { id: 'conv', label: 'Conv2D', sub: 'library call 1', cx: 60, cy: 70, w: 96, h: 46 },
        { id: 'm1', label: 'Main memory', cx: 235, cy: 70, w: 100, h: 46, kind: 'io' },
        { id: 'bn', label: 'Batch norm', sub: 'library call 2', cx: 410, cy: 70, w: 100, h: 46 },
        { id: 'm2', label: 'Main memory', cx: 585, cy: 70, w: 100, h: 46, kind: 'io' },
        { id: 'relu', label: 'ReLU', sub: 'library call 3', cx: 750, cy: 70, w: 96, h: 46 }
      ],
      edges: [
        { from: 'conv', to: 'm1', label: 'write 16 MB', labelAt: [147, 34] },
        { from: 'm1', to: 'bn', label: 'read 16 MB', labelAt: [322, 34] },
        { from: 'bn', to: 'm2', label: 'write 16 MB', labelAt: [497, 34] },
        { from: 'm2', to: 'relu', label: 'read 16 MB', labelAt: [668, 34] }
      ]
    });
  }

  /* Edge labels sit above the top row so they never cover a node. */
  var pipelineSpec = {
    width: 810,
    height: 310,
    ariaLabel: 'The TVM pipeline from a framework model to a deployable module',
    nodes: [
      { id: 'model', label: 'Framework model', sub: 'TensorFlow, MXNet...', cx: 72, cy: 100, w: 128, h: 50, kind: 'input' },
      { id: 'graph', label: 'Computational graph', sub: 'operators and tensors', cx: 250, cy: 100, w: 156, h: 50 },
      { id: 'gopt', label: 'Graph optimizer', sub: 'fuse, fold, layout', cx: 430, cy: 100, w: 128, h: 50 },
      { id: 'opc', label: 'Operator compiler', sub: 'expression + schedule', cx: 610, cy: 100, w: 150, h: 50 },
      { id: 'auto', label: 'AutoTVM', sub: 'learned model', cx: 760, cy: 100, w: 90, h: 50, kind: 'grad' },
      { id: 'gen', label: 'Code generator', sub: 'LLVM, CUDA, ...', cx: 610, cy: 240, w: 140, h: 50 },
      { id: 'mod', label: 'Deployable module', sub: 'runs on your device', cx: 400, cy: 240, w: 156, h: 50, kind: 'var' }
    ],
    edges: [
      { from: 'model', to: 'graph', label: 'import', labelAt: [158, 58] },
      { from: 'graph', to: 'gopt' },
      { from: 'gopt', to: 'opc', label: 'optimized graph', labelAt: [520, 58] },
      { from: 'opc', to: 'gen', label: 'schedules', labelAt: [650, 172] },
      { from: 'gen', to: 'mod' },
      { from: 'auto', to: 'opc', label: 'finds', labelAt: [700, 58] }
    ]
  };

  /* ====================================================================== */
  window.TVML.p1 = [
    /* ------------------------------ Part 0 ------------------------------ */
    {
      id: 'start',
      title: 'Start here',
      summary: 'What the paper is, what you will learn, and how to use this lesson.',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Paper 2',
          min: 3,
          blocks: [
            { t: 'p', lead: true, text: 'Paper 1 ended with a model drawn as a graph. TVM starts there. It asks a different question: once you have the graph, how do you turn each node into machine code that runs fast on **any** chip, from a server GPU to a phone to a custom accelerator?' },
            {
              t: 'facts',
              rows: [
                ['Paper', 'TVM: An Automated End-to-End Optimizing Compiler for Deep Learning'],
                ['Authors', 'Tianqi Chen, Thierry Moreau, Ziheng Jiang, Lianmin Zheng, Eddie Yan, Meghan Cowan, Haichen Shen, Leyuan Wang, Yuwei Hu, Luis Ceze, Carlos Guestrin, Arvind Krishnamurthy (University of Washington and collaborators)'],
                ['Venue', '13th USENIX Symposium on Operating Systems Design and Implementation (OSDI 2018), pages 578 to 594'],
                ['Read the original', '[arXiv 1802.04799](https://arxiv.org/abs/1802.04799) or the [USENIX page](https://www.usenix.org/conference/osdi18/presentation/chen)'],
                ['Time', 'About 2.5 hours in total. Most parts take 10 to 25 minutes. Do one or two parts per sitting. Your place is saved in this browser.'],
                ['You should know', 'What a loop is, and roughly what a cache is (Part 4 refreshes it). Paper 1 helps but is not required.']
              ]
            },
            { t: 'h', text: 'By the end you can' },
            {
              t: 'list',
              ordered: true,
              items: [
                'Explain why hand-written {{vendor-library|vendor libraries}} stop scaling when new chips and new operators keep arriving.',
                'Follow a model through TVM\'s pipeline and name the two levels of optimization.',
                'Apply the paper\'s fusion rules to a chain of operators and say why {{operator-fusion|fusion}} saves memory traffic.',
                'Explain "separate what from how" using loop order, {{tiling}} and {{cache-miss|cache misses}}.',
                'Explain {{tensorization}} and {{latency-hiding|latency hiding}}, the two ideas that let TVM target new accelerators.',
                'Explain how a learned {{cost-model|cost model}} searches for schedules, and read the evaluation critically.'
              ]
            },
            {
              t: 'callout',
              kind: 'try',
              title: 'How this lesson works',
              body: [
                'Press **Next** or the right arrow key to move on. **Back** or the left arrow goes back. The **Parts** menu lets you jump anywhere.',
                'Words with a dotted underline open a short definition. The **Glossary** button lists them all.',
                'Every figure and widget is tagged. **From the paper** means the data is the authors\' own. **Toy model** means we built a small simulation to teach an idea, so do not quote its numbers as results.'
              ]
            }
          ]
        },
        {
          id: 'tldr',
          title: 'The paper in 60 seconds',
          min: 3,
          blocks: [
            { t: 'p', text: 'Frameworks run each {{operator}} of your model by calling a hand-tuned library routine. That approach has two problems. A new chip needs every routine rewritten, and the libraries cannot see across operators. TVM is a {{compiler}} instead. It first rewrites the graph (for example, fusing operators). Then it generates code for each operator from two separate pieces: a description of **what** to compute and a {{schedule}} that says **how**. A learned model searches for good schedules automatically.' },
            { t: 'callout', kind: 'idea', body: 'Write what to compute once. Let a compiler find how to compute it, separately for every chip.' },
            { t: 'h', text: 'The paper in four questions' },
            {
              t: 'flip',
              hint: 'Click to see the answer',
              cards: [
                { front: 'What problem does it solve?', back: 'Running deep learning fast on many kinds of hardware without hand-writing and hand-tuning code for every operator on every chip.' },
                { front: 'What is the core idea?', back: 'A compiler with two levels: graph-level rewrites such as fusion, and operator-level code generation built on a schedule language, with a learned model that searches for good schedules.' },
                { front: 'How do the authors show it works?', back: 'End-to-end runs of real models on a server GPU, an embedded CPU, an embedded GPU and an FPGA-based accelerator, compared with frameworks that use hand-optimized libraries.' },
                { front: 'What should you question?', back: 'How much tuning time the results needed, how fair the baselines were, and how much of the search space a human still had to define. Part 7 practices this.' }
              ]
            },
            { t: 'h', text: 'The course map' },
            { t: 'p', text: 'Eight short parts. Click any card to jump there.' },
            { t: 'partmap', skipFirst: true }
          ]
        }
      ]
    },

    /* ------------------------------ Part 1 ------------------------------ */
    {
      id: 'problem',
      title: 'Why TVM exists',
      summary: 'Hand-written libraries do not scale to new chips, and they cannot see across operators.',
      steps: [
        {
          id: 'libraries',
          title: 'How a framework runs your model today',
          min: 4,
          blocks: [
            { t: 'p', text: 'When a framework runs your model, it treats the model as a {{computational-graph|graph}} of {{operator|operators}}: convolutions, matrix multiplies, ReLUs. Each operator needs fast code for your chip. In 2018 the standard answer was a {{vendor-library|vendor library}}, such as {{cudnn|cuDNN}} for NVIDIA GPUs. Engineers at the chip maker hand-tune each routine for years.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A restaurant that buys ready-made sauces. The sauces are excellent and you can start serving today. But the supplier only makes the sauces on its list, only in the sizes it offers. Want something new? You wait for the supplier.'
            },
            { t: 'callout', kind: 'paper', body: 'The paper opens with this observation: current frameworks rely on vendor-specific operator libraries and are optimized for a narrow range of server-class GPUs. Deploying to mobile phones, embedded devices or accelerators takes significant manual effort.' },
            {
              t: 'quiz',
              id: 'tvm-q1',
              q: 'What is a vendor library\'s job in a framework?',
              options: [
                'Provide fast hand-tuned code for individual operators on one maker\'s chips',
                'Store the training data',
                'Choose which model architecture to use',
                'Translate Python into a graph'
              ],
              answer: 0,
              whyNot: [null, 'Data storage is not the library\'s concern.', 'The model architecture is your choice, not the library\'s.', 'Building the graph is the framework\'s job. The library only supplies fast operator code.'],
              explain: 'A vendor library is a collection of hand-tuned routines, one per operator, for one maker\'s hardware.'
            }
          ]
        },
        {
          id: 'explosion',
          title: 'The operators times chips explosion',
          min: 5,
          blocks: [
            { t: 'p', text: 'Every operator needs a tuned kernel for every chip, in every data layout and number type you want. The work multiplies. Move the sliders and watch it grow.' },
            {
              t: 'widget',
              name: 'productCalc',
              title: 'How many hand-written kernels?',
              tag: 'Toy model, not from the paper',
              opts: {
                intro: 'Illustrative numbers only. Real operator counts and variant counts differ by framework.',
                resultLabel: 'Kernels to hand-write and hand-tune',
                factors: [
                  { key: 'ops', label: 'Operators in the framework', min: 10, max: 400, value: 150 },
                  { key: 'hw', label: 'Hardware targets', min: 1, max: 10, value: 4 },
                  { key: 'var', label: 'Layouts and number types per operator', min: 1, max: 6, value: 2 }
                ],
                secondary: function (v, p) {
                  var years = (p * 2) / 52;
                  return [
                    { k: 'Effort at 2 weeks per kernel', v: MLS.fmtBig(Math.round(years * 10) / 10) + ' engineer-years' },
                    { k: 'What a compiler needs from you', v: String(v.hw), u: 'code generators, one per target', cls: 'good' }
                  ];
                },
                message: function (v, p) {
                  return 'Adding **one** new chip means writing and tuning **' + v.ops * v.var + '** more kernels by hand. A compiler describes each operator once and needs a code generator per target. The toy numbers are made up. The multiplication is the point.';
                },
                footnote: 'The two-weeks-per-kernel figure is invented to make the scale visible.'
              }
            },
            {
              t: 'callout',
              kind: 'example',
              body: 'A cookbook with 150 recipes, to be cooked in 4 different kitchens, each with 2 stove types. If every combination needs its own hand-written, hand-tested recipe card, you are writing 1,200 cards. A new kitchen means 300 more.'
            },
            { t: 'callout', kind: 'paper', body: 'The paper names the new targets: mobile phones, embedded devices, and accelerators such as FPGAs and ASICs.' },
            {
              t: 'quiz',
              id: 'tvm-q2',
              q: 'A new accelerator arrives. With the hand-written library approach, what has to happen before frameworks can use it well?',
              options: [
                'Someone writes and tunes a kernel for every operator on it',
                'Nothing, frameworks adapt automatically',
                'Frameworks must drop the operators it does not support',
                'The graph must be redrawn by the user'
              ],
              answer: 0,
              whyNot: [null, 'The frameworks only call the library. If the library has nothing for the chip, nothing runs fast.', 'Dropping operators would break models.', 'The graph is not the issue. The kernels are.'],
              explain: 'Each operator on the new chip needs its own tuned kernel. That is the manual effort the paper wants to remove.'
            }
          ]
        },
        {
          id: 'big-picture',
          title: 'Libraries see one operator at a time',
          min: 4,
          blocks: [
            { t: 'p', text: 'There is a second problem. A library routine is optimized in isolation. It cannot see the operator before it or after it. A convolution followed by batch normalization and ReLU becomes **three** calls. Each call reads its input from main memory and writes its result back, even though the next call needs that result right away.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A sandwich line where each worker must put the half-made sandwich back in the fridge before the next worker takes it out. Each worker is fast. The fridge trips are what slow the line down.'
            },
            { t: 'figure', draw: memoryTrips, source: 'original', caption: 'Three library calls. With a 4-million-number tensor (16 MB), the two in-between results make four trips of 16 MB each, 64 MB in total, just to hand data from one call to the next.', alt: 'Conv2D, batch norm and ReLU as three separate calls with main memory between them.' },
            {
              t: 'quiz',
              id: 'tvm-q3',
              kind: 'predict',
              q: 'If conv, batch norm and ReLU could run as one kernel, which cost would shrink most?',
              options: ['The arithmetic', 'The trips of intermediate results to main memory', 'The size of the model file', 'The number of layers'],
              answer: 1,
              whyNot: ['The same math is still done. Fusing does not remove arithmetic.', null, 'The model file is unchanged.', 'The layers are still there. They just run together.'],
              explain: 'The arithmetic stays the same. What disappears is writing the in-between results to main memory and reading them back.'
            }
          ]
        },
        {
          id: 'pitch',
          title: 'TVM\'s answer: a compiler for deep learning',
          min: 4,
          blocks: [
            { t: 'p', text: 'A {{compiler}} turns a description into code for a specific target. TVM takes a model from a framework and produces optimized code for the chip you name. It does two things the libraries cannot: it rewrites the whole graph before generating code, and it generates operator code for new hardware automatically.' },
            { t: 'callout', kind: 'paper', title: 'In the paper', body: 'The paper names two big challenges for optimizing deep learning across hardware. First, using each target\'s own features and abstractions: CPUs, GPUs and accelerators have different memory systems and instructions. Second, a huge search space: there are far too many ways to write each operator to try by hand.' },
            { t: 'h', text: 'What TVM contributes' },
            {
              t: 'flip',
              hint: 'Click to see the detail',
              cards: [
                { front: 'A graph-level optimizer', back: 'Rewrites the whole model before code generation. Operator fusion is the main example. This is Part 3.' },
                { front: 'A language that separates what from how', back: 'A tensor expression says what to compute. A schedule says how. New schedule primitives cover new hardware features. This is Parts 4 and 5.' },
                { front: 'Learned automation', back: 'A model trained on measurements from the real device guides the search for good schedules. This is Part 6.' },
                { front: 'An end-to-end stack', back: 'One system takes a framework model and produces a deployable module for the target, instead of a patchwork of tools. This is Part 2.' }
              ]
            },
            {
              t: 'quiz',
              id: 'tvm-q4',
              q: 'Which of the two challenges does a learned cost model mainly address?',
              options: ['Using hardware-specific features', 'The huge search space', 'Importing models from frameworks', 'Writing the training loop'],
              answer: 1,
              whyNot: ['Hardware features are handled by the schedule primitives and intrinsics, which you meet in Part 5.', null, 'Importing a model is plain format conversion.', 'TVM is about running models fast, not about training them.'],
              explain: 'With far too many schedules to try, a model that predicts speed lets you measure only the promising ones.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 2 ------------------------------ */
    {
      id: 'pipeline',
      title: 'The big picture',
      summary: 'How a model flows through TVM, and the two levels of optimization.',
      steps: [
        {
          id: 'flow',
          title: 'From model to machine code',
          min: 5,
          blocks: [
            {
              t: 'callout',
              kind: 'example',
              body: 'A translation agency. A client sends a book (your model). An editor restructures the outline, merging short chapters (graph optimization). Translators then render each chapter in a specific language, following a style guide for that language (operator-level code generation with a schedule). The agency ships a printed book (the deployable module).'
            },
            { t: 'p', text: 'Step through the same journey for a model.' },
            {
              t: 'walk',
              alt: 'Step-through of the TVM pipeline',
              graph: pipelineSpec,
              frames: [
                { caption: 'Your model goes in on the left. A program for your chip comes out at the bottom. The boxes between them are what TVM adds.' },
                { caption: '**Import.** TVM reads a model that was built in a framework such as TensorFlow or MXNet.', active: ['model'] },
                { caption: '**Computational graph.** The model becomes a graph of operators. This is the dataflow graph from Paper 1, now used as the input to a compiler.', active: ['graph'], done: ['model'], edges: { 'model>graph': 'active' } },
                { caption: '**Graph-level optimization.** TVM rewrites the graph before generating any code: it fuses operators, precomputes constants and picks data layouts. This is Part 3.', active: ['gopt'], done: ['model', 'graph'], edges: { 'graph>gopt': 'active' } },
                { caption: '**Operator-level optimization.** Each operator, or each fused group, is described as a tensor expression plus a schedule that says how to run it. This is Parts 4 and 5.', active: ['opc'], done: ['model', 'graph', 'gopt'], edges: { 'gopt>opc': 'active' } },
                { caption: '**Searching.** A learned cost model helps pick the schedule by predicting which candidates are worth measuring on the real device. This is Part 6.', active: ['opc', 'auto'], done: ['model', 'graph', 'gopt'], edges: { 'auto>opc': 'active' } },
                { caption: '**Code generation.** The chosen schedule becomes code for the target: for example LLVM for CPUs, or CUDA, OpenCL and Metal for GPUs, or custom code for an accelerator.', active: ['gen'], done: ['model', 'graph', 'gopt', 'opc', 'auto'], edges: { 'opc>gen': 'active' } },
                { caption: '**Deployable module.** The result is a module that runs on the target device, ready to load into an application.', active: ['mod'], done: ['model', 'graph', 'gopt', 'opc', 'auto', 'gen'], edges: { 'gen>mod': 'active' } }
              ]
            },
            {
              t: 'quiz',
              id: 'tvm-q5',
              q: 'Which order is correct?',
              options: [
                'Graph optimization, then operator-level optimization, then code generation',
                'Code generation, then graph optimization, then operator-level optimization',
                'Operator-level optimization, then graph optimization, then import',
                'Import, then code generation, then graph optimization'
              ],
              answer: 0,
              whyNot: [null, 'Code generation needs the schedules, so it comes last.', 'Import has to come first, because there is no graph before it.', 'You cannot generate code before the graph is rewritten and the operators are scheduled.'],
              explain: 'Import the model, rewrite the graph, schedule each operator, then generate code for the target.'
            }
          ]
        },
        {
          id: 'two-levels',
          title: 'Two levels of optimization',
          min: 4,
          blocks: [
            { t: 'p', text: 'TVM optimizes at two levels. They look at different things and change different things, so they do not get in each other\'s way.' },
            {
              t: 'table',
              head: ['Level', 'What it sees', 'What it can change', 'Example', 'In this lesson'],
              rows: [
                ['Graph', 'The whole model at once', 'Which operators run together, what is precomputed, how data is laid out', 'Fuse conv, batch norm and ReLU into one kernel', 'Part 3'],
                ['Operator', 'The loops inside one operator', 'Loop order, loop splitting, vectorizing, where data is kept', 'Tile a matrix multiply to fit the cache', 'Parts 4 and 5']
              ],
              source: 'original',
              caption: 'The two levels as the paper describes them, in our words.'
            },
            {
              t: 'callout',
              kind: 'example',
              body: 'Planning a road trip. First you decide the route and which stops to combine into one (graph level). Then you decide how to drive each leg: which lane, how fast, where to refuel (operator level). Changing one does not change the other.'
            },
            {
              t: 'quiz',
              id: 'tvm-q6',
              q: 'Which of these are graph-level optimizations? Select all that apply.',
              options: [
                'Fusing a convolution with the ReLU after it',
                'Choosing the tile size of a loop',
                'Computing a value at compile time because its inputs are constants',
                'Vectorizing the innermost loop'
              ],
              answer: [0, 2],
              explain: 'Fusion and precomputing constants change the graph. Tile sizes and vectorization change loops inside one operator, which is the operator level.'
            }
          ]
        }
      ]
    }
  ];
})();
