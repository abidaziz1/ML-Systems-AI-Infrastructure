/* Paper 1, parts 5 to 8: distributed, gradients, scaling-training, faults-loops. */
(function () {
  'use strict';
  var MLS = window.MLS;
  window.TFL = window.TFL || {};

  /* ---------- Cluster layout, used both as a figure and as a step-through ---------- */
  var clusterSpec = {
    width: 740,
    height: 300,
    ariaLabel: 'A client talks to a master, which coordinates two worker tasks that own devices',
    nodes: [
      { id: 'client', label: 'Client', sub: 'your program', cx: 60, cy: 150, w: 108, h: 48, kind: 'input' },
      { id: 'master', label: 'Master', sub: 'plans each Run', cx: 250, cy: 150, w: 108, h: 48 },
      { id: 'wa', label: 'Task A (worker)', sub: 'CPU, GPU 0, GPU 1', cx: 520, cy: 70, w: 160, h: 52, kind: 'device' },
      { id: 'wb', label: 'Task B (worker)', sub: 'CPU, GPU 0', cx: 520, cy: 230, w: 160, h: 52, kind: 'device' }
    ],
    edges: [
      { from: 'client', to: 'master', path: 'M 114,140 L 196,140', label: 'Run', labelAt: [155, 130] },
      { from: 'master', to: 'client', path: 'M 196,160 L 114,160', label: 'results', labelAt: [155, 184] },
      { from: 'master', to: 'wa', label: 'subgraph' },
      { from: 'master', to: 'wb', label: 'subgraph' },
      { from: 'wa', to: 'wb', label: 'tensors' }
    ]
  };
  function clusterFigure(host) {
    MLS.graph(host, clusterSpec);
  }

  window.TFL.p2 = [
    /* ------------------------------ Part 5 ------------------------------ */
    {
      id: 'distributed',
      title: 'Going distributed',
      summary: 'Placing nodes on devices, and the Send and Recv nodes that connect them.',
      steps: [
        {
          id: 'cluster',
          title: 'The cast of a TensorFlow cluster',
          min: 4,
          blocks: [
            { t: 'p', text: 'A TensorFlow cluster is a set of {{task|tasks}}. A task is a named process on some machine that can exchange messages over the network. Each task owns one or more {{device|devices}}, such as CPU cores or GPU cards. Three roles keep showing up.' },
            {
              t: 'flip',
              hint: 'Click to flip',
              cards: [
                { front: 'Client', back: 'Your program. It builds the graph and calls Run.' },
                { front: 'Master', back: 'Takes the Run request, decides what needs to run, splits the graph into pieces and coordinates the workers.' },
                { front: 'Worker', back: 'A process that manages the devices on one machine and runs the pieces it is given.' }
              ]
            },
            {
              t: 'callout',
              kind: 'example',
              body: 'A company with several offices. A client phones in a request. A project manager (master) breaks it into work packages and sends each to the team lead at the right office (worker). Each office has desks (devices) where the actual work happens. On a single laptop, all three roles can live inside one process.'
            },
            { t: 'figure', draw: clusterFigure, source: 'original', caption: 'One client, one master, two worker tasks. Task A owns three devices, Task B owns two. The tensors arrow between tasks is the traffic you will see in the next steps.', alt: 'Client sends Run to master. Master sends subgraphs to two worker tasks. Tasks exchange tensors.' }
          ]
        },
        {
          id: 'life',
          title: 'The life of one Run call',
          min: 5,
          blocks: [
            { t: 'p', text: 'Step through what happens between pressing Run and getting an answer. Each step is something you will meet again in the paper.' },
            {
              t: 'walk',
              alt: 'Step-through of one Run call across client, master and two workers',
              graph: clusterSpec,
              frames: [
                { caption: '**Define.** Your client has built the graph. Nothing has run. This is deferred execution.', active: ['client'] },
                { caption: '**Run.** The client calls Run with the outputs it wants (fetches) and anything it feeds.', active: ['client', 'master'], edges: { 'client>master': 'active' } },
                { caption: '**Prune.** The master keeps only the nodes the fetches depend on. Everything else is dropped.', active: ['master'], subs: { master: 'pruning' } },
                { caption: '**Place and split.** The master picks a device for every remaining node, then cuts the graph into one subgraph per device. Each piece goes to the worker that owns that device.', active: ['master', 'wa', 'wb'], edges: { 'master>wa': 'active', 'master>wb': 'active' }, subs: { master: 'placing and splitting', wa: 'subgraph A', wb: 'subgraph B' } },
                { caption: '**Connect the cuts.** Wherever an edge crosses between devices, a **Send** node is inserted on one side and a **Recv** node on the other.', active: ['wa', 'wb'], edges: { 'wa>wb': 'cut' }, subs: { wa: 'subgraph A + Send', wb: 'subgraph B + Recv' } },
                { caption: '**Execute.** Each worker runs its subgraph. A kernel starts as soon as its inputs are ready. Send and Recv move tensors across devices and machines. The master keeps the subgraphs so a repeat Run is cheap.', active: ['wa', 'wb'], done: ['master'], edges: { 'wa>wb': 'active' }, subs: { wa: 'running kernels', wb: 'running kernels' } },
                { caption: '**Return.** The fetched values travel back to your client.', active: ['client'], done: ['master', 'wa', 'wb'], edges: { 'master>client': 'active' }, subs: { client: 'got the answer' } }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'The paper describes the master as the component that prunes the graph, partitions it into subgraphs for each device, and caches those subgraphs so later steps can reuse them.' },
            {
              t: 'quiz',
              id: 'p5-q1',
              q: 'What does the master do right after pruning?',
              options: ['It runs the kernels', 'It places nodes on devices and splits the graph into one subgraph per device', 'It copies the data to the client', 'It restarts the workers'],
              answer: 1,
              whyNot: ['Kernels run on workers, not on the master.', null, 'Results return to the client at the end, after execution.', 'Nothing here restarts anything.'],
              explain: 'Prune, then place and split, then insert Send and Recv, then workers execute.'
            }
          ]
        },
        {
          id: 'placement',
          title: 'Placement lab: split a network across two GPUs',
          min: 7,
          blocks: [
            { t: 'p', text: 'Every node needs a {{placement|device}}. If two connected nodes land on different devices, the tensor between them has to travel, so TensorFlow adds a {{send-recv|Send and Recv}} pair. That costs time. Good placement keeps heavy edges on one device and still spreads the compute.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Two kitchens cooking one banquet. You can give each kitchen half the dishes, but whenever a dish needs an ingredient the other kitchen prepared, a runner has to carry it across the street. Split the menu so the runners carry as little as possible.'
            },
            { t: 'widget', name: 'placementLab', title: 'Placement lab', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Move only **Conv B1** and **Conv B2** to GPU 1. Is that faster than one GPU?', '2. Now move **Concat** too. Did traffic go up or down? Did the step get faster?', '3. Press **Greedy auto-place**, then **Show the best placement**. How close is greedy?']
            },
            { t: 'reveal', label: 'Show what to notice', body: ['Moving the B branch to GPU 1 takes the step from 45 ms to 35 ms. The two 16 ms branches now run side by side, and only 6 MB has to cross.', 'Adding Concat to GPU 1 raises traffic to 10 MB and the step to 37 ms. The extra cut costs more than the parallelism gains.', 'Greedy finds the best answer (33 ms) in this small graph. On much larger graphs a greedy rule can miss the best placement, which is one reason placement stays a research topic. You will see it again in paper 9, Alpa.'] },
            { t: 'callout', kind: 'paper', body: 'The paper describes a placement step that chooses a device for each node, and it lets the user add constraints, for example "keep these nodes together" or "put this on that device". Read the distributed execution section for the exact rules.' },
            {
              t: 'quiz',
              id: 'p5-q2',
              q: 'You move a node to the second GPU and the step gets slower. What is the most likely reason?',
              options: ['The node became more expensive to compute', 'The cut created heavy Send/Recv traffic that outweighed the extra parallelism', 'GPU 1 is always slower', 'TensorFlow cannot use two GPUs'],
              answer: 1,
              whyNot: ['The compute cost of a node does not depend on which GPU runs it.', null, 'In this model both GPUs are identical.', 'It can, and the lab shows it.'],
              explain: 'Every cut edge becomes a transfer. If the data moved costs more than the parallelism gains, the step slows down.'
            }
          ]
        },
        {
          id: 'sendrecv',
          title: 'Send and Recv in practice',
          min: 3,
          blocks: [
            { t: 'p', text: 'Send and Recv are not one generic mechanism. The runtime uses a different method for each pair of device types, so each hop is as fast as the hardware allows.' },
            {
              t: 'table',
              head: ['Between', 'How the tensor moves'],
              rows: [
                ['CPU and GPU in one machine', 'An asynchronous copy, so computing can overlap with the copying'],
                ['GPU and GPU in one machine', 'Direct memory transfer between the two cards'],
                ['Two different machines', 'Network transfer using {{grpc|gRPC}} over TCP, or {{rdma|RDMA}} over Converged Ethernet']
              ],
              source: 'paper',
              caption: 'Summarized from the paper\'s implementation section.'
            },
            { t: 'callout', kind: 'example', body: 'Moving house. Carrying a box to the next room is quick. Loading a van is slower. Shipping across the country is slowest. You pack and plan differently for each, and you keep working in the old room while the van is loading.' },
            {
              t: 'quiz',
              id: 'p5-q3',
              q: 'Why does it help that CPU-to-GPU copies are asynchronous?',
              options: ['They use less memory', 'The GPU can keep computing while data is still being copied', 'They avoid the need for Recv nodes', 'They make the model more accurate'],
              answer: 1,
              whyNot: ['Memory use is unchanged.', null, 'Send and Recv are still there. They just use an efficient method.', 'Accuracy is unaffected by how data is copied.'],
              explain: 'Overlapping copy and compute hides transfer time behind useful work.'
            }
          ]
        },
        {
          id: 'check5',
          title: 'Checkpoint: distribution',
          min: 3,
          blocks: [
            {
              t: 'quiz',
              id: 'p5-q4',
              q: 'When two connected nodes are placed on different devices, what does TensorFlow do?',
              options: ['It refuses to run', 'It inserts a Send node on one side and a Recv node on the other', 'It copies the whole graph to both devices', 'It moves one node to match the other'],
              answer: 1,
              whyNot: ['It runs fine.', null, 'Only the needed pieces go to each device.', 'Placement is already decided. It connects the cut instead.'],
              explain: 'The cut edge turns into a Send and Recv pair.'
            },
            {
              t: 'quiz',
              id: 'p5-q5',
              q: 'Put the master\'s jobs in the order they happen.',
              options: ['Prune, then place and split, then insert Send/Recv', 'Place and split, then prune, then insert Send/Recv', 'Insert Send/Recv, then prune, then place and split', 'Execute, then prune, then place and split'],
              answer: 0,
              whyNot: [null, 'Pruning first means you do not waste effort placing nodes that will never run.', 'Send/Recv are inserted at the cuts, which exist only after placement.', 'Execution comes last.'],
              explain: 'Prune first so you only plan what is needed. Then place and split. Then connect the cuts.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 6 ------------------------------ */
    {
      id: 'gradients',
      title: 'Gradients and memory',
      summary: 'How TensorFlow computes gradients as new graph nodes, and what that costs in memory.',
      steps: [
        {
          id: 'autodiff',
          title: 'Automatic differentiation',
          min: 6,
          blocks: [
            { t: 'p', text: 'Training needs a {{gradient}} for every parameter. You could derive them by hand for each model. TensorFlow does it for you with {{autodiff|automatic differentiation}}. You give it the loss. It walks backward through the graph and **adds new nodes** that compute the gradients.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A factory line has four machines. The finished product is defective. You walk backward from the defect and ask each machine: how much of this error came from you? Each machine answers using what it knows about its own step. That backward walk is backpropagation. TensorFlow builds that walk as part of the graph.'
            },
            { t: 'widget', name: 'autodiff', title: 'Gradient nodes added to the graph' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Step through to the end. Note the loss before and after one update.', '2. Set **w** so that z is negative (try w = -2). What happens to dL/dz, and why?', '3. Raise the learning rate to 0.5. Does one update still help?']
            },
            { t: 'reveal', label: 'Show what to notice', body: ['When z is negative, ReLU outputs 0 and its slope is 0, so dL/dz becomes 0 and no gradient reaches w or b. The neuron is "dead" for this example and does not learn.', 'With a large learning rate the update can overshoot the target. It can make the loss worse. Gradients say which direction to move, not how far.'] },
            { t: 'callout', kind: 'paper', body: 'The paper describes a user-level library that takes a symbolic expression for a loss and produces new graph nodes for the gradients. Because the optimizer is also just graph nodes, you can write a new one in a few lines. In DistBelief that meant editing the parameter server.' },
            {
              t: 'quiz',
              id: 'p6-q1',
              q: 'What are the gradient nodes in TensorFlow, structurally?',
              options: ['A separate program that runs after the graph', 'Ordinary nodes added to the same graph', 'Hardware instructions inside the GPU', 'Values stored in the parameter server'],
              answer: 1,
              whyNot: ['There is no separate program. The gradients are part of the graph.', null, 'They are not hardware features.', 'The parameter server stores parameters, not gradient logic.'],
              explain: 'Gradients are new nodes in the same graph, so the same placement, parallelism and optimization apply to them.'
            }
          ]
        },
        {
          id: 'memory',
          title: 'The memory bill for gradients',
          min: 4,
          blocks: [
            { t: 'p', text: 'You saw nodes marked "kept in memory". The backward pass needs values from the forward pass, such as `x` and `z`. So those {{activation|activations}} stay in memory until backward reaches them. The deeper the network, the longer the list.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Retracing your steps through a maze. To walk back correctly you need to remember every turn you took on the way in. A longer maze means a longer list of turns to keep.'
            },
            { t: 'widget', name: 'activationMemory', title: 'Memory during one training step', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Leave the defaults. Does the blue line cross the GPU limit?', '2. How much lower is the green peak?', '3. Reduce layers until everything fits. At what point would recomputing stop being worth it?']
            },
            { t: 'callout', kind: 'paper', body: 'The paper lists GPU memory pressure from gradient computation as a practical issue it had to manage. Recomputing activations is a technique popularized by later work, not something the 2016 paper introduces.' },
            { t: 'callout', kind: 'note', title: 'Looking ahead', body: 'ZeRO (paper 7) and FlashAttention (paper 11) attack related memory problems from different angles. This is the first time you meet the problem, so keep the picture in mind.' },
            {
              t: 'quiz',
              id: 'p6-q2',
              q: 'Why does the backward pass need memory from the forward pass?',
              options: ['It re-reads the training data', 'Gradient formulas use values computed during the forward pass', 'It stores the checkpoint', 'The GPU cannot recompute anything'],
              answer: 1,
              whyNot: ['The data is not needed again for the backward pass.', null, 'Checkpoints are saved separately.', 'It can recompute. That is the trade-off the widget shows.'],
              explain: 'For example dL/dw needs x, and dL/dz needs z. Those come from the forward pass.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 7 ------------------------------ */
    {
      id: 'scaling-training',
      title: 'Very large models and parallel training',
      summary: 'Sharded embeddings, and asynchronous versus synchronous versus backup workers.',
      steps: [
        {
          id: 'embeddings',
          title: 'Sharding a giant embedding table',
          min: 5,
          blocks: [
            { t: 'p', text: 'Many models turn categories, such as words or product ids, into vectors. The vectors are the rows of a big table called an {{embedding}} matrix. A batch only uses a handful of rows. So moving the whole table to every worker would waste almost all of the transfer.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A library with its books spread over four buildings. You ask for five specific books. A librarian in each building fetches the ones in their building. A front desk puts them in the order you asked for. Nobody carries all the books anywhere.'
            },
            { t: 'widget', name: 'shardLab', title: 'Part, Gather and Stitch' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Use the "cat sat on the mat" batch. Step through the four stages.', '2. Note that the word "the" appears twice. Where do both copies end up in the Stitch output?', '3. Switch to 4 shards, press Clear, then add only "the" and "mat". Which shards get work? What does that say about spreading ids evenly?']
            },
            { t: 'callout', kind: 'paper', body: 'In the paper\'s section on training very large models, the embedding table is sharded across parameter-server tasks. The graph uses Gather operations to look up rows, plus Part and Stitch operations to route ids to shards and reassemble the results. All of this is ordinary graph structure, no special system feature.' },
            {
              t: 'quiz',
              id: 'p7-q1',
              q: 'Why shard the embedding table and use Gather, instead of sending the whole table to each worker?',
              options: ['Sharding makes the table smaller', 'Each step touches only a few rows, so only those rows need to travel', 'Workers cannot store tables', 'It avoids using the network at all'],
              answer: 1,
              whyNot: ['The table is the same size. It is just spread out.', null, 'Workers can store tables. The issue is how much data moves each step.', 'The rows still cross the network. There are just far fewer of them.'],
              explain: 'Sparse access means each step needs a few rows. Gather moves just those.'
            }
          ]
        },
        {
          id: 'three-schemes',
          title: 'Three ways to train in parallel',
          min: 5,
          blocks: [
            { t: 'p', text: 'With many workers computing gradients, a basic question is when the shared parameters get updated. The paper discusses three schemes. Open each tab.' },
            {
              t: 'tabs',
              tabs: [
                {
                  label: 'Asynchronous',
                  body: [
                    'Each worker reads the current parameters, computes a gradient, and pushes it as soon as it finishes. The parameter server applies each one immediately. **Nobody waits.**',
                    'The catch: when a gradient arrives, other workers may already have changed the parameters. That gradient is {{stale}}.',
                    { t: 'callout', kind: 'example', body: 'Ten people editing one shared document with no coordination. Nobody ever waits, but sometimes your edit was written against a paragraph someone else already rewrote.' }
                  ]
                },
                {
                  label: 'Synchronous',
                  body: [
                    'All workers start from the same parameters. The server waits for **every** worker\'s gradient, averages them, applies one update, then everyone starts again. Gradients are fresh.',
                    'The catch: the slowest worker, a {{straggler}}, sets the pace for everyone.',
                    { t: 'callout', kind: 'example', body: 'A group presentation where nobody moves to the next slide until every member finishes their part. Great consistency, but one slow member holds up the room.' }
                  ]
                },
                {
                  label: 'Synchronous + backup workers',
                  body: [
                    'Start a few **extra** workers. Each round, use the first gradients that arrive and ignore the rest. You never wait for the slowest few, and the gradients you do use are still fresh.',
                    { t: 'callout', kind: 'example', body: 'You need ten replies to a quick poll, so you ask twelve friends and close the poll when the tenth answer arrives. The two slow ones do not matter.' }
                  ]
                }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'The paper\'s main point here is flexibility: all three can be built from ordinary graph pieces such as queues and variables, with no change to the system. The backup-worker idea comes from an earlier Google paper, [Revisiting Distributed Synchronous SGD](https://arxiv.org/abs/1604.00981), and the TensorFlow paper evaluates it.' },
            {
              t: 'quiz',
              id: 'p7-q2',
              q: 'Which scheme can apply a gradient that was computed from parameters other workers have since changed?',
              options: ['Asynchronous', 'Synchronous', 'Synchronous with backup workers', 'None of them'],
              answer: 0,
              whyNot: [null, 'In synchronous training every worker starts from the same parameters each step.', 'Backup workers are still synchronous. Gradients come from the same parameters.', 'Asynchronous training does this by design.'],
              explain: 'Asynchronous workers push gradients whenever they finish, so parameters may have moved on.'
            }
          ]
        },
        {
          id: 'sync-sim',
          title: 'Simulate the trade-off',
          min: 7,
          blocks: [
            { t: 'p', text: 'This simulation runs the three schemes on the same set of workers with the same random luck. Start with the defaults, then make stragglers more common and watch the three cards.' },
            { t: 'widget', name: 'syncSim', title: 'Asynchronous, synchronous and backup workers', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Set backup workers to 0. Compare "Synchronous" and "Synchronous + backup workers". They should match.', '2. Raise the chance of a slow step to 20%. Which card gets worse the fastest?', '3. With 20% slow steps, how many backup workers do you need before the idle time stops improving much?', '4. Switch the timeline between modes. Where do you see waiting, and where do you see thrown-away work?']
            },
            { t: 'callout', kind: 'paper', title: 'What the paper reports', body: 'In its Inception-v3 experiments the paper trains with up to 200 workers (one GPU each, with 17 parameter-server tasks) and reports that a synchronous step is a bit slower than an asynchronous one, on the order of 10% at the median. It also reports that adding a few backup workers speeds up synchronous training. Check its figures for the exact numbers. The stragglers in this toy are deliberately dramatic so the effect is easy to see. Expect smaller effects in a real cluster.' },
            {
              t: 'quiz',
              id: 'p7-q3',
              q: 'Backup workers help most when...',
              options: ['all workers run at the same speed', 'a few random workers are occasionally much slower than the rest', 'there is only one worker', 'the model does not fit in memory'],
              answer: 1,
              whyNot: ['If everyone runs at the same speed, there is no straggler to avoid, and backups would waste compute.', null, 'One worker has nobody to wait for.', 'Memory pressure is a different problem.'],
              explain: 'Backups exist to hide stragglers. No stragglers means no benefit, and you pay for the extra workers.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 8 ------------------------------ */
    {
      id: 'faults-loops',
      title: 'When things break, and loops',
      summary: 'Checkpoints for crashes, and loops inside a graph.',
      steps: [
        {
          id: 'checkpoints',
          title: 'Checkpoints: surviving a crash',
          min: 4,
          blocks: [
            { t: 'p', text: 'With hundreds of machines running for days, something will crash. A {{checkpoint}} is a saved copy of the model\'s variables. After a failure you reload the latest one and continue instead of starting over.' },
            { t: 'callout', kind: 'example', body: 'Save points in a video game. If you fall into a pit you restart at the last save, not at level one. Saving more often loses less progress but interrupts the game more.' },
            { t: 'widget', name: 'checkpointLab', title: 'How often to save', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Pick "never". Move the crash to step 90. What is lost?', '2. Pick "every 5". Now look at the time spent saving.', '3. Use the table to pick an interval you would use. Defend your choice in one sentence.']
            },
            { t: 'callout', kind: 'paper', body: 'The paper builds fault tolerance from ordinary graph operations: Save and Restore nodes attached to variables, with checkpoints written to storage. Because it is user-level, the policy, such as how often to save, is yours to choose. A side effect is that you can restore only some variables, for example to start a new model from a trained one.' },
            {
              t: 'quiz',
              id: 'p8-q1',
              q: 'Why not save a checkpoint after every single training step?',
              options: ['It would make training less accurate', 'The time spent saving would add up and slow training down', 'TensorFlow does not allow it', 'Checkpoints cannot be restored'],
              answer: 1,
              whyNot: ['Saving does not change the math of training.', null, 'It is allowed. It is just costly.', 'Restoring is exactly what checkpoints are for.'],
              explain: 'Each save costs time. The trade-off is lost work after a crash versus time spent saving.'
            }
          ]
        },
        {
          id: 'control-flow',
          title: 'Loops inside the graph',
          min: 5,
          blocks: [
            { t: 'p', text: 'A recurrent network repeats the same computation for every word in a sentence, and sentences have different lengths. A graph with a fixed shape struggles with that. TensorFlow adds {{control-flow|dynamic control flow}}: **Switch** and **Merge** for choices, and **Enter**, **Leave** and **NextIteration** for loops.' },
            { t: 'callout', kind: 'example', body: 'The recipe step "stir until smooth". The recipe does not say how many strokes. You check the batter after each stroke and decide whether to go again. A loop in a graph works the same way.' },
            { t: 'p', text: 'Here is the simplest loop, `i = 0; while i < 3: i = i + 1`. Follow the value around the graph.' },
            {
              t: 'walk',
              alt: 'A while loop drawn with Enter, Merge, Less, Switch, Add, NextIteration and Leave nodes',
              graph: {
                width: 760,
                height: 300,
                ariaLabel: 'Loop graph with Enter, Merge, Less, Switch, Add, NextIteration and Leave',
                nodes: [
                  { id: 'enter', label: 'Enter', sub: 'i = 0', cx: 70, cy: 160, w: 100, h: 46 },
                  { id: 'merge', label: 'Merge', sub: '', cx: 210, cy: 160, w: 100, h: 46 },
                  { id: 'less', label: 'Less', sub: 'i < 3 ?', cx: 350, cy: 160, w: 100, h: 46 },
                  { id: 'switch', label: 'Switch', sub: '', cx: 490, cy: 160, w: 100, h: 46 },
                  { id: 'add', label: 'Add', sub: 'i + 1', cx: 650, cy: 90, w: 100, h: 46 },
                  { id: 'leave', label: 'Leave', sub: 'exit the loop', cx: 650, cy: 240, w: 100, h: 46 },
                  { id: 'next', label: 'NextIteration', sub: '', cx: 440, cy: 40, w: 130, h: 40 }
                ],
                edges: [
                  { from: 'enter', to: 'merge' },
                  { from: 'merge', to: 'less' },
                  { from: 'less', to: 'switch' },
                  { from: 'switch', to: 'add', label: 'true' },
                  { from: 'switch', to: 'leave', label: 'false' },
                  { from: 'add', to: 'next', path: 'M 650,67 C 650,40 600,40 505,40', labelAt: [590, 30] },
                  { from: 'next', to: 'merge', path: 'M 375,40 C 210,40 210,90 210,137', label: 'back to Merge', labelAt: [250, 56] }
                ]
              },
              frames: [
                { caption: 'We follow the value `i` as it moves through the nodes. The graph is drawn once. The loop is the cycle through NextIteration.' },
                { caption: '**Enter** brings the starting value 0 into the loop.', active: ['enter'], subs: { enter: 'i = 0' } },
                { caption: '**Merge** accepts a value from either Enter (the first time) or NextIteration (every later round).', active: ['merge'], done: ['enter'], edges: { 'enter>merge': 'active' }, subs: { merge: 'i = 0' } },
                { caption: '**Less** checks whether i < 3. It is true, so the answer goes on to Switch.', active: ['less'], done: ['enter', 'merge'], edges: { 'merge>less': 'active' }, subs: { less: '0 < 3: yes' } },
                { caption: '**Switch** sends the value down the **true** path, toward Add.', active: ['switch'], done: ['enter', 'merge', 'less'], edges: { 'less>switch': 'active', 'switch>add': 'active' }, subs: { switch: 'true' } },
                { caption: '**Add** computes i + 1.', active: ['add'], done: ['merge', 'less', 'switch'], subs: { add: '0 + 1 = 1' }, edges: { 'switch>add': 'done' } },
                { caption: '**NextIteration** carries the new value back to Merge. The loop goes around again.', active: ['next'], done: ['add'], edges: { 'add>next': 'active', 'next>merge': 'active' }, subs: { next: 'i = 1' } },
                { caption: 'Rounds 2 and 3 repeat the same path with i = 1, then i = 2. After round 3, i is 3. **Less** now answers: 3 < 3? No.', active: ['less'], done: ['merge'], subs: { less: '3 < 3: no', merge: 'i = 3' } },
                { caption: '**Switch** sends the value down the **false** path.', active: ['switch'], edges: { 'less>switch': 'active', 'switch>leave': 'active' }, subs: { switch: 'false' } },
                { caption: '**Leave** hands the final value, 3, to the rest of the graph. The loop is finished.', active: ['leave'], done: ['switch'], edges: { 'switch>leave': 'done' }, subs: { leave: 'exits with 3' } }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'The paper adds these control-flow primitives to the graph model and explains how loops still work when different parts of the loop sit on different devices. Its dynamic control flow section has the details.' },
            {
              t: 'quiz',
              id: 'p8-q2',
              q: 'Which node carries a value from the end of one loop round back to the start of the next?',
              options: ['Enter', 'Leave', 'NextIteration', 'Switch'],
              answer: 2,
              whyNot: ['Enter brings a value into the loop from outside, once.', 'Leave sends a value out of the loop.', null, 'Switch chooses between two paths.'],
              explain: 'NextIteration feeds the new value into Merge for the next round.'
            }
          ]
        }
      ]
    }
  ];
})();
