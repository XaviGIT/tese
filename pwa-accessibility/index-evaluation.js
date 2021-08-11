const evaluator = require('./lib/evaluator');
const beep = require('node-beep');

(async () => {
  console.time('all checkpoints evaluation');

  await evaluator.evaluateCheckpointsFile(__dirname+'/results/analysis/data.json');

  console.timeEnd('all checkpoints evaluation');
  beep(1);
})();
