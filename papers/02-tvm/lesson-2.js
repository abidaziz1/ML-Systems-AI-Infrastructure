/* Paper 2, parts 3 to 5: graph, operators, hardware. */
(function () {
  'use strict';
  window.TVML = window.TVML || {};

  window.TVML.p2 = [
    /* ------------------------------ Part 3 ------------------------------ */
    {
      id: 'graph',
      title: 'Graph-level optimization',
      summary: 'Fusing operators so intermediate results never visit main memory.',
      steps: [
        {
          id: 'fusion-idea',
          title: 'Operator fusion',
          min: 5,
          blocks: [
            { t: 'p', text: '{{operator-fusion|Operator fusion}} merges several operators into one {{kernel}}. The in-between results stay in fast on-chip memory and never make the round trip to main memory.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Back to the sandwich line. Instead of three workers who each return the half-made sandwich to the fridge, one worker does all three steps at the counter. The sandwich never goes back to the fridge, and nothing about the sandwich changes.'
            },
            {
              t: 'compare',
              left: {
                title: 'Three kernels (no fusion)',
                body: ['3 kernel launches.', 'Each reads its input from main memory and writes its output back: 6 passes over the data. On a 16 MB tensor that is **96 MB** of traffic.']
              },
              right: {
                title: 'One fused kernel',
                body: ['1 kernel launch.', 'Reads the input once and writes the final result once: 2 passes. On a 16 MB tensor that is **32 MB** of traffic, **64 MB less**.']
              }
            },
            { t: 'p', text: 'Why not fuse everything? Some operators cannot be merged safely or usefully. The paper sorts operators into four groups and gives rules for what can fuse with what.' },
            {
              t: 'flip',
              hint: 'Click to see the detail',
              cards: [
                { front: 'Injective', back: 'Each output number depends on one input position, a one-to-one map. Add, scale, ReLU.\n\nReal life: stamping the date on every page of a stack. One page in, one page out.' },
                { front: 'Reduction', back: 'Many inputs collapse into fewer outputs. Sum, max over an axis.\n\nReal life: adding up a column of receipts.' },
                { front: 'Complex-out-fusable', back: 'Complicated by itself, but simple element-wise operators can be fused onto its output. Conv2D.\n\nReal life: an oven with a glazing station at the door. The bake is the hard part. The glaze happens before anything goes out.' },
                { front: 'Opaque', back: 'Cannot be fused with anything. Sort is the example.\n\nReal life: a mandatory inspection. It stands alone, so nothing can be merged into it.' }
              ]
            },
            {
              t: 'callout',
              kind: 'paper',
              title: 'The fusion rules, in the paper\'s terms',
              body: [
                'Several injective operators can fuse into one injective operator.',
                'A reduction can fuse with the injective operators in front of it.',
                'Element-wise operators can fuse onto the output of a complex-out-fusable operator such as Conv2D.',
                'Two complex-out-fusable operators cannot fuse with each other, and nothing fuses with an opaque operator.'
              ]
            },
            {
              t: 'quiz',
              id: 'tvm-q7',
              q: 'A Conv2D is followed by a ReLU. Can they fuse?',
              options: ['Yes, ReLU is injective and fuses onto the Conv2D output', 'No, a Conv2D can never fuse with anything', 'Only if the ReLU comes first', 'Only on GPUs'],
              answer: 0,
              whyNot: [null, 'Conv2D is complex-out-fusable: element-wise operators can fuse onto its output.', 'Order matters the other way. The element-wise operator goes after Conv2D, onto its output.', 'The rules are about the graph, not the chip.'],
              explain: 'Conv2D is complex-out-fusable and ReLU is injective, so ReLU fuses onto its output.'
            }
          ]
        },
        {
          id: 'fusion-lab',
          title: 'Fusion lab',
          min: 7,
          blocks: [
            { t: 'p', text: 'Build a chain of operators and watch TVM\'s rules group them. The table compares the unfused and fused versions on a made-up chip. Start with a preset, then build your own.' },
            { t: 'widget', name: 'fusionLab', title: 'Fusion lab', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: [
                '1. Load **Conv, Batch norm, ReLU** with fusion on. How many kernels? How much memory traffic is saved?',
                '2. Change the tensor size from 4 M to 16 M. Does the percentage saved change? Does the amount saved?',
                '3. Load **Add, ReLU, Sum**. Compare the speedup with the first chain. Which gains more, and why?',
                '4. Load **Two conv blocks**. Why do you get two kernels and not one?',
                '5. Load **Sort in the middle**. What does Sort do to the chain?'
              ]
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: [
                '1. Three kernels become one, and traffic falls by 67% (96 MB to 32 MB at 4 M numbers).',
                '2. The percentage stays at 67%. The amount grows with the tensor: 384 MB unfused and 128 MB fused at 16 M.',
                '3. **Add, ReLU, Sum** gets about a 4.8x speedup and 80% less traffic. **Conv, Batch norm, ReLU** gets only about 1.2x. Add and ReLU are **memory-bound**: they do almost no arithmetic, so the memory trips are nearly all of their cost. Conv2D is **compute-bound**: its arithmetic dominates, so removing trips from the cheap operators around it helps less. Fusion pays most where memory trips dominate.',
                '4. A second Conv2D cannot fuse into the group before it, so each conv block becomes its own kernel with its batch norm and ReLU fused on. Six kernels become two.',
                '5. Sort is opaque. Conv and the ReLU after it fuse, Sort stands alone, and the last ReLU cannot join it. Four kernels become three.'
              ]
            },
            { t: 'callout', kind: 'note', title: 'Reading task', body: 'Find the figure in the paper that compares fused and non-fused operators. Which operators did the authors test, and how large were the speedups? Compare with the toy: do the same kinds of operators gain the most?' }
          ]
        },
        {
          id: 'graph-others',
          title: 'Three more graph rewrites',
          min: 4,
          blocks: [
            { t: 'p', text: 'Fusion gets the attention, but the graph optimizer does three other things before any code is generated.' },
            {
              t: 'flip',
              hint: 'Click to see the detail',
              cards: [
                { front: 'Constant folding', back: 'Compute, at compile time, any part of the graph whose inputs are already known. It then costs nothing at run time.\n\nReal life: a recipe says "add 2 tablespoons plus 1 tablespoon". You write "3 tablespoons" on the card once instead of adding at every cooking.' },
                { front: 'Static memory planning', back: 'Decide before running where every intermediate tensor will live, and reuse a buffer once its tensor is no longer needed.\n\nReal life: a parking attendant who knows every car\'s arrival and departure times in advance, and gives the same spot to cars that never overlap.' },
                { front: 'Data layout transformation', back: 'Store tensors in the arrangement the target hardware prefers, and insert a conversion where two neighbors disagree.\n\nReal life: arranging warehouse stock to match the pickers\' walking route, so each trip is shorter.' }
              ]
            },
            {
              t: 'quiz',
              id: 'tvm-q8',
              q: 'A graph contains the expression 2 * 3.14159 where both numbers are fixed. Which rewrite replaces it with 6.28318 ahead of time?',
              options: ['Operator fusion', 'Constant folding', 'Static memory planning', 'Data layout transformation'],
              answer: 1,
              whyNot: ['Fusion merges operators into one kernel. It does not precompute values.', null, 'Memory planning decides where tensors live.', 'Layout transformation changes how data is arranged.'],
              explain: 'Constant folding evaluates parts of the graph whose inputs are known at compile time.'
            }
          ]
        },
        {
          id: 'check3',
          title: 'Checkpoint: the graph level',
          min: 3,
          blocks: [
            {
              t: 'quiz',
              id: 'tvm-q9',
              q: 'A chain is Conv2D, ReLU, Conv2D, ReLU. Using the paper\'s rules, how many kernels does it become?',
              options: ['1', '2', '3', '4'],
              answer: 1,
              whyNot: ['The second Conv2D cannot join the first group, so one kernel is not possible.', null, 'Each ReLU fuses onto the Conv2D before it, so you do not need three.', 'That is no fusion at all.'],
              explain: 'Conv2D with its ReLU is one group. The second Conv2D starts a new group, and its ReLU fuses onto it.'
            },
            {
              t: 'quiz',
              id: 'tvm-q10',
              q: 'Fusion helps the most when the operators in the chain are...',
              options: ['memory-bound', 'compute-bound', 'opaque', 'already in a vendor library'],
              answer: 0,
              whyNot: [null, 'For compute-bound operators the arithmetic dominates, so cutting memory trips changes less.', 'Opaque operators cannot be fused at all.', 'A vendor library routine is a single operator, which is exactly what cannot see across operators.'],
              explain: 'Fusion removes memory trips. If memory trips are most of the cost, that is a big win.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 4 ------------------------------ */
    {
      id: 'operators',
      title: 'Operators: separate what from how',
      summary: 'Tensor expressions, schedules, loop order, tiling and the cache.',
      steps: [
        {
          id: 'what-how',
          title: 'Compute and schedule',
          min: 5,
          blocks: [
            {
              t: 'callout',
              kind: 'example',
              body: 'The recipe says: dice 1 kg of onions. That is the **what**. Now two kitchens. Kitchen A is a home kitchen: one cook, a knife, a small board, 100 g at a time. Kitchen B is a restaurant: four cooks, a big board, a food processor. The what is identical. The **how** is completely different, and a good how depends on the kitchen.'
            },
            { t: 'p', text: 'TVM splits an operator the same way. You write the **what** as a {{tensor-expression|tensor expression}}: arithmetic over index positions, with no loops and no order. Then you write the **how** as a {{schedule}}: a list of transformations. The idea comes from {{halide|Halide}}, an image-processing language.' },
            {
              t: 'code',
              code: 'import tvm   # in the style of the paper era; newer TVM uses different names\n\nm = n = l = 1024\nA = tvm.placeholder((m, l), name=\'A\')\nB = tvm.placeholder((l, n), name=\'B\')\nk = tvm.reduce_axis((0, l), name=\'k\')\n\n# WHAT: C[i, j] is a sum over k. No loops, no order, no hardware.\nC = tvm.compute((m, n), lambda i, j: tvm.sum(A[i, k] * B[k, j], axis=k))\n\n# HOW: a separate list of choices, different for each chip.\ns = tvm.create_schedule(C.op)\nio, jo, ii, ji = s[C].tile(C.op.axis[0], C.op.axis[1], 32, 32)   # work in 32 x 32 tiles\ns[C].vectorize(ji)                                               # use SIMD on the inner loop',
              caption: 'Our own example in the spirit of the paper\'s code listings. The function names are from TVM of that era and have changed since. The first block says what. The second block says how.'
            },
            { t: 'callout', kind: 'paper', body: 'The paper builds on the idea of separating what to compute from how to compute it, which comes from Halide, and extends the set of schedule choices to cover deep learning hardware. You meet the extensions in the next steps and in Part 5.' },
            {
              t: 'quiz',
              id: 'tvm-q11',
              q: 'In the code above, which part would you change to move the same matrix multiply from a CPU to a GPU?',
              options: ['The tensor expression (the what)', 'The schedule (the how)', 'The shapes m, n, l', 'Nothing, it works everywhere unchanged'],
              answer: 1,
              whyNot: ['The math is the same on any chip, so the expression stays.', null, 'The shapes are part of the problem, not of the chip.', 'It would run, but not fast. A good schedule differs per chip.'],
              explain: 'The what stays fixed. The how changes per target.'
            }
          ]
        },
        {
          id: 'cache-lab',
          title: 'Schedule lab: loop order and tiling',
          min: 10,
          blocks: [
            {
              t: 'callout',
              kind: 'note',
              title: 'Quick refresher: the cache',
              body: 'Think of a desk and a filing cabinet in the next room. The **cache** is the desk: small and fast. When you fetch a folder from the cabinet you bring a whole section of the drawer (a **cache line**), betting you will need its neighbors. If what you need is not on the desk, that is a **miss**, and you walk to the cabinet. Walking costs about 20 times more than reaching across the desk in this lab.'
            },
            { t: 'p', text: 'Now you play the schedule writer. The what is fixed: a 16 x 16 matrix multiply. You choose the loop order, the tile sizes, and whether to vectorize and unroll. Every memory access goes through a simulated cache, so the miss counts are real for this toy.' },
            { t: 'widget', name: 'cacheLab', title: 'Schedule lab: a matrix multiply', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: [
                '1. Press **Naive**. Note the miss rate.',
                '2. Press **Swap loop order only**. No new arithmetic. What changes?',
                '3. Go back to naive. Keep the order i j k and use only tile sizes. Can you get under a 10% miss rate?',
                '4. Set vectorize to x4 while the order is i j k. Nothing changes. Why? Then switch to i k j and try again.',
                '5. Press **Show the best of all 9,000** and read the code it found.'
              ]
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: [
                '1. Naive i j k: **5,184 misses**, a **42%** miss rate, 118,976 estimated cycles.',
                '2. i k j with no tiling: **1,152 misses** (9.4%) and 42,368 cycles, **2.8x faster**, with the same arithmetic. In i j k the innermost loop walks down a column of B, which jumps 16 numbers each step, so every access lands on a different cache line, and the 16 lines a column needs do not stay in a cache that small. In i k j the innermost loop walks along rows, so four consecutive numbers share one line.',
                '3. Yes. With order i j k, 46 of the 125 tile combinations get below 10%. The best, tiles 16/4/8, reaches 448 misses (3.6%) and is **4.1x faster** than naive.',
                '4. Vectorizing only pays when the innermost loop walks memory in order, which here means the last loop variable is j. In i j k the last variable is k, so the setting is ignored. In i k j it applies.',
                '5. The best of the 9,000 schedules reaches **21,376 cycles, 5.6x faster than naive**: order i k j, tiles 16/8/4, vector x8, unroll x8.'
              ]
            }
          ]
        },
        {
          id: 'primitives',
          title: 'The schedule toolbox',
          min: 5,
          blocks: [
            { t: 'p', text: 'In the lab you used four schedule choices. TVM offers more, in five families. Each family exists because some kind of hardware has a feature worth using.' },
            {
              t: 'flip',
              hint: 'Click to see the detail',
              cards: [
                { front: 'Loop transformations', back: 'Split (tile), reorder, unroll, vectorize, run in parallel. They reshape loops for caches and SIMD units. You used four of them.\n\nReal life: doing every errand in one neighborhood before moving to the next.' },
                { front: 'Thread binding', back: 'Map loops onto the threads and blocks of a GPU, so many iterations run at the same time.\n\nReal life: assigning each cashier their own lane.' },
                { front: 'Memory scopes and caching', back: 'Decide where a chunk of data lives, for example in a GPU\'s fast shared memory, and copy it there once.\n\nReal life: carrying the textbooks to your table instead of walking to the shelf for every page.' },
                { front: 'Tensorization', back: 'Replace a block of loops with one hardware instruction that works on a small tensor. Part 5.\n\nReal life: dropping a tray of coins into a counting machine.' },
                { front: 'Latency hiding', back: 'Overlap memory loads with computing so the compute unit never waits. Part 5.\n\nReal life: starting the dryer on one load while the next load is in the washer.' }
              ]
            },
            { t: 'callout', kind: 'paper', body: 'The paper keeps Halide\'s separation and adds three things for deep learning hardware: special memory scopes so GPU threads can cooperate, tensorization for new hardware instructions, and latency hiding for accelerators that manage memory explicitly.' },
            {
              t: 'quiz',
              id: 'tvm-q12',
              q: 'Which schedule choice targets a chip\'s SIMD unit, the part that does the same operation on several adjacent numbers at once?',
              options: ['Tiling', 'Vectorization', 'Constant folding', 'Static memory planning'],
              answer: 1,
              whyNot: ['Tiling targets the cache by shrinking the working set.', null, 'Constant folding is a graph rewrite, not a schedule choice.', 'Memory planning is a graph-level pass.'],
              explain: 'Vectorization maps the innermost loop onto SIMD instructions.'
            }
          ]
        },
        {
          id: 'gpu-coop',
          title: 'GPUs: threads that cooperate',
          min: 6,
          blocks: [
            { t: 'p', text: 'A GPU runs thousands of threads. Threads in the same {{thread-block|block}} can share a small, fast memory called {{shared-memory|shared memory}}. If they **cooperate**, each loading one piece of the data that everyone needs, the whole block fetches far less from slow main memory.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'A study group of 16 students working from the same textbook chapter. Option 1: each student walks to the library for every page they need. Option 2: one student fetches a pile of pages, puts it on the table, and everyone reads from it. The library trips drop by about a factor of 16.'
            },
            { t: 'widget', name: 'sharedMemCalc', title: 'Cooperative loading', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Set N to 1024 and the tile to 1, then to 16. By what factor do the global loads fall?', '2. Try a tile of 128. What goes wrong?', '3. Which tile gives the biggest saving that still fits in shared memory?']
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: ['1. From about 2.1 billion loads to about 134 million: **16x fewer**, equal to the tile size.', '2. A 128 x 128 tile needs 128 KB of shared memory, over the toy limit of 48 KB. Shared memory is fast **because** it is small.', '3. A tile of 64 needs 32 KB and cuts global loads **64x**. A tile of 128 does not fit.']
            },
            { t: 'callout', kind: 'paper', body: 'In the paper, a schedule can place a chunk of data in a special memory scope, such as GPU shared memory, so that threads cooperate on loading it. TVM also inserts the synchronization barriers that make the cooperation safe, so the schedule writer does not.' },
            {
              t: 'quiz',
              id: 'tvm-q13',
              q: 'Why is shared memory limited in size?',
              options: ['It is fast because it is small and close to the compute units', 'Software cannot allocate more', 'It uses less power', 'Threads cannot read big arrays'],
              answer: 0,
              whyNot: [null, 'The limit is a hardware property, not a software one.', 'Power is not the issue here.', 'Threads can read big arrays. The point is where the data comes from.'],
              explain: 'Fast memory is expensive in chip area, so there is little of it. That is why choosing what goes in it matters.'
            }
          ]
        },
        {
          id: 'check4',
          title: 'Checkpoint: operators',
          min: 3,
          blocks: [
            {
              t: 'quiz',
              id: 'tvm-q14',
              q: 'Why does the same tensor expression need different schedules on a CPU and on a GPU?',
              options: ['They have different memory systems and different kinds of parallelism', 'The math is different on each', 'GPUs cannot run loops', 'CPUs cannot use caches'],
              answer: 0,
              whyNot: [null, 'The math is identical. Only the way it is carried out changes.', 'GPUs run loops fine, as threads working on slices of them.', 'CPUs rely on caches.'],
              explain: 'A good schedule uses the target\'s particular memory hierarchy and parallelism.'
            },
            {
              t: 'quiz',
              id: 'tvm-q15',
              q: 'Which of these change the schedule without changing the result? Select all that apply.',
              options: ['Loop order', 'Tile sizes', 'Vectorization', 'Replacing the sum with a max'],
              answer: [0, 1, 2],
              explain: 'Order, tiling and vectorization change how the same result is computed. Replacing the sum with a max changes the what, so it changes the result.'
            }
          ]
        }
      ]
    },

    /* ------------------------------ Part 5 ------------------------------ */
    {
      id: 'hardware',
      title: 'New hardware: tensor instructions and hidden latency',
      summary: 'How TVM targets accelerators that have their own instructions and explicit memory.',
      steps: [
        {
          id: 'tensorize',
          title: 'Tensorization',
          min: 6,
          blocks: [
            { t: 'p', text: 'Many accelerators have instructions that work on a small block of numbers at once, such as multiplying two small matrices in a single step. To use one, a compiler has to recognize a piece of your loop nest that matches the instruction and replace it. TVM calls this {{tensorization}}.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Counting coins. You can count them one at a time, or drop a tray of 64 into a coin-counting machine and get the answer in one go. The machine only works if the coins arrive in a tray of the right size. Tensorization is the step of packing your work into trays the machine accepts.'
            },
            { t: 'widget', name: 'tensorizeCalc', title: 'One instruction instead of many', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: ['1. Set N to 64 and the block to 1. How many instructions?', '2. Set the block to 8. By what factor do the instructions drop?', '3. Set N to 256 and the block to 16. What do you notice about the counts?']
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: ['1. 262,144 multiply-adds, one instruction each.', '2. 512 instructions, **512x fewer**. The factor is the block size cubed: 8 x 8 x 8 = 512.', '3. 16 million multiply-adds shrink to 4,096 instructions. The bigger the block the chip supports, the bigger the win, but your loop nest has to be shaped to match.']
            },
            { t: 'callout', kind: 'paper', body: 'The paper makes the set of instructions open-ended. A hardware designer declares an instruction by giving its **behavior** as a tensor expression and a **lowering rule** that says what code to emit. A schedule can then apply the tensorize primitive to a matching loop block. This is how TVM can support new accelerators without changing the compiler itself.' },
            {
              t: 'quiz',
              id: 'tvm-q16',
              q: 'To teach TVM a new tensor instruction, what does a designer provide?',
              options: ['The instruction\'s behavior as a tensor expression, and a rule for what code to emit', 'A new framework', 'A hand-written kernel for every operator', 'The training data'],
              answer: 0,
              whyNot: [null, 'The framework is not involved.', 'Avoiding per-operator hand-written kernels is the whole point.', 'TVM compiles models. It does not train them.'],
              explain: 'The behavior lets TVM recognize matching loop blocks. The lowering rule says how to emit the instruction.'
            }
          ]
        },
        {
          id: 'latency',
          title: 'Hiding memory latency',
          min: 7,
          blocks: [
            { t: 'p', text: 'Some accelerators have a **memory engine** and a **compute engine** that can run at the same time, but leave the programmer to coordinate them. If you issue work one step after another, one engine always sits idle. The fix is {{latency-hiding|latency hiding}}: load the next piece while computing the current one.' },
            {
              t: 'callout',
              kind: 'example',
              body: 'Laundry. If you wait for the washer to finish before starting the dryer, and wait for the dryer before starting the next wash, each machine is idle half the time. Start the second load in the washer while the first is in the dryer, and both machines stay busy.'
            },
            { t: 'p', text: 'TVM expresses this with {{virtual-thread|virtual threads}}. You write two independent streams of work. The compiler interleaves them into one instruction sequence and adds the explicit synchronization the hardware needs.' },
            { t: 'widget', name: 'latencyLab', title: 'Overlapping loads and compute', tag: 'Toy model, not from the paper' },
            {
              t: 'callout',
              kind: 'try',
              body: [
                '1. Keep the defaults (6 tiles, load 4, compute 3) with 1 virtual thread. How busy is the compute unit?',
                '2. Switch to 2 virtual threads. What changes?',
                '3. Set compute to 6 and load to 3. What is the utilization with 2 virtual threads?',
                '4. Set load to 8 and compute to 2. Can 2 virtual threads fix this?'
              ]
            },
            {
              t: 'reveal',
              label: 'Show what to notice',
              body: [
                '1. 42 time units in total. The compute unit is busy only 43% of the time.',
                '2. 27 units in total, 36% faster. The compute unit is busy 67% of the time.',
                '3. 39 units, and the compute unit is busy 92% of the time. The only part you cannot hide is the very first load.',
                '4. No. Loading takes 8 units per tile and computing 2, so the job is **memory-bound**: 50 units in total, with the compute unit busy only 24%. Overlapping can hide the faster engine behind the slower one. It cannot make the slower one faster.'
              ]
            },
            { t: 'callout', kind: 'paper', body: 'The paper describes this for accelerators that decouple loading from computing and need explicit synchronization. Virtual threading lets the schedule author write the streams separately. The compiler lowers them into a single instruction stream with the synchronization operations inserted.' },
            {
              t: 'quiz',
              id: 'tvm-q17',
              q: 'Loads take 8 units and compute takes 2. After overlapping with virtual threads, what limits the speed?',
              options: ['The memory engine', 'The compute engine', 'The number of virtual threads', 'The size of the cache'],
              answer: 0,
              whyNot: [null, 'The compute engine is mostly idle here.', 'Two threads already overlap everything that can overlap.', 'This model has no cache. The load time is the limit.'],
              explain: 'When loading is the slower side, the job runs at the speed of the memory engine.'
            }
          ]
        },
        {
          id: 'check5',
          title: 'Checkpoint: new hardware',
          min: 3,
          blocks: [
            {
              t: 'quiz',
              id: 'tvm-q18',
              q: 'Match the problem to the technique: the chip has a single instruction that multiplies two 8 x 8 blocks.',
              options: ['Tensorization', 'Latency hiding', 'Operator fusion', 'Constant folding'],
              answer: 0,
              whyNot: [null, 'Latency hiding overlaps loads with compute. It does not use special instructions.', 'Fusion works on graph operators, above the level of instructions.', 'Constant folding is a graph rewrite.'],
              explain: 'Using a special instruction for a block of loops is tensorization.'
            },
            {
              t: 'quiz',
              id: 'tvm-q19',
              q: 'Match the problem to the technique: the compute unit waits for data between steps.',
              options: ['Tensorization', 'Latency hiding', 'Operator fusion', 'Constant folding'],
              answer: 1,
              whyNot: ['Tensorization shrinks the instruction count. It does not overlap loads.', null, 'Fusion reduces trips to memory between operators, not waits within one.', 'Constant folding removes work at compile time.'],
              explain: 'Overlapping loads with compute so the unit never waits is latency hiding.'
            }
          ]
        }
      ]
    }
  ];
})();
