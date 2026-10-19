/*
 * catalog.js
 * The 24-paper reading list. To publish a lesson, set `lesson` to its folder (for example
 * 'papers/01-tensorflow/') and `id` to the id used inside that lesson's lesson.js.
 * `starter: true` marks the "if you can only read 10 first" list.
 * Foundations: compilers | runtime | distributed | serving
 */
(function () {
  'use strict';
  window.MLS = window.MLS || {};

  window.MLS.foundations = {
    compilers: 'Compilers',
    runtime: 'Runtimes and memory',
    distributed: 'Distributed ML',
    serving: 'Inference and serving'
  };

  window.MLS.tiers = [
    { id: 't1', title: 'Tier 1: Mandatory', blurb: 'Twelve papers that cover all four foundations. Start here.' },
    { id: 't2', title: 'Tier 2: Memory and constrained inference', blurb: 'What to do when the model does not fit in GPU memory.' },
    { id: 't3', title: 'Tier 3: Scheduling and modern serving', blurb: 'How current LLM serving systems schedule work.' },
    { id: 't4', title: 'Tier 4: Distributed training and parallelism', blurb: 'Splitting one model across many GPUs.' },
    { id: 't5', title: 'Tier 5: 2026 frontier (read last)', blurb: 'Recent MLSys 2026 work. Read these after the foundations.' }
  ];

  window.MLS.papers = [
    { n: 1, tier: 't1', f: 'distributed', starter: true, title: 'TensorFlow: A System for Large-Scale Machine Learning', authors: 'Abadi et al.', venue: 'OSDI 2016', id: 'tensorflow-osdi16', lesson: 'papers/01-tensorflow/' },
    { n: 2, tier: 't1', f: 'compilers', starter: true, title: 'TVM: An Automated End-to-End Optimizing Compiler for Deep Learning', authors: 'Chen et al.', venue: 'OSDI 2018', id: 'tvm-osdi18', lesson: 'papers/02-tvm/' },
    { n: 3, tier: 't1', f: 'compilers', starter: true, title: 'Triton: An Intermediate Language and Compiler for Tiled Neural Network Computations', authors: 'Tillet et al.', venue: 'MAPL / PLDI 2019' },
    { n: 4, tier: 't1', f: 'compilers', starter: true, title: 'Ansor: Generating High-Performance Tensor Programs for Deep Learning', authors: 'Zheng et al.', venue: 'OSDI 2020' },
    { n: 5, tier: 't1', f: 'compilers', title: 'MLIR: Scaling Compiler Infrastructure for Domain Specific Computation', authors: 'Lattner et al.', venue: 'CGO 2021' },
    { n: 6, tier: 't1', f: 'serving', title: 'Serving DNNs like Clockwork: Performance Predictability from the Bottom Up', authors: 'Gujarati et al.', venue: 'OSDI 2020' },
    { n: 7, tier: 't1', f: 'distributed', starter: true, title: 'ZeRO: Memory Optimizations Toward Training Trillion Parameter Models', authors: 'Rajbhandari et al.', venue: 'SC 2020' },
    { n: 8, tier: 't1', f: 'distributed', title: 'Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM', authors: 'Narayanan et al.', venue: '2021' },
    { n: 9, tier: 't1', f: 'distributed', starter: true, title: 'Alpa: Automating Inter- and Intra-Operator Parallelism for Distributed Deep Learning', authors: 'Zheng et al.', venue: 'OSDI 2022' },
    { n: 10, tier: 't1', f: 'serving', starter: true, title: 'Orca: A Distributed Serving System for Transformer-Based Generative Models', authors: 'Yu et al.', venue: 'OSDI 2022' },
    { n: 11, tier: 't1', f: 'runtime', starter: true, title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', authors: 'Dao et al.', venue: 'NeurIPS 2022' },
    { n: 12, tier: 't1', f: 'runtime', starter: true, title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention', authors: 'Kwon et al.', venue: 'SOSP 2023' },
    { n: 13, tier: 't2', f: 'runtime', title: 'FlexGen: High-Throughput Generative Inference of Large Language Models with a Single GPU', authors: 'Sheng et al.', venue: 'ICML 2023' },
    { n: 14, tier: 't2', f: 'runtime', title: 'vAttention: Dynamic Memory Management for Serving LLMs without PagedAttention', authors: 'Prabhu et al.', venue: '2024' },
    { n: 15, tier: 't3', f: 'serving', title: 'Sarathi-Serve: Taming Throughput-Latency Tradeoff in LLM Inference', authors: 'Agrawal et al.', venue: 'OSDI 2024' },
    { n: 16, tier: 't3', f: 'serving', starter: true, title: 'DistServe: Disaggregating Prefill and Decoding for Goodput-Optimized LLM Serving', authors: 'Zhong et al.', venue: 'OSDI 2024' },
    { n: 17, tier: 't3', f: 'serving', title: 'Splitwise: Efficient Generative LLM Inference Using Phase Splitting', authors: 'Patel et al.', venue: 'ISCA 2024' },
    { n: 18, tier: 't3', f: 'serving', title: 'SGLang: Efficient Execution of Structured Language Model Programs', authors: 'Zheng et al.', venue: '2023 / 2024' },
    { n: 19, tier: 't4', f: 'distributed', title: 'Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism', authors: 'Shoeybi et al.', venue: '2019' },
    { n: 20, tier: 't4', f: 'distributed', title: 'Alpa (revisit for parallelism reasoning)', authors: 'Zheng et al.', venue: 'OSDI 2022', revisit: 9 },
    { n: 21, tier: 't5', f: 'runtime', title: 'Efficient, VRAM-Constrained xLM Inference on Clients', authors: '', venue: 'MLSys 2026' },
    { n: 22, tier: 't5', f: 'runtime', title: 'SkipKV: Selective Skipping of KV Generation and Storage for Efficient Inference with Large Reasoning Models', authors: '', venue: 'MLSys 2026' },
    { n: 23, tier: 't5', f: 'serving', title: 'MorphServe: Efficient and Workload-Aware LLM Serving via Runtime Quantized Layer Swapping and KV Cache Resizing', authors: '', venue: 'MLSys 2026' },
    { n: 24, tier: 't5', f: 'serving', title: 'SHIP: SRAM-Based Huge Inference Pipelines for Fast LLM Serving', authors: '', venue: 'MLSys 2026' }
  ];
})();
