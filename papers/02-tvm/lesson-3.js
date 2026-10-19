/* Paper 2, parts 6 to 8: search, evidence, wrapup. */
(function () {
  'use strict';
  var MLS = window.MLS;
  window.TVML = window.TVML || {};

  /* ---------- The auto-tuning loop, as a step-through ---------- */
  var loopSpec = {
    width: 780,
    height: 300,
    ariaLabel: 'The learned auto-tuning loop: explore, predict, measure, record, retrain',
    nodes: [
      { id: 'explorer', label: 'Schedule explorer', sub: 'proposes candidates', cx: 130, cy: 80, w: 156, h: 52 },
      { id: 'model', label: 'Cost model', sub: 'predicts speed', cx: 390, cy: 80, w: 130, h: 52, kind: 'grad' },
      { id: 'device', label: 'Real device', sub: 'runs and times', cx: 650, cy: 80, w: 130, h: 52, kind: 'var' },
      { id: 'data', label: 'Training data', sub: 'schedule + speed pairs', cx: 390, cy: 230, w: 170, h: 52, kind: 'queue' }
    ],
    edges: [
      { from: 'explorer', to: 'model', path: 'M 208,66 L 325,66', label: 'candidates', labelAt: [266, 52] },
      { from: 'model', to: 'explorer', path: 'M 325,94 L 208,94', label: 'predicted speed', labelAt: [266, 116] },
      { from: 'model', to: 'device', label: 'a few best' },
      { from: 'device', to: 'data', label: 'measured speed' },
      { from: 'data', to: 'model', label: 'retrain', labelAt: [418, 160] }
    ]
  };

  window.TVML.p3 = [
    /* ------------------------------ Part 6 ------------------------------ */
    {
      id: 'search',
      title: 'Letting a model find the schedule',
      summary: 'Why the schedule space is too big to try, and how a learned cost model helps.',
      steps: [
        {
          id: 'space',
          title: 'A space too big to try',
          min: 5,
          blocks: [
            { t: 'p', text: 'You now know many schedule choices: tile sizes, loop order, vector width, thread binding, memory placement. They **multiply**. The set of all combinations for one operator is its {{search-space|search space}}.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A pizza shop with 8 sizes of base, 6 sauces, 20 toppings you can add or leave off, and 4 ovens. You cannot taste every pizza. The number of pizzas explodes with every new choice, long before you finish listing the choices.'
            },
            {
              t: 'widget',
              name: 'productCalc',
              title: 'How big is one operator\'s search space?',
              tag: 'Toy model, not from the paper',
              opts: {
                intro: 'Count the schedules for a single operator in a single layer. The knobs are made up but typical in kind.',
                resultLabel: 'Schedules for one operator',
                factors: [
                  { key: 'tile', label: 'Choices per tile size (3 loops)', min: 2, max: 16, value: 8, power: 3 },
                  { key: 'order', label: 'Loop orders', min: 1, max: 24, value: 6 },
                  { key: 'unroll', label: 'Unroll options', min: 1, max: 8, value: 4 },
                  { key: 'vec', label: 'Vector widths', min: 1, max: 6, value: 3 },
                  { key: 'bind', label: 'Ways to bind loops to threads', min: 1, max: 10, value: 5 },
                  { key: 'mem', label: 'Memory placement options', min: 1, max: 8, value: 4 }
                ],
                secondary: function (v, p) {
                  return [
                    { k: 'Time to try all, at 1 second each', v: MLS.fmtDuration(p), cls: p > 86400 * 30 ? 'bad' : 'warn' },
                    { k: 'Model with 50 such layers', v: MLS.fmtDuration(p * 50), cls: 'bad' }
                  ];
                },
                message: function (v, p) {
                  return 'About **' + MLS.fmtBig(p) + '** schedules for one operator. Pushing the sliders toward their maximum gives billions. You cannot try them all, and a model has many layers.';
                },
                footnote: 'The one-second-per-try figure is invented. A real try (compile, run, time) takes seconds or more.'
              }
            },
            {
              t: 'quiz',
              id: 'tvm-q20',
              q: 'You add one more knob with 4 choices to an existing search space. The number of schedules...',
              options: ['grows by 4', 'is multiplied by 4', 'stays the same', 'is divided by 4'],
              answer: 1,
              whyNot: ['Adding 4 would be true only if the knob replaced one. A new independent knob multiplies.', null, 'A new knob adds options.', 'More choices never shrink the space.'],
              explain: 'Independent choices multiply. That is why search spaces explode.'
            }
          ]
        },
        {
          id: 'three-ways',
          title: 'Four ways to pick a schedule',
          min: 5,
          blocks: [
            { t: 'p', text: 'Imagine you need the fastest route across a city every day. There are four ways to find it. Each has a counterpart for schedules.' },
            {
              t: 'tabs',
              tabs: [
                {
                  label: 'Ask an expert',
                  body: [
                    'An engineer who knows the chip tries ideas by hand. The results can be excellent. It is slow, and the knowledge does not transfer to the next chip or the next operator.',
                    { t: 'callout', kind: 'example', body: 'Asking a veteran taxi driver. Superb in their own city, no help in another.' }
                  ]
                },
                {
                  label: 'Measure everything',
                  body: [
                    'Run many candidate schedules on the real device and keep the fastest. This needs no knowledge of the chip. But every candidate costs a real run, and nothing learned from one run helps the next. People call this black-box auto-tuning.',
                    { t: 'callout', kind: 'example', body: 'Driving every possible route each morning to see which is fastest. It works, and you are late for a month.' }
                  ]
                },
                {
                  label: 'A hand-built formula',
                  body: [
                    'Write a formula that predicts speed from the schedule. No measurements are needed. But you must model the chip in detail, and for complicated chips such formulas are often wrong.',
                    { t: 'callout', kind: 'example', body: 'Estimating drive time from distance and speed limit. It ignores traffic lights, construction and rush hour.' }
                  ]
                },
                {
                  label: 'A learned model (TVM)',
                  body: [
                    'Measure some candidates. Train a model on the results. Use the model to rank many more candidates, and measure only the best few. The model adapts to the chip because it learns from that chip\'s own measurements, and improves as data arrives.',
                    { t: 'callout', kind: 'example', body: 'A driver who logs every trip, learns which roads are slow at which hours, and plans from experience.' }
                  ]
                }
              ]
            },
            {
              t: 'table',
              head: ['Approach', 'Real measurements needed', 'Hardware knowledge built in', 'Improves with more data'],
              rows: [
                ['Measure everything (black box)', 'Many', 'No', 'No'],
                ['Hand-built cost model', 'None', 'Yes, hard to build and often biased', 'No'],
                ['Learned cost model (TVM)', 'Fewer', 'No', 'Yes']
              ],
              source: 'original',
              caption: 'Our summary of how the paper contrasts the three automatic approaches.'
            },
            {
              t: 'quiz',
              id: 'tvm-q21',
              q: 'Why does a learned cost model need no built-in knowledge of the chip?',
              options: ['It learns the chip\'s behavior from measurements taken on that chip', 'It ignores the chip', 'It copies the vendor library', 'It runs only on CPUs'],
              answer: 0,
              whyNot: [null, 'It must reflect the chip, or it could not rank schedules.', 'Copying a library would defeat the purpose.', 'It works for any target that can be measured.'],
              explain: 'The measurements carry the chip\'s behavior. The model learns it from them.'
            }
          ]
        },
        {
          id: 'loop',
          title: 'The AutoTVM loop',
          min: 5,
          blocks: [
            { t: 'p', text: 'TVM calls its automatic search {{autotvm|AutoTVM}}. It is a loop that improves with every round. Step through one round.' },
            {
              t: 'walk',
              alt: 'Step-through of one round of the auto-tuning loop',
              graph: loopSpec,
              frames: [
                { caption: 'Four pieces: an explorer that proposes schedules, a cost model that predicts their speed, a real device that measures, and a store of training data.' },
                { caption: '**Explore.** The explorer wanders through the schedule space, for example with {{simulated-annealing|simulated annealing}}, and asks the cost model about each stop. Predictions are cheap, so it can ask thousands of times.', active: ['explorer'], edges: { 'explorer>model': 'active', 'model>explorer': 'active' } },
                { caption: '**Predict.** The model scores each candidate. What matters is the **order**: which schedule is faster than which. The exact number matters less.', active: ['model'], edges: { 'explorer>model': 'active', 'model>explorer': 'active' } },
                { caption: '**Measure.** Only the few most promising candidates are run on the real device. This is the slow, expensive step.', active: ['device'], done: ['explorer', 'model'], edges: { 'model>device': 'active' } },
                { caption: '**Record.** Each measured schedule and its speed are saved as new training data.', active: ['data'], done: ['device'], edges: { 'device>data': 'active' } },
                { caption: '**Retrain.** The model learns from the new data. In the next round its predictions are better.', active: ['model'], done: ['data'], edges: { 'data>model': 'active' } },
                { caption: '**Repeat** until the measurement budget is used up. The fastest schedule measured so far is what TVM uses.', done: ['explorer', 'model', 'device', 'data'] }
              ]
            },
            {
              t: 'callout',
              kind: 'paper',
              title: 'In the paper',
              body: 'The cost model is a gradient-boosted tree model, built on XGBoost, trained to predict the relative order of schedules rather than their exact run time. Its inputs are features taken from the loop program, such as loop structure and how often each buffer is accessed. The explorer runs a parallel simulated annealing search that the model guides. Measurements run on real devices through a pool of devices connected over a network. The paper also describes the schedule space as defined by a template, which you will come back to in Part 7.'
            },
            {
              t: 'quiz',
              id: 'tvm-q22',
              q: 'In each round, which step is the slow, expensive one?',
              options: ['Asking the cost model for predictions', 'Running candidates on the real device', 'Saving data', 'Retraining a small model'],
              answer: 1,
              whyNot: ['Predictions are cheap. The explorer asks thousands of times.', null, 'Saving a record is trivial.', 'Retraining a small model is quick compared with timing real runs.'],
              explain: 'Compiling and timing a program on real hardware is the costly step. The model exists to reduce how often it happens.'
            }
          ]
        },
        {
          id: 'model-lab',
          title: 'Cost model lab',
          min: 8,
          blocks: [
            { t: 'p', text: 'Here is the learning idea in miniature. You decide how many schedules to measure. A small boosted-tree model learns from them. Then it ranks **all 9,000** schedules in the lab from Part 4, including the ones nobody measured.' },
            { t: 'widget', name: 'costModelLab', title: 'Learn from measurements, rank the rest', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: [
                '1. Start at 8 measurements. How good is the ranking, and what does the scatter look like?',
                '2. Move to 64, then to 512. What changes?',
                '3. Go back to 16 and press **Measure different schedules** five times. How much do the results vary?',
                '4. At which training sizes do the model\'s top 16 picks beat 16 random picks?'
              ]
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: [
                'Averaged over 20 random draws of which schedules get measured, the rank correlation is about **0.39 with 8 measurements, 0.49 with 16, 0.67 with 32, 0.77 with 64, 0.86 with 128, 0.90 with 256 and 0.92 with 512**. Your draw will differ.',
                'With small training sets the result swings a lot between draws. With 16 measurements it ranged from 0.24 to 0.67 across our 20 draws.',
                'The model\'s top 16 picks are no better than 16 random picks below about 32 measurements, are better in roughly half to two thirds of the draws at 32 and 64, and beat random in almost every draw from 128 up.',
                'Ranking all 9,000 schedules takes the model roughly 15 milliseconds. Measuring them for real at one second each would take 2.5 hours.'
              ]
            },
            {
              t: 'callout',
              kind: 'watch',
              title: 'What this widget does not show',
              body: ['It compares the model only with **random** picks, the weakest baseline. A smarter search over real measurements can be a strong rival. In our own experiment on this toy space, plain simulated annealing on real measurements stayed ahead of the model up to about 200 trials and was level with it at 300 to 400. The paper compares its learned model against black-box tuners on real operators, where spaces are far larger and each measurement costs far more. Whether the learned model wins depends on the size of the space, the cost of a measurement and the amount of data you have.', 'You can rerun our experiment with `node papers/02-tvm/experiments/search-strategies.cjs`. Then read the paper\'s comparison figure for yourself instead of trusting a toy.']
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 7 ------------------------------ */
    {
      id: 'evidence',
      title: 'Does it work? The evidence',
      summary: 'What the experiments covered, and how to read them critically.',
      steps: [
        {
          id: 'setup',
          title: 'What the paper tested',
          min: 6,
          blocks: [
            { t: 'p', text: 'TVM is a compiler, so the test is simple: compile real models, run them, and compare the speed with what frameworks achieve using hand-tuned libraries. Make a prediction first.' },
            {
              t: 'quiz',
              id: 'tvm-q23',
              kind: 'predict',
              q: 'How do you expect an automatically generated program to compare with hand-tuned vendor libraries?',
              options: [
                'Always slower, since automatic cannot beat hand-tuned',
                'Competitive with hand-tuned code, and faster than the frameworks that use it in end-to-end runs',
                'Exactly equal everywhere',
                'It only works on one kind of chip'
              ],
              answer: 1,
              whyNot: ['That would make the paper pointless. Look at the claims below.', null, 'Results differ per workload and chip.', 'The paper tests four different kinds of hardware.'],
              explain: 'The paper reports performance competitive with hand-tuned libraries, and end-to-end speedups of 1.2x to 3.8x over frameworks backed by those libraries on the workloads it tested.'
            },
            {
              t: 'table',
              head: ['Hardware', 'Chip', 'Compared with'],
              rows: [
                ['Server-class GPU', 'NVIDIA Titan X', 'MXNet and TensorFlow, which use vendor libraries, and TensorFlow with its XLA compiler'],
                ['Embedded CPU', 'ARM Cortex-A53', 'TensorFlow Lite'],
                ['Embedded GPU', 'ARM Mali-T860MP4', 'The ARM Compute Library'],
                ['FPGA accelerator', 'A generic accelerator design (VTA) on a PYNQ board, next to an ARM Cortex-A9 CPU', 'A feasibility study of targeting a new accelerator. See the paper for the exact comparison']
              ],
              source: 'original',
              caption: 'Our summary of the paper\'s evaluation setup. Workloads include ResNet-18, MobileNet, an LSTM language model, DQN and DCGAN. Not every workload runs on every platform.'
            },
            { t: 'callout', kind: 'paper', title: 'The headline claim', body: 'The paper reports speedups ranging from 1.2x to 3.8x over existing frameworks backed by hand-optimized libraries, across these kinds of hardware. It also says TVM is open source and in production use inside several major companies.' },
            {
              t: 'callout',
              kind: 'paper',
              title: 'The FPGA case study',
              body: 'To show that a new accelerator can be targeted, the authors designed a generic deep learning accelerator for an FPGA, with a 16 x 16 matrix-vector unit running at 200 MHz (about 102 billion operations per second at peak). Most convolution layers of ResNet were offloaded to it. The first convolution and operators the design did not support stayed on the board\'s ARM CPU.'
            }
          ]
        },
        {
          id: 'reviewer',
          title: 'Read like a reviewer',
          min: 7,
          blocks: [
            { t: 'p', text: 'Claims and evidence are different things. The table lines them up. The last column is our judgment, and you are free to disagree.' },
            {
              t: 'table',
              head: ['Claim', 'Evidence in the paper', 'Our read'],
              rows: [
                ['Competitive with hand-tuned libraries on very different hardware', 'End-to-end and per-operator comparisons on a server GPU, an embedded CPU and an embedded GPU', '**Supported for the models and versions tested.** Check the tuning budget, the library versions, and whether the input shapes were fixed.'],
                ['Operator fusion helps', 'A comparison of fused and non-fused operators', '**Plausible and measured.** The size of the gain depends on which operators are fused, as the toy lab showed.'],
                ['A learned cost model finds good schedules quickly', 'A comparison of search methods', '**Read the figure closely.** Which baselines? How many trials? On which operators?'],
                ['New accelerators can be targeted', 'The FPGA case study', '**A feasibility demonstration on one design.** It is not a comparison with other accelerator compilers.']
              ],
              source: 'original',
              caption: 'Claims versus evidence. The third column is opinion.'
            },
            {
              t: 'callout',
              kind: 'try',
              title: 'Reading tasks',
              body: [
                'When you read the evaluation, answer these for each experiment.',
                '1. How long did tuning take, and how many measurements did it use? Is that stated?',
                '2. Which versions and settings were used for the baselines? Could they be tuned too?',
                '3. Were the input shapes fixed, or does each new shape need new tuning?',
                '4. Is the result a speed, a quality measure, or both?',
                '5. How many runs, and is any variation reported?'
              ]
            },
            {
              t: 'quiz',
              id: 'tvm-q24',
              q: 'Which would make the headline speedups more convincing? Select all that apply.',
              options: [
                'Reporting how long tuning took for every model',
                'Showing results across more models and input shapes',
                'Using larger figures',
                'Documenting how each baseline was configured and which versions were used'
              ],
              answer: [0, 1, 3],
              explain: 'Tuning cost, breadth and a documented baseline setup all speak to fairness and generality. Figure size does not.'
            },
            {
              t: 'callout',
              kind: 'note',
              title: 'Our take',
              body: 'The strongest idea in the paper is the separation of what from how, plus automation for the how. The weakest point is hidden in plain sight: in the system the paper describes, a person still writes the schedule template for each operator, and the learned model only searches inside it. Paper 4, Ansor, removes that step. Also keep in mind that compiling a model for a specific shape and chip can take hours of tuning. That is a fair trade for a model deployed millions of times and a poor one for a quick experiment.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 8 ------------------------------ */
    {
      id: 'wrapup',
      title: 'Wrap-up and what came next',
      summary: 'Where these ideas went, a final quiz, and your reading plan.',
      steps: [
        {
          id: 'after',
          title: 'What happened after this paper',
          min: 4,
          blocks: [
            { t: 'p', text: 'Everything in this step is about **later** work, not the 2018 paper. It shows where the ideas you just learned come back in the rest of your reading list.' },
            {
              t: 'flip',
              hint: 'Click to flip',
              cards: [
                { front: 'Ansor (paper 4)', back: 'AutoTVM searches inside a template that a person writes for each operator. Ansor generates the search space itself, so no templates are needed.' },
                { front: 'Triton (paper 3)', back: 'A language where you write GPU kernels in terms of tiles of data. A different answer to the same problem: make fast kernels easier to write.' },
                { front: 'MLIR (paper 5)', back: 'A compiler framework built around several levels of representation that lower step by step. TVM\'s graph level and operator level are an early example of that style.' },
                { front: 'FlashAttention (paper 11)', back: 'A hand-written kernel that fuses and tiles the attention computation so a huge intermediate matrix is never written to main memory. It shows why fusion and tiling matter.' },
                { front: 'TensorFlow (paper 1)', back: 'TensorFlow\'s graph is the kind of input TVM takes. XLA is TensorFlow\'s own compiler for a similar job.' },
                { front: 'TVM itself', back: 'It became an open-source Apache project, and its internal representations were redesigned after this paper. The ideas in this lesson are the stable core.' }
              ]
            },
            {
              t: 'callout',
              kind: 'note',
              title: 'Our take',
              body: 'The lasting lesson is the split between **what** and **how**. Once the what is data, a program can search, learn and retarget the how. Later systems differ in how much they automate and who writes the search space, but most of them start from this separation.'
            }
          ]
        },
        {
          id: 'final',
          title: 'Final quiz',
          min: 8,
          blocks: [
            { t: 'p', text: 'Ten questions, one at a time. Your score counts only first tries. At the end you get a list of parts to revisit.' },
            {
              t: 'finalquiz',
              questions: [
                { part: 'problem', q: 'What is the main drawback of relying on hand-written vendor libraries as new chips appear?', options: ['Every operator needs a new tuned kernel for every new chip', 'They are always slower than compilers', 'They cannot run on GPUs', 'They require training data'], answer: 0, explain: 'Operators times chips multiply, and each kernel is hand-tuned.' },
                { part: 'pipeline', q: 'Which order does a model follow through TVM?', options: ['Import, graph optimization, operator-level optimization, code generation', 'Code generation, import, graph optimization', 'Operator-level optimization, import, code generation', 'Graph optimization, code generation, import'], answer: 0, explain: 'You need the graph before you can rewrite it, and schedules before you can generate code.' },
                { part: 'graph', q: 'Which operator can fuse onto the output of a Conv2D?', options: ['ReLU', 'Sort', 'Another Conv2D', 'None of them'], answer: 0, explain: 'ReLU is injective, and element-wise operators can fuse onto a Conv2D output. Sort is opaque, and two Conv2D operators cannot fuse.' },
                { part: 'graph', q: 'Why does fusion save time for memory-bound operators?', options: ['It removes trips of intermediate results to main memory', 'It removes arithmetic', 'It shrinks the model', 'It adds more cores'], answer: 0, explain: 'The same arithmetic runs, but the in-between results stay on chip.' },
                { part: 'operators', q: 'In TVM, what does a schedule describe?', options: ['How to compute: loop order, tiling, vectorizing, where data lives', 'What to compute', 'The training data', 'The model accuracy'], answer: 0, explain: 'The tensor expression is the what. The schedule is the how.' },
                { part: 'operators', q: 'Why does tiling usually reduce cache misses?', options: ['A tile\'s data fits in the cache and is reused before it is evicted', 'It reduces the amount of arithmetic', 'It makes the cache bigger', 'It removes loops'], answer: 0, explain: 'Working on small blocks keeps the data you need on the desk instead of in the filing cabinet.' },
                { part: 'hardware', q: 'What does tensorization do?', options: ['Replaces a block of loops with one hardware tensor instruction', 'Converts tensors to strings', 'Fuses two graph operators', 'Computes constants at compile time'], answer: 0, explain: 'It matches a piece of the loop nest to a hardware instruction and swaps it in.' },
                { part: 'hardware', q: 'What are virtual threads for?', options: ['Overlapping memory loads with computation', 'Running Python in parallel', 'Reducing the number of operators', 'Storing the model'], answer: 0, explain: 'Two interleaved streams let one load while the other computes.' },
                { part: 'search', q: 'Why use a learned cost model?', options: ['To predict the speed of many schedules cheaply, so only a few need real measurement', 'To avoid ever running on the device', 'To replace the tensor expression', 'To train the neural network'], answer: 0, explain: 'Measuring on hardware is slow. The model ranks candidates quickly so you measure only the best.' },
                { part: 'evidence', q: 'Which best summarizes the paper\'s headline result?', options: ['Speedups of 1.2x to 3.8x over frameworks backed by hand-optimized libraries on the tested hardware and workloads', 'TVM is always 10x faster than any library', 'TVM only matches the libraries on server GPUs', 'TVM needs no tuning time'], answer: 0, explain: 'The range, and the qualification about what was tested, both matter.' }
              ]
            }
          ]
        },
        {
          id: 'take-away',
          title: 'Take it with you',
          min: 8,
          blocks: [
            { t: 'h', text: '1. Teach it back' },
            {
              t: 'teachback',
              id: 'tb2',
              prompt: 'In five sentences, explain to a friend why TVM separates what to compute from how to compute it.',
              checklist: [
                'Said that the same computation needs different implementations on different chips.',
                'Said that the tensor expression is the what and the schedule is the how.',
                'Gave an example of a schedule choice (loop order, tiling, vectorizing).',
                'Said how a learned cost model helps find a good schedule.'
              ]
            },
            { t: 'h', text: '2. One line per part' },
            {
              t: 'table',
              head: ['Part', 'One-line summary'],
              rows: [
                ['1. Why TVM exists', 'Hand-written libraries do not scale to new chips and cannot see across operators.'],
                ['2. The big picture', 'Model, then graph, then graph rewrites, then operator code, then a deployable module.'],
                ['3. Graph-level optimization', 'Fuse operators by four rules so intermediate results skip main memory.'],
                ['4. Operators', 'A tensor expression says what. A schedule says how. Loop order and tiling change cache misses a lot.'],
                ['5. New hardware', 'Tensorization uses special instructions. Virtual threads hide memory latency.'],
                ['6. Search', 'The schedule space is huge. A learned cost model ranks schedules so few need measuring.'],
                ['7. Evidence', 'Competitive with hand-tuned libraries, with end-to-end speedups of 1.2x to 3.8x on the tested hardware.']
              ]
            },
            { t: 'h', text: '3. How to read the real paper' },
            { t: 'p', text: 'Read the paper in this order. Section numbers follow the arXiv version. Check them against your copy.' },
            {
              t: 'readmap',
              rows: [
                { section: 'Abstract and Introduction', how: 'Read closely', note: 'The problem, the challenges and the contributions.', part: 'problem' },
                { section: '2 Overview', how: 'Read closely', note: 'The pipeline figure. Match it to Part 2.', part: 'pipeline' },
                { section: '3 Optimizing computational graphs', how: 'Read closely', note: 'The four operator categories and the fusion rules.', part: 'graph' },
                { section: '4.1 Tensor expressions and the schedule space; 4.2 Nested parallelism with cooperation', how: 'Read closely', note: 'The what and how split, and GPU shared memory.', part: 'operators' },
                { section: '4.3 Tensorization; 4.4 Explicit memory latency hiding', how: 'Read closely', note: 'The two ideas behind targeting new accelerators.', part: 'hardware' },
                { section: '5 Automating optimization', how: 'Read closely', note: 'The cost model, the exploration loop and the device pool.', part: 'search' },
                { section: '6 Evaluation', how: 'Read closely with a pencil', note: 'Answer the reading tasks for every experiment.', part: 'evidence' },
                { section: 'Related work and Conclusion', how: 'Skim', note: 'Use it to find the systems TVM is compared with.', part: 'evidence' }
              ]
            },
            { t: 'h', text: '4. References and where to go next' },
            {
              t: 'list',
              items: [
                'Chen et al. **TVM: An Automated End-to-End Optimizing Compiler for Deep Learning.** OSDI 2018. [arXiv 1802.04799](https://arxiv.org/abs/1802.04799)',
                'Chen et al. **Learning to Optimize Tensor Programs.** The detailed paper on the learned cost model, NeurIPS 2018. [arXiv 1805.08166](https://arxiv.org/abs/1805.08166)',
                'Ragan-Kelley et al. **Halide: A Language and Compiler for Optimizing Parallelism, Locality, and Recomputation in Image Processing Pipelines.** PLDI 2013. The source of the what and how split.',
                'Chen and Guestrin. **XGBoost: A Scalable Tree Boosting System.** KDD 2016. [arXiv 1603.02754](https://arxiv.org/abs/1603.02754)',
                'Next in your list: **Paper 3, Triton**, a different answer to making fast GPU kernels, or **Paper 4, Ansor**, which removes the hand-written templates from the search.'
              ]
            }
          ]
        }
      ]
    }
  ];
})();
