/* Glossary for Paper 1. Keys are used in lesson text as {{key}} or {{key|shown text}}. */
(function () {
  'use strict';
  window.TFL = window.TFL || {};
  window.TFL.glossary = {
    distbelief: {
      t: 'DistBelief',
      d: 'Google\'s earlier system for training large neural networks on clusters of machines, built around a parameter server. TensorFlow was designed as its more flexible successor.'
    },
    'parameter-server': {
      t: 'Parameter server',
      d: 'A group of machines that stores the model\'s parameters and applies updates. Workers read parameters from it and send gradients back to it.'
    },
    worker: {
      t: 'Worker',
      d: 'A process that does computation. In parameter-server training, each worker computes gradients on its own slice of the data. In TensorFlow, a worker process also manages the devices on its machine.'
    },
    'dataflow-graph': {
      t: 'Dataflow graph',
      d: 'A drawing of a computation as boxes (operations) joined by arrows (the tensors that flow from one operation to the next). An operation can start as soon as all its incoming arrows have data.'
    },
    tensor: {
      t: 'Tensor',
      d: 'A multi-dimensional array. A single number, a list, a table and a stack of images are tensors with 0, 1, 2 and 4 dimensions. In the paper, tensors are what flows along the edges.'
    },
    operation: {
      t: 'Operation (op)',
      d: 'A named, abstract computation such as MatMul or Add. It takes tensors in and produces tensors out. It says what to compute, not how.'
    },
    kernel: {
      t: 'Kernel',
      d: 'A specific implementation of an operation for one kind of device. MatMul has one kernel for CPUs and another for GPUs.'
    },
    device: {
      t: 'Device',
      d: 'Something that can run kernels, such as a set of CPU cores or one GPU card.'
    },
    task: {
      t: 'Task',
      d: 'A named process in a TensorFlow cluster that can exchange messages over the network and owns one or more devices.'
    },
    master: {
      t: 'Master',
      d: 'The process that takes a Run request from the client, decides what needs to run, splits the graph into pieces per device, and coordinates the workers.'
    },
    variable: {
      t: 'Variable',
      d: 'A node that owns a mutable buffer, such as a model\'s parameters. Unlike ordinary values in a graph, it keeps its contents between Run calls.'
    },
    queue: {
      t: 'Queue',
      d: 'A node with a first-in, first-out line inside. One part of the graph puts items in (enqueue) and another takes them out (dequeue). It lets parts of the graph run at different speeds.'
    },
    session: {
      t: 'Session',
      d: 'The client\'s connection to the TensorFlow runtime. You use it to add nodes to the graph and to run parts of it.'
    },
    fetch: {
      t: 'Fetch',
      d: 'The outputs you ask a Run call to compute and return. TensorFlow runs only the nodes those outputs depend on.'
    },
    feed: {
      t: 'Feed',
      d: 'A tensor you supply yourself in a Run call, in place of a node\'s output. Everything upstream of a fed node is skipped.'
    },
    placement: {
      t: 'Placement',
      d: 'Choosing which device runs each node of the graph.'
    },
    'send-recv': {
      t: 'Send and Recv',
      d: 'A pair of nodes TensorFlow inserts where a graph edge crosses from one device to another. Send puts the tensor on the wire, Recv takes it off.'
    },
    'data-parallel': {
      t: 'Data parallelism',
      d: 'Every worker holds a full copy of the model and processes a different slice of the data. Their results are combined.'
    },
    'model-parallel': {
      t: 'Model parallelism',
      d: 'The model itself is split across devices because it is too large for one. Each device holds a piece.'
    },
    asynchronous: {
      t: 'Asynchronous training',
      d: 'Workers push gradients whenever they finish and never wait for each other. Fast, but a gradient may have been computed from parameters that are already out of date.'
    },
    synchronous: {
      t: 'Synchronous training',
      d: 'All workers start each step from the same parameters, and the update is applied only after every worker has reported. Fresh, but the slowest worker sets the pace.'
    },
    'backup-workers': {
      t: 'Backup workers',
      d: 'Extra workers in synchronous training. Each round uses the first gradients to arrive and drops the rest, so a straggler no longer delays the step.'
    },
    stale: {
      t: 'Stale gradient',
      d: 'A gradient computed from parameters that other workers have since changed. The bigger the gap, the less accurate the gradient is for the current model.'
    },
    embedding: {
      t: 'Embedding',
      d: 'A learned vector for each item in a large set, such as each word in a vocabulary. They are stored as the rows of a big table, and a lookup by id returns the row.'
    },
    shard: {
      t: 'Shard',
      d: 'One piece of a large table or tensor that has been split across machines.'
    },
    checkpoint: {
      t: 'Checkpoint',
      d: 'A saved copy of the model\'s variables. After a crash you reload the latest checkpoint and continue from there instead of starting over.'
    },
    autodiff: {
      t: 'Automatic differentiation',
      d: 'Computing gradients mechanically from the structure of a computation, so you never derive them by hand. In TensorFlow it adds gradient nodes to the graph.'
    },
    activation: {
      t: 'Activation',
      d: 'The output of a layer for the current batch. The backward pass needs many of them, so they stay in memory until it uses them.'
    },
    'control-flow': {
      t: 'Dynamic control flow',
      d: 'Conditionals and loops inside the graph, so the amount of work can depend on the data (for example, the length of a sentence).'
    },
    eigen: {
      t: 'Eigen',
      d: 'A C++ template library for linear algebra. TensorFlow uses its tensor module to write many kernels that run efficiently on multicore CPUs and GPUs.'
    },
    cudnn: {
      t: 'cuDNN',
      d: 'NVIDIA\'s library of fast GPU routines for deep learning, such as convolutions.'
    },
    gemmlowp: {
      t: 'gemmlowp',
      d: 'A library for matrix multiplication with low-precision numbers (such as 8-bit integers). Used for quantized, cheaper inference.'
    },
    grpc: {
      t: 'gRPC',
      d: 'A framework for calling functions on another machine over the network.'
    },
    rdma: {
      t: 'RDMA',
      d: 'Remote direct memory access: a network card reads or writes another machine\'s memory without involving that machine\'s CPU, which makes transfers fast.'
    },
    tpu: {
      t: 'TPU',
      d: 'Tensor Processing Unit: a custom chip Google built for neural network math.'
    },
    quantization: {
      t: 'Quantization',
      d: 'Storing and computing with lower-precision numbers (for example 8-bit integers instead of 32-bit floats) to save memory and time, at a small cost in accuracy.'
    },
    convnet: {
      t: 'Convolutional network',
      d: 'A neural network for images that slides small filters over the picture. AlexNet, Overfeat, OxfordNet (VGG-style) and GoogleNet are convolutional networks.'
    },
    softmax: {
      t: 'Softmax layer',
      d: 'The last layer of a classifier or language model. It turns scores for every possible class (or every word in the vocabulary) into probabilities. With a 40,000-word vocabulary it is expensive.'
    },
    eager: {
      t: 'Eager execution',
      d: 'Running each operation immediately as your code reaches it, instead of first building a graph. It is easier to debug and is how most research code is written today.'
    },
    xla: {
      t: 'XLA',
      d: 'A compiler that takes a TensorFlow graph and generates fast code for CPUs, GPUs and TPUs. It is later work, not part of the 2016 paper.'
    }
  };
})();
