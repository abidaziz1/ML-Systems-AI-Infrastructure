/* Glossary for Paper 2. Keys are used in lesson text as {{key}} or {{key|shown text}}. */
(function () {
  'use strict';
  window.TVML = window.TVML || {};
  window.TVML.glossary = {
    compiler: {
      t: 'Compiler',
      d: 'A program that translates code from one form into another, usually a faster one. TVM takes a model and produces machine code for a specific chip.'
    },
    'computational-graph': {
      t: 'Computational graph',
      d: 'The model drawn as boxes (operators) and arrows (tensors flowing between them). It is the dataflow graph from Paper 1, used here as the input to a compiler.'
    },
    operator: {
      t: 'Operator',
      d: 'One node of the graph, such as a convolution, a matrix multiply or a ReLU. Paper 1 calls this an operation.'
    },
    kernel: {
      t: 'Kernel',
      d: 'The compiled code for one operator, or for several fused operators, launched on a device as one unit of work.'
    },
    'vendor-library': {
      t: 'Vendor library',
      d: 'A library from the chip maker, with hand-tuned code for common operators. cuDNN for NVIDIA GPUs and the ARM Compute Library for ARM chips are examples.'
    },
    cudnn: {
      t: 'cuDNN',
      d: 'NVIDIA\'s library of hand-tuned GPU routines for deep learning, such as convolutions.'
    },
    accelerator: {
      t: 'Accelerator',
      d: 'A chip built to run one kind of work very fast, such as a TPU or an FPGA design for neural networks.'
    },
    fpga: {
      t: 'FPGA',
      d: 'Field-programmable gate array: a chip whose circuits you can rewire after manufacturing. It can be set up to act as a custom accelerator.'
    },
    'operator-fusion': {
      t: 'Operator fusion',
      d: 'Merging several operators into one kernel, so intermediate results stay in fast on-chip memory and never travel to main memory and back.'
    },
    injective: {
      t: 'Injective operator',
      d: 'An operator where each output number depends on one input position, a one-to-one map. Add, scale and ReLU are examples.'
    },
    reduction: {
      t: 'Reduction operator',
      d: 'An operator that collapses many inputs into fewer outputs, such as a sum or a max over an axis.'
    },
    'complex-out-fusable': {
      t: 'Complex-out-fusable operator',
      d: 'An operator that is complicated on its own, but whose output can absorb simple element-wise operators. Conv2D is the standard example.'
    },
    opaque: {
      t: 'Opaque operator',
      d: 'An operator that cannot be fused with its neighbors, such as sort.'
    },
    'memory-bound': {
      t: 'Memory-bound',
      d: 'A kernel whose speed is limited by how fast data moves to and from memory, not by arithmetic. Simple element-wise operators are usually memory-bound.'
    },
    'compute-bound': {
      t: 'Compute-bound',
      d: 'A kernel whose speed is limited by arithmetic, not by memory. Large convolutions are usually compute-bound.'
    },
    'constant-folding': {
      t: 'Constant folding',
      d: 'Computing, at compile time, any part of the graph whose inputs are already known, so it does not run on every execution.'
    },
    'tensor-expression': {
      t: 'Tensor expression',
      d: 'A description of what to compute, written as arithmetic over index positions with no loops and no order. Compare: C[i][j] is the sum over k of A[i][k] times B[k][j].'
    },
    schedule: {
      t: 'Schedule',
      d: 'A list of transformations that says how to compute a tensor expression: how to split and reorder loops, which to vectorize, where to keep data. Same expression, many schedules.'
    },
    halide: {
      t: 'Halide',
      d: 'A language for image processing that first separated "what to compute" from "how to compute it". TVM builds on that idea for deep learning.'
    },
    cache: {
      t: 'Cache',
      d: 'A small, fast memory between the processor and main memory. It holds recently used data so a repeated access is cheap.'
    },
    'cache-miss': {
      t: 'Cache miss',
      d: 'An access to data that is not in the cache. The processor must fetch it from slower memory, which costs many times more than a hit.'
    },
    tiling: {
      t: 'Tiling',
      d: 'Splitting loops so the work is done in small blocks (tiles) whose data fits in the cache and gets reused before it is evicted.'
    },
    vectorization: {
      t: 'Vectorization',
      d: 'Using a SIMD instruction that does the same operation on several adjacent numbers at once, for example 4 or 8.'
    },
    unrolling: {
      t: 'Loop unrolling',
      d: 'Writing out several iterations of a loop body in a row, which cuts the cost of loop-control instructions.'
    },
    'shared-memory': {
      t: 'Shared memory',
      d: 'A small, fast memory on a GPU that all threads in one thread block can read and write. It is much faster than main (global) GPU memory.'
    },
    'thread-block': {
      t: 'Thread block',
      d: 'A group of GPU threads that run together on one processor and can cooperate through shared memory.'
    },
    tensorization: {
      t: 'Tensorization',
      d: 'Replacing a block of loops with a single hardware instruction that works on a small matrix or tensor at once.'
    },
    intrinsic: {
      t: 'Hardware intrinsic',
      d: 'A special instruction a chip provides, such as multiplying two small matrices in one step.'
    },
    'latency-hiding': {
      t: 'Latency hiding',
      d: 'Overlapping slow memory loads with computation, so the compute unit does not sit idle waiting for data.'
    },
    'virtual-thread': {
      t: 'Virtual thread',
      d: 'In TVM, an independent stream of work that you write separately. The compiler interleaves the streams into one instruction sequence so loads and compute overlap.'
    },
    'search-space': {
      t: 'Search space',
      d: 'The set of all schedules you could choose for one operator. It grows by multiplication with every new choice, so it gets enormous.'
    },
    'cost-model': {
      t: 'Cost model',
      d: 'Something that estimates how fast a schedule will run without running it. In TVM it is a machine learning model trained on measurements from the real device.'
    },
    autotvm: {
      t: 'AutoTVM',
      d: 'The part of TVM that searches for good schedules automatically, using a learned cost model and measurements on the real device.'
    },
    'rank-correlation': {
      t: 'Rank correlation',
      d: 'A number from -1 to 1 that says how well two lists agree on order. 1 means the same order, 0 means unrelated. A cost model needs a good order more than exact predictions.'
    },
    'boosted-trees': {
      t: 'Gradient-boosted trees',
      d: 'A model made of many small decision trees, each one correcting the mistakes of the ones before it. XGBoost is a popular implementation.'
    },
    'simulated-annealing': {
      t: 'Simulated annealing',
      d: 'A search method that wanders through possible choices, mostly moving to better ones but sometimes accepting a worse one, so it does not get stuck early.'
    },
    llvm: {
      t: 'LLVM',
      d: 'A widely used compiler toolkit that turns a low-level program into machine code for many kinds of CPU.'
    },
    'batch-norm': {
      t: 'Batch normalization',
      d: 'A layer that rescales its inputs to a standard range. At inference time it is just a simple per-number multiply and add.'
    }
  };
})();
