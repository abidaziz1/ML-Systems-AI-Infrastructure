/* Paper 1, parts 9 to 11: implementation, evidence, wrapup. */
(function () {
  'use strict';
  window.TFL = window.TFL || {};

  window.TFL.p3 = [
    /* ------------------------------ Part 9 ------------------------------ */
    {
      id: 'implementation',
      title: 'Under the hood',
      summary: 'The layers of the runtime and the libraries it is built on.',
      steps: [
        {
          id: 'layers',
          title: 'The layered runtime',
          min: 5,
          blocks: [
            { t: 'p', text: 'You now know the ideas. This step maps them onto the actual software. The runtime is a stack of layers, and each layer has one job. Click through the stack from the top.' },
            { t: 'widget', name: 'layerExplorer', title: 'The TensorFlow runtime stack' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Find the layer that decides where each node runs.', '2. Find the layer that decides when each node starts.', '3. Find the layer that knows the difference between a CPU and a GPU version of MatMul.']
            },
            { t: 'reveal', label: 'Show the answers', body: ['1. The **distributed master** (it places nodes and cuts the graph).', '2. The **dataflow executor** (it starts a kernel as soon as inputs arrive).', '3. The **kernel implementations** layer.'] },
            {
              t: 'quiz',
              id: 'p9-q1',
              q: 'The master caches the subgraphs it built. What does that save?',
              options: ['Memory on the GPU', 'The work of pruning, placing and splitting the graph again on the next identical Run', 'The cost of the forward pass', 'The checkpoint file'],
              answer: 1,
              whyNot: ['Caching subgraphs is a planning optimization. It does not change GPU memory.', null, 'The forward pass still runs every time.', 'Checkpoints are separate.'],
              explain: 'A training loop calls Run thousands of times with the same shape. Planning once and reusing the plan keeps the per-step overhead low.'
            }
          ]
        },
        {
          id: 'libraries',
          title: 'The libraries underneath',
          min: 3,
          blocks: [
            { t: 'p', text: 'TensorFlow does not reinvent every wheel. The paper names the libraries it builds on. Knowing what each one does helps you read the implementation section quickly.' },
            {
              t: 'table',
              head: ['Library', 'What it does', 'Where TensorFlow uses it'],
              rows: [
                ['{{eigen|Eigen}}', 'C++ templates that generate efficient parallel code', 'Many kernels, on multicore CPUs and GPUs'],
                ['{{cudnn|cuDNN}}', 'NVIDIA\'s tuned GPU routines for deep learning', 'Where a specialized implementation is worth it'],
                ['{{gemmlowp}}', 'Matrix multiplication with low-precision numbers', 'Quantized computation'],
                ['{{grpc|gRPC}}', 'Calling functions on another machine over the network', 'Moving tensors between machines'],
                ['{{rdma|RDMA}}', 'Network cards that read remote memory directly', 'Faster tensor transfer between machines']
              ],
              source: 'paper',
              caption: 'Summarized from the paper\'s implementation section. It also notes more than 200 standard operations in the runtime, covering math, array manipulation, control flow and state management.'
            },
            { t: 'callout', kind: 'example', body: 'A restaurant does not grow its own wheat, mill the flour and keep its own cows. It buys good ingredients and spends its time on the menu. TensorFlow buys fast math from libraries and spends its effort on the graph, the placement and the coordination.' },
            {
              t: 'quiz',
              id: 'p9-q2',
              q: 'Which library is mainly there to make quantized (low-precision) computation cheaper?',
              options: ['Eigen', 'cuDNN', 'gemmlowp', 'gRPC'],
              answer: 2,
              whyNot: ['Eigen is a general tensor library for CPUs and GPUs.', 'cuDNN provides tuned full-precision GPU routines.', null, 'gRPC is for network calls.'],
              explain: 'gemmlowp does matrix multiplication with low-precision numbers.'
            }
          ]
        }
      ]
    },

    /* ----------------------------- Part 10 ------------------------------ */
    {
      id: 'evidence',
      title: 'Does it work? The evidence',
      summary: 'What the experiments show, and what they leave out.',
      steps: [
        {
          id: 'bench',
          title: 'Single-machine benchmarks',
          min: 5,
          blocks: [
            { t: 'p', text: 'The paper first checks that TensorFlow is not slow on one machine. It trains four well-known {{convnet|convolutional networks}} on one GPU and compares step times with three other libraries. Make a prediction first.' },
            {
              t: 'quiz',
              id: 'p10-q1',
              kind: 'predict',
              q: 'On one GPU, how do you expect TensorFlow to compare with Caffe, Neon and Torch on these four models?',
              options: ['Fastest on all four', 'Close to the best, but not always the fastest', 'Much slower than the others', 'It cannot be compared'],
              answer: 1,
              whyNot: ['That would be a big claim. Look at the data below.', null, 'The paper would not publish that as a feature.', 'The point of a benchmark is to compare.'],
              explain: 'The paper says TensorFlow beats Caffe and is within about 6% of Torch, while Neon wins on three of the four models.'
            },
            { t: 'widget', name: 'benchChart', title: 'Training step time, one GPU' },
            {
              t: 'table',
              head: ['Library', 'AlexNet', 'Overfeat', 'OxfordNet', 'GoogleNet'],
              rows: [
                ['Caffe', '324', '823', '1068', '1935'],
                ['Neon', '87', '211', '320', '270'],
                ['Torch', '81', '268', '529', '470'],
                ['**TensorFlow**', '**81**', '**279**', '**540**', '**445**']
              ],
              source: 'paper',
              caption: 'Training step time in milliseconds for four convolutional models on one GPU, as reported in the paper\'s single-machine benchmark table. Lower is better.'
            },
            { t: 'callout', kind: 'paper', body: 'The paper\'s reading of this table: TensorFlow is faster than Caffe and within about 6% of Torch, and Neon is faster than TensorFlow on three of the four models because it uses hand-optimized convolution kernels. The measurements use a published third-party benchmark of these models.' },
            {
              t: 'reveal',
              label: 'What this table does not show',
              body: [
                'It uses **one GPU** only. The paper\'s main claims are about many machines.',
                'It covers **convolutional networks** only. No recurrent networks, no embeddings.',
                'It measures **step time**, not accuracy or cost.',
                'Beating or matching other libraries on one GPU was never the main goal. The point was to show that generality did not cost a lot of speed.'
              ]
            }
          ]
        },
        {
          id: 'dist-results',
          title: 'The distributed experiments',
          min: 6,
          blocks: [
            { t: 'p', text: 'The rest of the evaluation tests the paper\'s larger claims: scale, and flexibility in training schemes. Here is what each experiment is, in plain words.' },
            {
              t: 'table',
              head: ['Experiment', 'Setup', 'What the paper reports'],
              rows: [
                ['Image classification with Inception-v3', 'Up to 200 workers with one GPU each and 17 parameter-server tasks. Asynchronous and synchronous training', 'Throughput keeps rising as workers are added, with diminishing returns. A synchronous step is somewhat slower than an asynchronous one, about 10% at the median'],
                ['Backup workers', 'Synchronous training with a few extra workers whose results can be dropped', 'Speeds up synchronous training. The figure shows the size of the gain for each number of backups'],
                ['Language modeling', 'A recurrent model (LSTM-512-512) on the One Billion Word benchmark, with the vocabulary limited to the 40,000 most common words', 'Sharding the {{softmax}} layer across parameter-server tasks raises throughput up to a point. A sampled softmax with 512 sampled classes cuts softmax data transfer and computation by a factor of 78']
              ],
              source: 'paper',
              caption: 'Our plain-language summary of the experiments. Exact figures are in the paper.'
            },
            {
              t: 'reveal',
              label: 'Where does "a factor of 78" come from?',
              body: ['The full softmax scores all 40,000 words. The sampled version scores 512. 40,000 divided by 512 is about 78. So a factor of 78 is the ratio of work, not a measured speedup of the whole training step. Read the paper to see how throughput actually changed.']
            },
            {
              t: 'callout',
              kind: 'try',
              title: 'Reading task',
              body: ['When you read the evaluation, fill in this for each experiment. It trains your eye for what is missing.', '1. What hardware did it use?', '2. What was it compared against? Is anything missing?', '3. Is the number a speed, or a measure of model quality?', '4. How many runs were there, and is there any sign of variation?']
            }
          ]
        },
        {
          id: 'critique',
          title: 'Read like a reviewer',
          min: 6,
          blocks: [
            { t: 'p', text: 'A paper\'s claims and its evidence are two different things. The table below lines them up. The last column is our judgment. You may disagree with it, and arguing it out is the point.' },
            {
              t: 'table',
              head: ['Claim', 'Evidence in the paper', 'Our read'],
              rows: [
                ['TensorFlow is competitive on a single device', 'Four convolutional models against Caffe, Neon and Torch', '**Solid for the narrow claim.** One GPU, convnets only.'],
                ['It scales to many workers', 'Inception-v3 on up to 200 workers', '**Supports "keeps getting faster, with diminishing returns."** While reading, check whether any other system is measured at this scale.'],
                ['It is flexible enough to try new training schemes without changing the system', 'Case studies: sharded embeddings, backup workers, sampled softmax', '**Convincing as demonstrations.** Weak as proof that it is easier than the alternative. A comparison of effort or a user study would be needed.'],
                ['It spans CPUs, GPUs and custom accelerators', 'Design description. Experiments run on specific hardware', '**A design claim.** Note which hardware each experiment actually used.']
              ],
              source: 'original',
              caption: 'Claims versus evidence. The third column is opinion.'
            },
            {
              t: 'quiz',
              id: 'p10-q2',
              q: 'Which would be stronger evidence that TensorFlow is easier to extend than DistBelief? Select all that apply.',
              options: [
                'A user study where researchers implement a new optimizer in both systems',
                'A comparison of how many lines it takes to build the same training scheme in each',
                'Higher images per second on Inception-v3',
                'A benchmark on more GPUs'
              ],
              answer: [0, 1],
              explain: 'Ease of extension is about effort. Speed and scale numbers say nothing about it.'
            },
            { t: 'callout', kind: 'note', title: 'Our take', body: 'The strongest part of this paper is the design argument, not the benchmarks. The evaluation shows the system is not slow and that it can express several training schemes. It does not prove that the design is the best one, and it could not have, because the key claim is about researcher effort.' }
          ]
        }
      ]
    },

    /* ----------------------------- Part 11 ------------------------------ */
    {
      id: 'wrapup',
      title: 'Wrap-up and what came next',
      summary: 'What happened to these ideas, a final quiz, and your reading plan.',
      steps: [
        {
          id: 'after',
          title: 'What happened after this paper',
          min: 4,
          blocks: [
            { t: 'p', text: 'Everything in this step is about **later** work, not the 2016 paper. It shows where the ideas you just learned come back in the rest of your reading list.' },
            {
              t: 'flip',
              hint: 'Click to flip',
              cards: [
                { front: 'Static graphs were hard to debug', back: 'You built the graph first and ran it later, so errors surfaced far from the line that caused them. Many researchers moved to frameworks that run line by line, an approach called {{eager|eager execution}}, such as PyTorch.' },
                { front: 'TensorFlow 2 made eager the default', back: 'Since 2019 TensorFlow runs operations immediately by default, and lets you wrap a function to get graph speed back.' },
                { front: 'Graphs became compiler input', back: 'A graph is a program a compiler can optimize. {{xla|XLA}} does it inside TensorFlow. TVM (paper 2), Triton (3), Ansor (4) and MLIR (5) are about compiling tensor programs.' },
                { front: 'Placement became automatic', back: 'Choosing devices by hand does not scale to giant models. Alpa (paper 9) automates the search. Megatron-LM (papers 8 and 19) shows hand-designed splits for transformers.' },
                { front: 'Memory moved to the center', back: 'The memory pressure from Part 6 returns as a main problem. ZeRO (7) splits training state across GPUs. FlashAttention (11) avoids storing a huge attention matrix.' },
                { front: 'Serving became its own field', back: 'This paper is mostly about training. Running models for users has its own problems, covered by Clockwork (6), Orca (10), PagedAttention (12) and DistServe (16).' }
              ]
            },
            {
              t: 'callout',
              kind: 'note',
              title: 'Our take',
              body: 'The lasting contribution is the argument that the training algorithm should be **data**, a graph, instead of a hard-wired part of the system. The static-graph design cost debuggability, which is why eager execution took over for everyday research. Both halves of that story are worth knowing.'
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
                { part: 'problem', q: 'Which limitation of DistBelief did TensorFlow set out to fix?', options: ['It could not use more than one machine', 'The optimization algorithm was built into the parameter server', 'It could not compute gradients', 'It only supported images'], answer: 1, explain: 'In DistBelief the update rule lived inside the parameter server. In TensorFlow it is ordinary graph nodes.' },
                { part: 'dataflow', q: 'What travels along the edges of a TensorFlow graph?', options: ['Operations', 'Tensors', 'Devices', 'Sessions'], answer: 1, explain: 'Nodes are operations. Edges carry tensors.' },
                { part: 'blocks', q: 'What does a Variable provide that a plain dataflow node does not?', options: ['Faster math', 'Mutable state shared across Run calls', 'Automatic gradients', 'GPU access'], answer: 1, explain: 'A Variable owns a mutable buffer that survives between executions. That is how parameters persist.' },
                { part: 'running', q: 'You Run with fetch = Loss. Which node does NOT run?', options: ['The node that reads input data', 'The prediction node', 'The Update node', 'The Loss node'], answer: 2, explain: 'Loss does not depend on Update. Update comes after the gradients.' },
                { part: 'distributed', q: 'Two connected nodes are placed on different devices. What does TensorFlow add?', options: ['A Send and a Recv node', 'A second copy of the graph', 'A queue', 'A checkpoint'], answer: 0, explain: 'The cut edge becomes a Send and Recv pair.' },
                { part: 'gradients', q: 'How does TensorFlow compute gradients?', options: ['By running a separate tool after training', 'By adding gradient nodes to the same graph, working backward from the loss', 'By asking the parameter server', 'By guessing and checking'], answer: 1, explain: 'Gradients are new nodes in the graph.' },
                { part: 'scaling-training', q: 'Which scheme avoids waiting for the slowest workers while still using fresh parameters?', options: ['Asynchronous training', 'Plain synchronous training', 'Synchronous training with backup workers', 'Training on one machine'], answer: 2, explain: 'Backup workers drop the slowest results each round. The rest were computed from the same fresh parameters.' },
                { part: 'scaling-training', q: 'Why shard a huge embedding table across machines and use Gather?', options: ['A step touches only a few rows, so only those rows need to travel', 'It makes the table more accurate', 'Machines cannot read tables', 'It removes the need for a network'], answer: 0, explain: 'Access is sparse. Moving only the needed rows saves almost all of the transfer.' },
                { part: 'faults-loops', q: 'How is fault tolerance built in TensorFlow?', options: ['A special recovery system inside the master', 'Save and Restore operations attached to variables, used by the program', 'Running everything twice', 'Asking workers to vote'], answer: 1, explain: 'It is user-level checkpointing built from ordinary graph operations.' },
                { part: 'evidence', q: 'Which statement does the single-machine benchmark table best support?', options: ['TensorFlow is the fastest library on every model', 'TensorFlow is competitive on these convnets, and not always the fastest', 'TensorFlow scales to 200 workers', 'TensorFlow is easier to use than Torch'], answer: 1, explain: 'It shows competitive speed on one GPU for four convnets. It says nothing about scale or ease of use.' }
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
              id: 'tb1',
              prompt: 'In five sentences, explain to a friend why TensorFlow represents a whole model as a graph.',
              checklist: [
                'Said that the graph includes the math, the parameters and the training update.',
                'Said that the system can see the whole plan before it runs (deferred execution).',
                'Gave at least one payoff (parallelism, splitting across devices, or automatic gradients).',
                'Said how this fixed something DistBelief could not do.'
              ]
            },
            { t: 'h', text: '2. One line per part' },
            {
              t: 'table',
              head: ['Part', 'One-line summary'],
              rows: [
                ['1. Why TensorFlow exists', 'DistBelief was hard to change, so Google built a more general system.'],
                ['2. Dataflow graph', 'Write the whole computation as boxes and arrows, then run it.'],
                ['3. Building blocks', 'Tensors flow, operations compute, kernels implement, variables remember, queues buffer.'],
                ['4. Running a graph', 'Fetch what you want, feed what you have, and only the needed nodes run.'],
                ['5. Going distributed', 'Place nodes on devices, cut the graph, and connect cuts with Send and Recv.'],
                ['6. Gradients and memory', 'Gradients are new graph nodes. They need forward values kept in memory.'],
                ['7. Very large models and parallel training', 'Shard huge tables. Choose async, sync or backup workers.'],
                ['8. When things break, and loops', 'Checkpoint with Save and Restore. Use Switch, Merge and friends for loops.'],
                ['9. Under the hood', 'A layered runtime on top of libraries such as Eigen, cuDNN and gRPC.'],
                ['10. The evidence', 'Competitive on one GPU, scales to many workers, flexible by demonstration.']
              ]
            },
            { t: 'h', text: '3. How to read the real paper' },
            { t: 'p', text: 'Read the paper in this order. Section numbers follow the arXiv version. Check them against your copy.' },
            {
              t: 'readmap',
              rows: [
                { section: 'Abstract and Introduction', how: 'Read closely', note: 'Short. States the problem and the claims you will test.', part: 'problem' },
                { section: 'Background and motivation (including the design principles)', how: 'Read closely', note: 'The DistBelief limits and the three principles.', part: 'problem' },
                { section: '3.1 Dataflow graph elements', how: 'Read closely', note: 'Tensors, operations, variables, queues.', part: 'blocks' },
                { section: '3.2 Partial and concurrent execution', how: 'Read closely', note: 'Fetch, feed, and overlapping Runs.', part: 'running' },
                { section: '3.3 Distributed execution', how: 'Read closely', note: 'Placement, subgraphs, Send and Recv.', part: 'distributed' },
                { section: '3.4 Dynamic control flow', how: 'Skim first, return later', note: 'Dense. The loop walkthrough gives you the picture.', part: 'faults-loops' },
                { section: '4.1 Differentiation and optimization', how: 'Read closely', note: 'Gradients as graph nodes, and the memory issue.', part: 'gradients' },
                { section: '4.2 Training very large models', how: 'Read closely', note: 'Sharded embeddings.', part: 'scaling-training' },
                { section: '4.3 Fault tolerance', how: 'Read closely', note: 'Save and Restore.', part: 'faults-loops' },
                { section: '4.4 Synchronous replica coordination', how: 'Read closely', note: 'Async, sync and backup workers.', part: 'scaling-training' },
                { section: 'Implementation', how: 'Skim', note: 'The runtime layers and libraries.', part: 'implementation' },
                { section: '6 Evaluation (all four subsections)', how: 'Read closely with a pencil', note: 'Fill in the reading-task questions for every experiment.', part: 'evidence' },
                { section: 'Related work and Conclusions', how: 'Skim', note: 'Use it to find systems to compare with.', part: 'evidence' }
              ]
            },
            { t: 'h', text: '4. References and where to go next' },
            {
              t: 'list',
              items: [
                'Abadi et al. **TensorFlow: A System for Large-Scale Machine Learning.** OSDI 2016. [arXiv 1605.08695](https://arxiv.org/abs/1605.08695)',
                'Abadi et al. **TensorFlow: Large-Scale Machine Learning on Heterogeneous Distributed Systems.** The earlier 2015 white paper. [arXiv 1603.04467](https://arxiv.org/abs/1603.04467)',
                'Chen et al. **Revisiting Distributed Synchronous SGD.** The source of the backup-worker idea. [arXiv 1604.00981](https://arxiv.org/abs/1604.00981)',
                'Dean et al. **Large Scale Distributed Deep Networks.** The DistBelief paper, NIPS 2012.',
                'Yu et al. **Dynamic Control Flow in Large-Scale Machine Learning.** Later work on loops and conditionals in TensorFlow. [arXiv 1805.01772](https://arxiv.org/abs/1805.01772)',
                'Chen et al. **Training Deep Nets with Sublinear Memory Cost.** The recomputation idea from Part 6. [arXiv 1604.06174](https://arxiv.org/abs/1604.06174)',
                'Next in your list: **Paper 2, TVM**, which takes the graph idea and turns it into a compiler.'
              ]
            }
          ]
        }
      ]
    }
  ];
})();
