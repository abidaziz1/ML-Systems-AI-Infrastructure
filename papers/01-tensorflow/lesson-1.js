/* Paper 1, parts 0 to 4: start, problem, dataflow, blocks, running. */
(function () {
  'use strict';
  var MLS = window.MLS;
  window.TFL = window.TFL || {};

  /* ---------- Figure helpers ---------- */
  function trainingLoop(host) {
    MLS.graph(host, {
      width: 760,
      height: 200,
      ariaLabel: 'The training loop: batch, forward pass, loss, backward pass, update, then repeat',
      nodes: [
        { id: 'b', label: 'Batch', sub: 'a few examples', cx: 70, cy: 60, w: 112, h: 48, kind: 'input' },
        { id: 'f', label: 'Forward pass', sub: 'make predictions', cx: 220, cy: 60, w: 112, h: 48 },
        { id: 'l', label: 'Loss', sub: 'how wrong?', cx: 370, cy: 60, w: 112, h: 48 },
        { id: 'g', label: 'Backward pass', sub: 'gradients', cx: 520, cy: 60, w: 112, h: 48, kind: 'grad' },
        { id: 'u', label: 'Update', sub: 'change parameters', cx: 670, cy: 60, w: 112, h: 48, kind: 'var' }
      ],
      edges: [
        { from: 'b', to: 'f' },
        { from: 'f', to: 'l' },
        { from: 'l', to: 'g' },
        { from: 'g', to: 'u' },
        { from: 'u', to: 'b', path: 'M 670,86 C 670,170 70,170 70,86', label: 'repeat with the next batch', labelAt: [370, 150] }
      ]
    });
  }

  function smoothie(host) {
    MLS.graph(host, {
      width: 560,
      height: 220,
      ariaLabel: 'Smoothie recipe as a graph: peel banana and pour milk feed into blend, which feeds into pour in glass',
      nodes: [
        { id: 'peel', label: 'Peel banana', cx: 80, cy: 60, w: 120, h: 44 },
        { id: 'milk', label: 'Pour milk', cx: 80, cy: 160, w: 120, h: 44 },
        { id: 'blend', label: 'Blend', cx: 280, cy: 110, w: 110, h: 44 },
        { id: 'glass', label: 'Pour in glass', cx: 470, cy: 110, w: 120, h: 44 }
      ],
      edges: [
        { from: 'peel', to: 'blend', label: 'banana' },
        { from: 'milk', to: 'blend', label: 'milk' },
        { from: 'blend', to: 'glass', label: 'smoothie' }
      ]
    });
  }

  function pipeline(host) {
    var g = MLS.graph(host, {
      width: 760,
      height: 310,
      ariaLabel: 'A training pipeline made of subgraphs: input, preprocessing, queue, training, variables and checkpointing',
      nodes: [
        { id: 'read', label: 'Read files', cx: 70, cy: 70, w: 108, h: 44, kind: 'io' },
        { id: 'pre', label: 'Preprocess', cx: 210, cy: 70, w: 108, h: 44 },
        { id: 'q', label: 'Input queue', cx: 350, cy: 70, w: 108, h: 44, kind: 'queue' },
        { id: 'train', label: 'Train step', sub: 'forward, backward, update', cx: 500, cy: 150, w: 150, h: 50, kind: 'grad' },
        { id: 'vars', label: 'Variables', sub: 'the parameters', cx: 500, cy: 260, w: 130, h: 44, kind: 'var' },
        { id: 'save', label: 'Save', sub: 'checkpoint', cx: 680, cy: 260, w: 110, h: 44, kind: 'io' }
      ],
      edges: [
        { from: 'read', to: 'pre' },
        { from: 'pre', to: 'q' },
        { from: 'q', to: 'train', label: 'a batch' },
        { from: 'train', to: 'vars', label: 'read + update' },
        { from: 'vars', to: 'save', label: 'values' }
      ]
    });
    g.node('pre').badge('Run loop A');
    g.node('train').badge('Run loop B');
    g.node('save').badge('Run loop C');
  }

  function pairPaths(i, y) {
    var dy = (i - 1) * 14;
    return {
      pull: 'M 365,' + (150 + dy - 5) + ' C 280,' + (150 + dy - 5) + ' 250,' + (y - 8) + ' 166,' + (y - 8),
      push: 'M 166,' + (y + 8) + ' C 250,' + (y + 8) + ' 280,' + (150 + dy + 5) + ' 365,' + (150 + dy + 5)
    };
  }
  var PS_Y = [60, 150, 240];
  var psEdges = [];
  PS_Y.forEach(function (y, i) {
    var p = pairPaths(i, y);
    /* only the middle worker's arrows are labeled, to keep the picture readable */
    psEdges.push({ from: 'ps', to: 'w' + (i + 1), path: p.pull, label: i === 1 ? 'pull parameters' : '', labelAt: [265, 126] });
    psEdges.push({ from: 'w' + (i + 1), to: 'ps', path: p.push, label: i === 1 ? 'push gradients' : '', labelAt: [265, 184] });
  });
  function psNodes() {
    var n = PS_Y.map(function (y, i) {
      return { id: 'w' + (i + 1), label: 'Worker ' + (i + 1), sub: 'data slice ' + (i + 1), cx: 110, cy: y, w: 112, h: 46, kind: 'op' };
    });
    n.push({ id: 'ps', label: 'Parameter server', sub: 'holds the parameters', cx: 430, cy: 150, w: 130, h: 64, kind: 'var' });
    return n;
  }

  /* ====================================================================== */
  window.TFL.p1 = [
    /* ------------------------------ Part 0 ------------------------------ */
    {
      id: 'start',
      title: 'Start here',
      summary: 'What the paper is, what you will learn, and how to use this lesson.',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Paper 1',
          min: 3,
          blocks: [
            { t: 'p', lead: true, text: 'TensorFlow is the system Google built to train and run machine learning models on one laptop or on thousands of machines. This lesson teaches the paper in small steps. You meet each idea through a real-life example first, then through the paper\'s own terms.' },
            {
              t: 'facts',
              rows: [
                ['Paper', 'TensorFlow: A System for Large-Scale Machine Learning'],
                ['Authors', 'Martín Abadi, Paul Barham, Jianmin Chen, Zhifeng Chen, Andy Davis, Jeffrey Dean, Matthieu Devin, Sanjay Ghemawat, Geoffrey Irving, Michael Isard, Manjunath Kudlur, Josh Levenberg, Rajat Monga, Sherry Moore, Derek G. Murray, Benoit Steiner, Paul Tucker, Vijay Vasudevan, Pete Warden, Martin Wicke, Yuan Yu, Xiaoqiang Zheng (Google Brain)'],
                ['Venue', '12th USENIX Symposium on Operating Systems Design and Implementation (OSDI 2016), pages 265 to 283'],
                ['Read the original', '[arXiv 1605.08695](https://arxiv.org/abs/1605.08695) or the [USENIX page](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/abadi)'],
                ['Time', 'About 3 hours in total. Most parts take 10 to 20 minutes. Do one or two parts per sitting. Your place is saved in this browser.'],
                ['You should know', 'What a neural network is, in one sentence, and that training means adjusting numbers to reduce error. Part 1 refreshes this.']
              ]
            },
            { t: 'h', text: 'By the end you can' },
            {
              t: 'list',
              ordered: true,
              items: [
                'Explain what a {{dataflow-graph|dataflow graph}} is and why TensorFlow represents a whole model as one.',
                'Describe how a graph is split across devices and machines, and what {{send-recv|Send and Recv}} nodes do.',
                'Compare {{asynchronous}}, {{synchronous}} and {{backup-workers|backup-worker}} training, and say when each one wins.',
                'Explain how TensorFlow handles huge {{embedding|embedding tables}}, crashes, and loops.',
                'Read the paper\'s evaluation and say which claims it supports and which it does not.'
              ]
            },
            {
              t: 'callout',
              kind: 'try',
              title: 'How this lesson works',
              body: [
                'Press **Next** or the right arrow key to move on. **Back** or the left arrow goes back. The **Parts** menu lets you jump anywhere.',
                'Words with a dotted underline open a short definition. The **Glossary** button lists them all.',
                'Every figure and widget is tagged. **From the paper** means the data is the authors\' own. **Toy model** means we invented a small simulation to teach an idea, so do not quote its numbers as results.'
              ]
            }
          ]
        },
        {
          id: 'tldr',
          title: 'The paper in 60 seconds',
          min: 3,
          blocks: [
            { t: 'p', text: 'Before TensorFlow, Google trained models with a system called {{distbelief|DistBelief}}. It worked, but it was hard to change. TensorFlow replaces it with one idea: write your whole computation as a **graph of operations**. That includes the math, the stored parameters, and the training algorithm that updates them. A runtime then places pieces of the graph on CPUs, GPUs and machines, adds the communication between them, and runs it.' },
            { t: 'callout', kind: 'idea', body: 'A TensorFlow program is a graph. Almost everything else in the paper follows from that one choice.' },
            { t: 'h', text: 'The paper in four questions' },
            {
              t: 'flip',
              hint: 'Click to see the answer',
              cards: [
                { front: 'What problem does it solve?', back: 'Training big models on many machines with a system that is flexible enough for research and robust enough for production.' },
                { front: 'What is the core idea?', back: 'One dataflow graph holds both the computation and the mutable state (parameters). The runtime maps that graph onto devices.' },
                { front: 'How do the authors show it works?', back: 'Case studies of new training setups (sharded embeddings, synchronous training with backup workers) plus benchmarks on image and language models.' },
                { front: 'What should you question?', back: 'Most results compare TensorFlow with itself or with a few single-machine libraries. You will practice spotting what is missing in Part 10.' }
              ]
            },
            { t: 'h', text: 'The course map' },
            { t: 'p', text: 'Ten short parts. Click any card to jump there.' },
            { t: 'partmap', skipFirst: true }
          ]
        }
      ]
    },

    /* ------------------------------ Part 1 ------------------------------ */
    {
      id: 'problem',
      title: 'Why TensorFlow exists',
      summary: 'Training at scale, and the four limits of the system that came before.',
      steps: [
        {
          id: 'training-loop',
          title: 'What training actually does',
          min: 4,
          blocks: [
            { t: 'p', text: 'A model is a function with adjustable numbers inside, called {{parameter|parameters}}. Training adjusts them until the model\'s answers get good. The recipe is a short loop, repeated millions of times.' },
            { t: 'figure', draw: trainingLoop, source: 'original', caption: 'The training loop behind almost every neural network. {{sgd|SGD}} is this loop with a specific update rule.', alt: 'A loop of five boxes: batch, forward pass, loss, backward pass, update.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'You are learning to throw darts. You throw (forward pass). You see how far you missed (loss). You work out which change in your arm angle would have fixed it (gradient). You adjust the angle a little (update). Then you throw again. Training a model is this loop with millions of adjustable numbers instead of one arm angle.'
            },
            { t: 'p', text: 'Two words matter later. A {{gradient}} is the "which way to adjust" signal for each parameter. A {{batch}} is the small group of examples you look at in one pass of the loop.' },
            {
              t: 'quiz',
              id: 'p1-q1',
              kind: 'predict',
              q: 'In the loop above, which step actually changes the model\'s parameters?',
              options: ['Forward pass', 'Loss', 'Backward pass', 'Update'],
              answer: 3,
              whyNot: ['The forward pass only reads the parameters to make predictions.', 'The loss is just a measurement of how wrong the predictions were.', 'The backward pass works out how to change the parameters but does not change them. Look one box to the right.'],
              explain: 'The backward pass computes the gradients. The update step applies them to the parameters. Keep this split in mind: TensorFlow makes both of them ordinary parts of the graph.'
            }
          ]
        },
        {
          id: 'scale',
          title: 'Why one machine is not enough',
          min: 4,
          blocks: [
            { t: 'p', text: 'Two things grow at the same time: the amount of training data and the size of the model. A single GPU eventually hits a wall on both. The paper\'s answer is to use many machines. There are two basic ways to split the work.' },
            {
              t: 'tabs',
              tabs: [
                {
                  label: 'Data parallelism',
                  body: [
                    'Copy the whole model to several workers. Give each worker a different slice of the data. Combine what they learn.',
                    { t: 'callout', kind: 'example', body: 'Ten teaching assistants grade one exam. Each has the same answer key and a different pile of papers. At the end they merge their scores.' },
                    'Use it when the model fits on one device but the data is huge.'
                  ]
                },
                {
                  label: 'Model parallelism',
                  body: [
                    'Split the model itself across devices because it does not fit on one. Each device holds a piece and hands results to the next.',
                    { t: 'callout', kind: 'example', body: 'A car assembly line. One station fits the engine, the next fits the doors, the next paints. No single station holds the whole car.' },
                    'Use it when the model is too big for one device.'
                  ]
                }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'TensorFlow supports both. The paper\'s point is that you do not need a different system for each. You express the scheme by choosing how the graph is split across devices.' },
            {
              t: 'quiz',
              id: 'p1-q2',
              q: 'A team trains on 10 GPUs. Every GPU holds a full copy of the model and sees different images. What is this?',
              options: ['Data parallelism', 'Model parallelism', 'Neither, this needs a parameter server', 'Both at once'],
              answer: 0,
              whyNot: [null, 'In model parallelism each GPU would hold only a piece of the model.', 'A parameter server is one way to combine results. It does not change which kind of parallelism this is.', 'Full copy of the model on each GPU is the data-parallel pattern only.'],
              explain: 'Full model copy plus different data per worker is data parallelism.'
            }
          ]
        },
        {
          id: 'distbelief',
          title: 'What came before: DistBelief',
          min: 6,
          blocks: [
            { t: 'p', text: 'Google\'s earlier system, {{distbelief|DistBelief}}, used a {{parameter-server|parameter server}}. Machines called {{worker|workers}} compute gradients on slices of the data. A separate group of machines, the parameter server, holds the parameters and applies the updates. Step through one cycle:' },
            {
              t: 'walk',
              alt: 'Parameter server cycle with three workers',
              graph: { width: 560, height: 300, ariaLabel: 'Three workers and a parameter server', nodes: psNodes(), edges: psEdges },
              frames: [
                { caption: 'The parameter server holds the current parameters. Each worker has its own slice of the training data.', active: ['ps'] },
                { caption: '**Step 1.** Every worker pulls the current parameters from the server.', active: ['ps'], edges: { 'ps>w1': 'active', 'ps>w2': 'active', 'ps>w3': 'active' } },
                { caption: '**Step 2.** Each worker computes gradients on its own data. No communication is needed here.', active: ['w1', 'w2', 'w3'] },
                { caption: '**Step 3.** Each worker pushes its gradients to the parameter server.', active: ['w1', 'w2', 'w3'], edges: { 'w1>ps': 'active', 'w2>ps': 'active', 'w3>ps': 'active' } },
                { caption: '**Step 4.** The server applies the update rule to the parameters, then the cycle repeats. Notice where the update rule lives: **inside the parameter server**. It matters on the next card.', active: ['ps'], done: ['w1', 'w2', 'w3'] }
              ]
            },
            { t: 'p', text: 'It worked well enough to train large models at Google. But the people who built and used it ran into four limits. These limits are the reason TensorFlow exists.' },
            {
              t: 'flip',
              hint: 'Click to see the detail',
              cards: [
                { front: '1. Layers were C++ classes', back: 'To try a new kind of layer, a researcher had to write C++. Most ML researchers want to work in Python.' },
                { front: '2. The optimizer lived inside the parameter server', back: 'Trying a new rule for updating parameters meant changing the parameter server\'s own code. That is slow, and risky for a shared service.' },
                { front: '3. The training loop was fixed', back: 'The system assumed a forward pass then a backward pass through layers. Models that loop over a sequence, or other training schemes, did not fit that pattern.' },
                { front: '4. Built for big CPU clusters', back: 'It targeted large clusters of CPU machines. Using GPUs well, or running on smaller devices, was hard.' }
              ]
            },
            { t: 'callout', kind: 'note', body: 'These four limits paraphrase the paper\'s introduction and background sections. When you read them in the original, compare the wording with this summary.' },
            {
              t: 'quiz',
              id: 'p1-q3',
              kind: 'predict',
              q: 'You want to try a new way to update parameters in DistBelief. What do you have to change?',
              options: ['Only your Python training script', 'The parameter server implementation', 'The GPU drivers', 'Nothing, the optimizer is a setting'],
              answer: 1,
              whyNot: ['In DistBelief the update rule was not part of your script.', null, 'Drivers have nothing to do with the update rule.', 'Plain SGD was built in. Anything else needed server changes.'],
              explain: 'The update rule ran inside the parameter server, so a new rule meant editing the server. In TensorFlow the update rule is ordinary graph nodes that you write.'
            }
          ]
        },
        {
          id: 'principles',
          title: 'TensorFlow\'s three design principles',
          min: 4,
          blocks: [
            { t: 'p', text: 'The paper answers those four limits with three design decisions. Click through each one.' },
            {
              t: 'tabs',
              tabs: [
                {
                  label: '1. Graphs of small operations',
                  body: [
                    'DistBelief built models from big **layers**. TensorFlow builds models from small **operations** such as MatMul and Add. A new kind of layer is just a new combination of existing operations. No C++ needed.',
                    { t: 'callout', kind: 'example', body: 'Pre-molded toys versus LEGO bricks. With molded toys you get what the factory made. With bricks you can build something nobody planned.' },
                    'Fixes limit 1 (layers in C++) and limit 3 (fixed training loop).'
                  ]
                },
                {
                  label: '2. Deferred execution',
                  body: [
                    'Two phases. **Phase 1:** describe the whole computation as a graph. Nothing runs. **Phase 2:** run an optimized version of that graph on whatever devices are available.',
                    { t: 'callout', kind: 'example', body: 'Writing the full shopping list and planning the route before you enter the store, instead of deciding item by item as you walk the aisles. Seeing everything first lets you skip backtracking.' },
                    'This is what lets the system place, split and optimize the work before it starts.'
                  ]
                },
                {
                  label: '3. One abstraction for all devices',
                  body: [
                    'A device only has to do three things: run a kernel, allocate memory for inputs and outputs, and move buffers to and from the host. If a new chip can do that, TensorFlow can use it.',
                    { t: 'callout', kind: 'example', body: 'A standard wall socket. Any appliance with the right plug works, and the electric company does not need to know about your toaster.' },
                    'Fixes limit 4 (stuck on CPU clusters) and makes room for new hardware.'
                  ]
                }
              ]
            },
            {
              t: 'quiz',
              id: 'p1-q4',
              q: 'Which principle explains why supporting a brand-new accelerator does not require rewriting TensorFlow?',
              options: ['Graphs of small operations', 'Deferred execution', 'One abstraction for all devices', 'The parameter server'],
              answer: 2,
              whyNot: ['Small operations make models easy to compose, but they say nothing about hardware.', 'Deferred execution is about when work runs, not where.', null, 'The parameter server is what TensorFlow moves away from.'],
              explain: 'A device only needs to run kernels, allocate memory and move buffers. Anything that does those three things plugs in.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 2 ------------------------------ */
    {
      id: 'dataflow',
      title: 'The core idea: a dataflow graph',
      summary: 'A program written as boxes and arrows, and why that helps.',
      steps: [
        {
          id: 'recipe',
          title: 'A program as a recipe graph',
          min: 4,
          blocks: [
            { t: 'p', text: 'A {{dataflow-graph|dataflow graph}} has two kinds of parts. **Nodes** are operations (things to do). **Edges** are the {{tensor|tensors}} (data) that flow from one operation to the next. An operation can start as soon as everything flowing into it has arrived.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Making a smoothie. Peel a banana. Pour milk. Blend. Pour into a glass. "Blend" cannot start until both the banana and the milk are ready. But "peel banana" and "pour milk" do not depend on each other, so two people could do them at the same time. Written down, this recipe is a dataflow graph.'
            },
            { t: 'figure', draw: smoothie, source: 'original', caption: 'A recipe as a dataflow graph. Steps are nodes, ingredients moving between steps are edges.', alt: 'Peel banana and pour milk both feed into blend, which feeds into pour in glass.' },
            { t: 'callout', kind: 'paper', title: 'In the paper', body: 'TensorFlow uses a **single dataflow graph** to represent all the computation and state in a machine learning algorithm. That means the math operations, the parameters and their update rules, and the input preprocessing, all in one graph.' },
            {
              t: 'quiz',
              id: 'p2-q1',
              q: 'In the smoothie graph, which two steps could run at the same time?',
              options: ['Peel banana and Pour milk', 'Blend and Pour in glass', 'Pour milk and Blend', 'Peel banana and Blend'],
              answer: 0,
              whyNot: [null, 'Pour in glass needs the blended smoothie first.', 'Blend needs the milk to be poured first.', 'Blend needs the banana to be peeled first.'],
              explain: 'Neither of them waits for the other, so a runtime may start both at once. Spotting this kind of independence is exactly what a graph makes easy.'
            }
          ]
        },
        {
          id: 'playground',
          title: 'Run a graph yourself',
          min: 5,
          blocks: [
            { t: 'p', text: 'Here is a real (tiny) neural network layer as a graph: `y = ReLU(x . W + b)`. The `.` is a dot product. ReLU keeps positive numbers and turns negative numbers into 0. Press **Run next wave** and watch which nodes can run together.' },
            { t: 'widget', name: 'graphPlayground', title: 'Dataflow graph playground' },
            {
              t: 'callout',
              kind: 'try',
              body: [
                '1. Run everything. Note the output y.',
                '2. Drag **b** to -2 and run again. What does ReLU do to a negative value?',
                '3. Count the waves. Six nodes finished in four waves. Why not six?'
              ]
            },
            { t: 'reveal', label: 'Show what to notice', body: ['With b = -2 the sum before ReLU is 0.5, which is still positive. Push **x1** down or **w2** up until the sum goes below zero and y snaps to 0.', 'Six nodes finish in four waves because x, W and b share wave 1. Nodes that do not depend on each other can run together. That is the source of the parallelism TensorFlow finds automatically.'] }
          ]
        },
        {
          id: 'payoffs',
          title: 'Why write a graph at all?',
          min: 5,
          blocks: [
            { t: 'p', text: 'You could write the same math as plain Python lines. So why build a graph first? Compare the two styles.' },
            {
              t: 'compare',
              left: {
                title: 'Run line by line',
                body: ['Each line executes the moment Python reaches it. The system never sees the whole plan, so it cannot reorder, split or fuse anything ahead of time.']
              },
              right: {
                title: 'Describe first, then run',
                body: ['You build the whole graph, then ask for results. The system sees everything before any math happens, so it can optimize and place the work.']
              }
            },
            {
              t: 'code',
              code: 'import tensorflow as tf   # TensorFlow 1.x style, the style of the paper era\n\n# Phase 1: describe the computation. Nothing runs yet.\nW = tf.Variable(tf.random_uniform([784, 100], -1, 1))  # parameters live in the graph\nb = tf.Variable(tf.zeros([100]))\nx = tf.placeholder(tf.float32, [None, 784])            # a hole to feed data into\ny = tf.nn.relu(tf.matmul(x, W) + b)                    # builds graph nodes only\n\n# Phase 2: run it.\nsess = tf.Session()\nsess.run(tf.global_variables_initializer())\nresult = sess.run(y, feed_dict={x: some_batch})        # fetch y, feed x',
              caption: 'Our own example in the style of the paper\'s code listing. The lines in phase 1 only create nodes. `sess.run` is where arithmetic happens. The `fetch` and `feed` you see here are the subject of Part 4.'
            },
            { t: 'h', text: 'Three payoffs from having the whole graph' },
            {
              t: 'flip',
              hint: 'Click to see where it appears',
              cards: [
                { front: 'Free parallelism', back: 'Independent branches can run at once, as you saw with waves. You never write threads.' },
                { front: 'Easy to split up', back: 'Cut the graph into pieces, give each piece to a device, and connect the cuts with communication. This is Part 5.' },
                { front: 'Gradients for free', back: 'Because the graph is data, TensorFlow can add new nodes that compute gradients. You never derive them by hand. This is Part 6.' }
              ]
            },
            {
              t: 'quiz',
              id: 'p2-q2',
              q: 'Why can TensorFlow place and optimize work before any arithmetic happens?',
              options: ['It runs everything twice', 'It has seen the whole graph first (deferred execution)', 'GPUs do it automatically', 'It trusts the programmer to optimize'],
              answer: 1,
              whyNot: ['It does not need to run anything to plan.', null, 'GPUs execute kernels. They do not plan the graph.', 'The whole point is that the system, not the programmer, does this.'],
              explain: 'Phase 1 builds a complete description. Phase 2 can plan using all of it.'
            }
          ]
        },
        {
          id: 'check2',
          title: 'Checkpoint: nodes, edges, waves',
          min: 3,
          blocks: [
            { t: 'p', text: 'Two quick questions before you move on. If you miss one, the explanation tells you why.' },
            {
              t: 'quiz',
              id: 'p2-q3',
              q: 'A graph has nodes A, B, C and D. A and B have no inputs. C needs A. D needs both B and C. How many waves does it take?',
              options: ['2', '3', '4'],
              answer: 1,
              whyNot: ['D needs C, and C needs A, so there are at least three levels.', null, 'A and B can share the first wave, so the answer is below 4.'],
              explain: 'Wave 1: A and B. Wave 2: C (needs A). Wave 3: D (needs B and C).'
            },
            {
              t: 'quiz',
              id: 'p2-q4',
              q: 'What travels along an edge of a TensorFlow graph?',
              options: ['An operation', 'A tensor', 'A device', 'A session'],
              answer: 1,
              whyNot: ['Operations are the nodes, not the edges.', null, 'Devices run the nodes. They are not data.', 'A session is how the client talks to the runtime.'],
              explain: 'Nodes are operations. Edges carry tensors between them.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 3 ------------------------------ */
    {
      id: 'blocks',
      title: 'Building blocks',
      summary: 'Tensors, operations, kernels, variables and queues.',
      steps: [
        {
          id: 'ops',
          title: 'Tensors, operations and kernels',
          min: 4,
          blocks: [
            { t: 'p', text: 'Three words show up on every page of the paper. Flip each card.' },
            {
              t: 'flip',
              hint: 'Click to flip',
              cards: [
                { front: 'Tensor', back: '**What:** an n-dimensional array of numbers or strings. A single number, a list, a table and a stack of images are all tensors. The paper\'s primitive types include 32-bit integers, 32-bit floats and strings.\n\n**Real life:** one spreadsheet is a 2-dimensional tensor. A workbook of sheets is a 3-dimensional one.' },
                { front: 'Operation', back: '**What:** a named, abstract computation such as MatMul or Add. It takes tensors in and produces tensors out. It says what to do, not how.\n\n**Real life:** the recipe step "chop the onions".' },
                { front: 'Kernel', back: '**What:** a specific implementation of an operation for one kind of device. MatMul has a CPU kernel and a GPU kernel.\n\n**Real life:** the same step "chop the onions" done with a knife, or with a food processor. Same result, different method for different equipment.' }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'Splitting "operation" from "kernel" is how one graph can run on a CPU, a GPU or a new chip. The graph names the operations. Each device brings its own kernels.' },
            {
              t: 'quiz',
              id: 'p3-q1',
              q: 'Which statement is right?',
              options: [
                'MatMul on a CPU and MatMul on a GPU are two different operations',
                'MatMul is one operation with different kernels for CPU and GPU',
                'A kernel is a node in the graph',
                'A tensor is a kind of device'
              ],
              answer: 1,
              whyNot: ['They are the same operation, implemented twice.', null, 'Nodes are operations. Kernels are the code that runs them.', 'A tensor is data, not hardware.'],
              explain: 'One abstract operation, several device-specific implementations (kernels).'
            }
          ]
        },
        {
          id: 'variables',
          title: 'Variables: state that survives',
          min: 5,
          blocks: [
            { t: 'p', text: 'Classic data-processing systems pass data from step to step and forget it. Training cannot work that way, because it has to remember the parameters from one step to the next. TensorFlow adds {{variable|variables}}: a node that owns a mutable buffer. Different Run calls see the same buffer.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A whiteboard in a team room. Each meeting reads what is on the board and may change it. The next meeting starts from what the last one left. The board outlives any single meeting.'
            },
            { t: 'widget', name: 'variableDemo', title: 'A variable across Run calls' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Press **Run: train step** five times. Watch `w` move toward 3 (the value that makes the prediction hit 6).', '2. Press **Run: predict only**. Does `w` change?', '3. Press **Close session**, then predict again.']
            },
            { t: 'callout', kind: 'paper', body: 'The paper describes a Variable as a node that owns a mutable buffer, used to store the shared parameters of a model as it trains. Keeping this state inside the graph is what lets the update rule be an ordinary part of the graph too.' }
          ]
        },
        {
          id: 'queues',
          title: 'Queues: keeping the GPU fed',
          min: 5,
          blocks: [
            { t: 'p', text: 'A {{queue}} is a node with a first-in, first-out line inside it. One part of the graph adds items (enqueue) and another takes them out (dequeue). Adding to a full queue waits. Taking from an empty queue waits. That lets two parts of the graph run at different speeds. A common use is to prepare input data while the GPU works on the previous batch.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A bakery. Bakers shape loaves and put trays on a shelf. The oven takes a tray whenever it is free. The oven is the expensive machine, so every minute it waits for a tray is wasted. The shelf is the queue.'
            },
            { t: 'widget', name: 'queueSim', title: 'Input pipeline and queue', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Set threads to 1. How busy is the GPU?', '2. Raise threads until the GPU is almost always busy. What happens to the queue?', '3. Raise threads further. Does throughput improve? What are the orange threads doing?', '4. Set threads back to 4 and compare a queue capacity of 1, 5 and 20. Press Restart and Fast-forward between runs.']
            },
            { t: 'reveal', label: 'Show what to notice', body: ['With 1 or 2 threads the pipeline supplies fewer batches than the GPU can use, so the queue stays empty and the GPU waits. With 4 threads supply matches demand. Beyond that, extra threads only fill the queue and then block (orange). Throughput stops at what the GPU can do.', 'At 4 threads, a queue of 1 leaves the GPU idle noticeably more often than a queue of 20, because one slow batch has nothing behind it to cover the gap. The queue is a buffer against uneven preparation times.'] },
            {
              t: 'quiz',
              id: 'p3-q2',
              q: 'The GPU is busy only about half the time and the queue is almost always empty. What is the best first fix?',
              options: ['Add more preprocessing threads', 'Buy a faster GPU', 'Make the queue larger', 'Reduce the number of threads'],
              answer: 0,
              whyNot: [null, 'A faster GPU would just be idle even more of the time. The GPU is not the bottleneck.', 'A bigger queue only helps if items are produced faster than they are used at times. Here the queue is empty because production is too slow.', 'Fewer threads would make the starvation worse.'],
              explain: 'An empty queue means the producers are too slow. More preprocessing threads fill it.'
            }
          ]
        },
        {
          id: 'vs-batch',
          title: 'How this differs from older dataflow systems',
          min: 3,
          blocks: [
            { t: 'p', text: 'Dataflow was not new in 2016. Systems like MapReduce, Spark and Naiad already organized big computations as dataflow. The paper names two differences that matter for machine learning.' },
            {
              t: 'table',
              head: ['', 'Batch dataflow (MapReduce, Spark)', 'TensorFlow'],
              rows: [
                ['State between runs', 'Data is mostly immutable between steps', 'Nodes such as variables hold **mutable state shared across executions**'],
                ['How graphs run', 'A job runs the graph once, start to finish', 'The same graph runs **many times**, and several runs can overlap on **overlapping subgraphs**'],
                ['Built for', 'Large-scale data processing', 'Numerical ML, including updating parameters']
              ],
              source: 'original',
              caption: 'Our summary of the two differences the paper names in its execution model section.'
            },
            {
              t: 'quiz',
              id: 'p3-q3',
              q: 'Select the two features that set TensorFlow\'s graph apart from classic batch dataflow systems.',
              options: [
                'Nodes can hold mutable state shared across executions',
                'Several executions can run at once on overlapping subgraphs',
                'Graphs can only run on GPUs',
                'A node can have at most one input'
              ],
              answer: [0, 1],
              explain: 'Mutable shared state (variables, queues) and concurrent executions on overlapping subgraphs are the two differences. The other two statements are not true of TensorFlow.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 4 ------------------------------ */
    {
      id: 'running',
      title: 'Running a graph',
      summary: 'Sessions, fetch and feed, and running only what you need.',
      steps: [
        {
          id: 'sessions',
          title: 'Sessions: Extend and Run',
          min: 4,
          blocks: [
            { t: 'p', text: 'Your program talks to TensorFlow through a {{session}}. A session can **extend** the graph with new nodes and **run** part of it. A Run call takes two things: the outputs you want (**{{fetch|fetches}}**) and any tensors you supply yourself (**{{feed|feeds}}**).' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Ordering at a restaurant. You do not ask the kitchen to cook the whole menu. You ask for one dish, that is the **fetch**. If you bring your own avocado, the kitchen skips the step of preparing one, that is the **feed**.'
            },
            { t: 'callout', kind: 'paper', body: 'When you call Run, TensorFlow works out everything the fetched outputs depend on (the transitive closure) and runs **only that**. The rest of the graph is left alone.' },
            {
              t: 'quiz',
              id: 'p4-q1',
              kind: 'predict',
              q: 'You call Run with fetch = "prediction". Your graph also contains a node that saves checkpoints. Does the save node run?',
              options: ['Yes, every node runs on every Run', 'No, it is not needed to compute the prediction', 'Only if the GPU is idle', 'It depends on the queue'],
              answer: 1,
              whyNot: ['Running every node every time would be wasteful and is not how Run works.', null, 'Idle GPUs do not change which nodes are needed.', 'Queues do not decide what runs.'],
              explain: 'Only the nodes the fetch depends on run. The save node is not one of them.'
            }
          ]
        },
        {
          id: 'partial',
          title: 'Partial execution',
          min: 5,
          blocks: [
            { t: 'p', text: 'Here is a simplified training graph. Click a node to **fetch** it, then watch which nodes light up in blue. Use the quick setups first, then build your own. Switch to feed mode to supply a tensor yourself.' },
            { t: 'widget', name: 'partialExec', title: 'Fetch and feed' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Fetch only **Loss**. Which nodes are skipped?', '2. Fetch **Update**. Why does it pull in almost everything?', '3. Fetch **Save** only. How many nodes run?', '4. Fetch **ReLU** and feed **Decode**. What happens to Read?']
            },
            {
              t: 'quiz',
              id: 'p4-q2',
              q: 'You run with fetch = Loss and nothing fed. Which nodes do NOT run? Select all that apply.',
              options: ['Gradients', 'Update', 'Save', 'Decode'],
              answer: [0, 1, 2],
              explain: 'Loss depends on Decode (through the prediction) and on Labels, so Decode runs. Gradients, Update and Save all come after Loss or are unrelated to it, so they are skipped.'
            }
          ]
        },
        {
          id: 'concurrent',
          title: 'Many Runs at once',
          min: 3,
          blocks: [
            { t: 'p', text: 'A real training job is not one Run call. Several loops run side by side against the same graph, each on its own schedule.' },
            { t: 'figure', draw: pipeline, source: 'original', caption: 'A training pipeline in the spirit of the paper\'s pipeline figure. Three Run loops touch different, overlapping parts of one graph. Loop A keeps the queue filled, loop B trains, loop C saves a checkpoint now and then.', alt: 'Read files, preprocess and an input queue feed a train step. The train step updates variables. A save node reads the variables.' },
            { t: 'callout', kind: 'example', body: 'A restaurant kitchen during service. One cook keeps the prep station stocked, the grill cook plates orders, and a manager does inventory every hour. Each works at a different pace on the same kitchen, and they coordinate through the shared counter.' },
            {
              t: 'quiz',
              id: 'p4-q3',
              q: 'Why is it useful to run checkpointing in a separate Run call from training?',
              options: ['It makes training steps cheaper', 'It can happen on its own schedule without stopping training', 'It is required by the TensorFlow API', 'It avoids using variables'],
              answer: 1,
              whyNot: ['Training steps cost the same either way.', null, 'Nothing forces this. It is a design choice the graph allows.', 'Checkpointing reads variables.'],
              explain: 'Separate Run calls on overlapping subgraphs let each job run at its own pace.'
            }
          ]
        }
      ]
    }
  ];
})();
