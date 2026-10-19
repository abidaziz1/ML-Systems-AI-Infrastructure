# Verification checklist for Paper 2

This lesson was written without a copy of the PDF open. Key facts were cross-checked against search results and secondary sources. Anything that could not be confirmed was softened, or turned into a reading task for the student. Before you rely on the lesson, check the items below against the original paper: [arXiv 1802.04799](https://arxiv.org/abs/1802.04799).

Legend: **Checked** means a search result or secondary source agreed. **Memory** means it comes from prior knowledge and the paper's own text could not be reopened. Check every **Memory** item first.

## Numbers

- [ ] **Headline result: speedups of 1.2x to 3.8x** over frameworks backed by hand-optimized libraries. Used in Part 7 and the final quiz. *Checked.* Confirm the exact wording and which hardware it covers.
- [ ] **FPGA case study:** a generic accelerator on a PYNQ board with a dual-core ARM Cortex-A9, a 16 x 16 matrix-vector unit at 200 MHz, about 102.4 GOPS at peak. Most convolution layers offloaded. The first convolution and unsupported operators stay on the CPU. *Checked.* (The peak figure is consistent: 256 multiply-adds x 2 operations x 200 MHz = 102.4 billion.)
- [ ] **Evaluation hardware and baselines:** Titan X against MXNet, TensorFlow and TensorFlow XLA; ARM Cortex-A53 against TensorFlow Lite; ARM Mali-T860MP4 against the ARM Compute Library. *Checked* through the companion AutoTVM paper and slides. Confirm they match the OSDI paper.
- [ ] **Workloads:** ResNet-18, MobileNet, LSTM language model, DQN, DCGAN. *Checked.* The lesson says not every workload runs on every platform. Confirm which ones appear where.
- [ ] The lesson gives **no numbers for the fusion speedup**, the learned-model comparison figure, or per-platform speedups. Look them up and decide whether to add them. The fusion lab asks students to find the figure.
- [ ] Venue: OSDI 2018, pages 578 to 594. *Checked.* Author list (12 names). *Memory.*

## Structure and references

- [ ] Section numbers in the reading map (2 Overview, 3 graphs, 4.1 to 4.4, 5, 6). *Memory.* Other sections are referred to by name.

## Paraphrases of the paper

- [ ] The two challenges (using hardware-specific features; a huge search space). Written as a paraphrase of the introduction. *Memory.*
- [ ] The **four operator categories** (injective, reduction, complex-out-fusable, opaque) and the fusion rules. *Checked* against the TVM documentation and discussion threads, which say the paper has four kinds. Confirm the exact rule wording in Section 3.
- [ ] Constant folding, static memory planning, data layout transformation. *Memory, high confidence.*
- [ ] Halide as the source of the what and how split. *Checked.* The three additions TVM makes (memory scopes for cooperation, tensorization, latency hiding). *Memory, high confidence.*
- [ ] Barriers inserted automatically for cooperative shared-memory loading. *Memory.*
- [ ] Tensor intrinsics declared by behavior (a tensor expression) plus a lowering rule. *Memory.*
- [ ] Virtual threading lowered to a single instruction stream with explicit synchronization, for accelerators that decouple loading from compute. *Memory.*
- [ ] The cost model: gradient-boosted trees built on XGBoost, a ranking objective, features from loop structure and memory access counts, parallel simulated annealing, a device pool over RPC. *Simulated annealing: Checked. The rest: Memory.*
- [ ] The table contrasting black-box tuning, predefined cost models and learned cost models. It is our summary. Compare with the comparison the paper makes.
- [ ] "In the system the paper describes, a person writes the schedule template for each operator." *Memory,* and consistent with how the Ansor paper describes AutoTVM.
- [ ] Code generation targets named in the pipeline walkthrough: LLVM, CUDA, OpenCL, Metal. *Memory.*
- [ ] TVM is open source and in production use at several major companies. *Checked.*
- [ ] The Python snippet in Part 4 uses TVM API names from the paper's era (`tvm.placeholder`, `tvm.compute`, `tvm.create_schedule`, `tile`, `vectorize`). It is our own example, not the paper's listing. Newer TVM uses different names.

## Later developments (not in the paper)

- [ ] Ansor removes hand-written templates; Triton is a tile-based GPU language; MLIR uses several levels of representation; FlashAttention fuses and tiles attention by hand; XLA is TensorFlow's compiler; TVM became an Apache project and its representations changed. *Memory, high confidence.*
- [ ] References: AutoTVM paper (arXiv 1805.08166, *Checked*), XGBoost (arXiv 1603.02754, *Checked*), Halide (PLDI 2013, *Memory*).

## Toy models (invented, not from the paper)

These are labeled "Toy model" in the lesson. Their numbers are not results.

- **Kernel counter** and **search-space counter** (productCalc): invented sizes and a 2-week or 1-second cost per item.
- **Fusion lab** (fusionLab): the four categories and rules are the paper's. The chip (4 teraflops, 250 GB/s, 5 microsecond launches) and the operator costs are invented.
- **Schedule lab** (cacheLab and sim.js): a real cache simulation, but a 16 x 16 matrix, a 16-line fully associative cache, 20-cycle misses, and simple rules for vectorizing and unrolling.
- **Cooperative loading** (sharedMemCalc), **tensorization** (tensorizeCalc), **latency hiding** (latencyLab): simple counting models.
- **Cost model lab** (costModelLab): 40 small gradient-boosted trees on the simulated schedule space. It compares the model only with random picks.
- **Search strategies experiment** (`experiments/search-strategies.cjs`): reproduces the sentence in Part 6 about annealing versus the model on the toy space. Rerun it to check the numbers (10 runs per strategy).
