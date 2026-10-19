# Verification checklist for Paper 1

This lesson was written without a copy of the PDF open. Key numbers and claims were cross-checked against search results and secondary summaries, and anything that could not be confirmed was either softened or turned into a reading task for the student. Before you rely on the lesson, check the items below against the original paper: [arXiv 1605.08695](https://arxiv.org/abs/1605.08695).

Legend: **Checked** means a search result or secondary source agreed. **Memory** means it comes from prior knowledge and the paper's own text could not be reopened. Check every **Memory** item first.

## Numbers

- [ ] **Table 1, all 16 values** (lesson Part 10, "Single-machine benchmarks"). Columns are AlexNet / Overfeat / OxfordNet / GoogleNet, in milliseconds. Caffe 324 / 823 / 1068 / 1935. Neon 87 / 211 / 320 / 270. Torch 81 / 268 / 529 / 470. TensorFlow 81 / 279 / 540 / 445. *AlexNet column: Checked. The other 12 values: Memory.* They do agree with the paper's own text claims (faster than Caffe, within 6% of Torch, Neon faster on three of four).
- [ ] Table 1 hardware: six-core Intel Core i7-5930K and one NVIDIA Titan X. *Checked.* The lesson does not state the hardware. Add it if you want.
- [ ] Inception-v3 experiment: up to **200 workers**, **17 parameter-server tasks**, one **K40** GPU per worker. *Checked.*
- [ ] Synchronous step about **10% longer** than asynchronous at the median. *Checked.* The word "median" is from memory.
- [ ] Language model: **LSTM-512-512**, One Billion Word benchmark, vocabulary limited to **40,000** words, **512** sampled classes, softmax cost reduced by a factor of **78**. *Checked.*
- [ ] The lesson deliberately gives **no number** for the backup-worker speedup. Look it up and decide whether to add it.

## Structure and references

- [ ] Section numbers in the lesson's reading map (3.1 to 3.4, 4.1 to 4.4, 6 with four subsections). *Memory.* Other sections are referred to by name.
- [ ] Venue text: OSDI 2016, pages 265 to 283. *Checked.* Location and dates are not stated in the lesson.
- [ ] Author list (22 names, Google Brain). *Memory.*
- [ ] The paper's three design principles: primitive-operator graphs, deferred execution, a common abstraction for heterogeneous devices. The three device operations (issue a kernel, allocate memory, transfer buffers). *Checked via secondary sources.*

## Paraphrases of the paper

- [ ] The four DistBelief limits (Part 1). Written as a paraphrase from the introduction and background. Compare the wording. *Memory.*
- [ ] Two differences from batch dataflow: mutable state shared across executions, concurrent executions on overlapping subgraphs. *Memory, high confidence.*
- [ ] Variable and queue descriptions. *Memory, high confidence.*
- [ ] Partial execution (fetch, feed, transitive closure). *Memory, high confidence.*
- [ ] Master prunes, partitions and caches subgraphs; Send/Recv insertion. *Checked.*
- [ ] Placement: the lesson says the paper describes a placement step that picks a device per node and accepts user constraints. It does not claim a specific algorithm. Verify the wording.
- [ ] Send/Recv mechanisms by device pair (async CPU-GPU copy, direct GPU-GPU transfer, gRPC over TCP or RDMA over Converged Ethernet). *Checked.*
- [ ] Layer list in the "layered runtime" widget, including more than 200 standard operations, Eigen::Tensor, cuDNN, gemmlowp. *Checked.* The "restaurant" mapping is ours.
- [ ] Automatic differentiation as a user-level library that adds graph nodes. *Checked.*
- [ ] "The paper lists GPU memory pressure from gradient computation as a practical issue." Confirm in the differentiation section. *Partly checked.*
- [ ] Sharded embeddings use Gather, Part and Stitch operations (embedding figure). *Memory.*
- [ ] Three synchronization schemes and the backup-worker idea, credited to "Revisiting Distributed Synchronous SGD" (arXiv 1604.00981). *Checked.*
- [ ] Fault tolerance with Save and Restore operations and user-level checkpointing. *Checked.* The remark that you can restore only some variables is our inference.
- [ ] Control-flow primitives: Switch, Merge, Enter, Leave, NextIteration. *Memory, high confidence.* The lesson also says the paper explains how loops work across devices. Verify.
- [ ] The "claims versus evidence" table in Part 10. The "Our read" column is opinion. The lesson tells students to check whether any other system is measured at the 200-worker scale, because we could not confirm either way.

## Later developments (not in the paper)

- [ ] TensorFlow 2 made eager execution the default (2019). *Memory, high confidence.*
- [ ] Recomputing activations: Chen et al., "Training Deep Nets with Sublinear Memory Cost" (arXiv 1604.06174). *Memory.*
- [ ] Links between this paper and the other reading-list papers (Part 11). These are our framing of the list you provided.

## Toy models (invented, not from the paper)

These are labeled "Toy model" in the lesson. Their numbers are not results.

- Input pipeline and queue (queueSim)
- Placement lab (placementLab), including its 1 ms per MB cost
- Asynchronous, synchronous and backup workers (syncSim)
- Checkpoint interval (checkpointLab), including the half-step save cost
- Activation memory and recomputation (activationMemory), including the 12 GB GPU
