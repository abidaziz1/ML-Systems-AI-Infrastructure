/* Paper 1 lesson: assembles the glossary and the parts, then starts the player. */
MLS.start({
  id: 'tensorflow-osdi16',
  number: 1,
  short: 'TensorFlow',
  title: 'TensorFlow: A System for Large-Scale Machine Learning',
  home: '../../index.html',
  glossary: window.TFL.glossary,
  parts: [].concat(window.TFL.p1, window.TFL.p2, window.TFL.p3)
});
