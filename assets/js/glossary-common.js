/*
 * glossary-common.js
 * Terms that appear in many lessons. A lesson can add its own terms or override these.
 * Use {{key}} or {{key|shown text}} inside any lesson text to link a word to its entry.
 */
(function () {
  'use strict';
  window.MLS = window.MLS || {};
  window.MLS.commonGlossary = {
    gpu: {
      t: 'GPU',
      d: 'Graphics Processing Unit. A chip with thousands of small cores that run many simple arithmetic operations at the same time. Neural networks are mostly simple arithmetic repeated millions of times, so GPUs train them far faster than a CPU.'
    },
    cpu: {
      t: 'CPU',
      d: 'Central Processing Unit. The general-purpose chip in every computer. It has few, powerful cores and handles branching logic well, but it does fewer operations at once than a GPU.'
    },
    latency: {
      t: 'Latency',
      d: 'How long one request or one step takes from start to finish, for example 40 ms. Lower is better.'
    },
    throughput: {
      t: 'Throughput',
      d: 'How much work finishes per unit of time, for example 2,000 images per second. Higher is better. A system can have good throughput and bad latency at the same time.'
    },
    bandwidth: {
      t: 'Bandwidth',
      d: 'How much data a link (a network cable, or the connection between GPU and CPU) can move per second.'
    },
    cluster: {
      t: 'Cluster',
      d: 'A group of machines connected by a network and used together as one system.'
    },
    straggler: {
      t: 'Straggler',
      d: 'A worker that is much slower than the others in a given step. In a system where everyone must wait for everyone, one straggler slows the whole group.'
    },
    'neural-network': {
      t: 'Neural network',
      d: 'A model built from layers of simple math operations. Each layer multiplies its input by learned numbers (parameters), adds an offset, and applies a simple function such as ReLU.'
    },
    parameter: {
      t: 'Parameter (weight)',
      d: 'A number inside the model that training adjusts. A small image model has millions of them. A large language model has billions.'
    },
    loss: {
      t: 'Loss',
      d: 'One number that says how wrong the model is on the examples it just saw. Training tries to make it smaller.'
    },
    gradient: {
      t: 'Gradient',
      d: 'For each parameter, a number that tells you how much the loss changes if you nudge that parameter up a little. You move each parameter a small step in the opposite direction to reduce the loss.'
    },
    sgd: {
      t: 'SGD (stochastic gradient descent)',
      d: 'The basic training loop: take a small batch of examples, compute the loss, compute the gradient, change every parameter a little bit against its gradient, repeat. Almost all deep learning training is a variation of this.'
    },
    batch: {
      t: 'Batch',
      d: 'A small group of examples processed together in one training step, for example 32 images. Bigger batches use the hardware better but give fewer updates per hour.'
    },
    training: {
      t: 'Training',
      d: 'Adjusting a model\'s parameters using example data until its predictions are good. Slow and expensive. Done once (or occasionally).'
    },
    inference: {
      t: 'Inference',
      d: 'Using a trained model to make predictions on new inputs. Fast, repeated many times, and often needs low latency.'
    }
  };
})();
