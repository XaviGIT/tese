const hash = require('object-hash');

let memory = {};

const generateHash = (content) => {
  return hash(content);
}

const saveNewCheckpoint = async (page) => {
  const content = await page.$eval('body', element => element);
  const url = await page.url();
  const id = generateHash(content);
  if (!memory[id]) {
    memory[id] = {
      prev: [],
      // content: page,
      url,
      triggers: [],
      next: []
    };
  }

  return id;
}

const updateCheckpointTriggers = (id, triggers) => {
  memory[id].triggers = triggers;
}

const getCheckpoint = (id) => {
  return memory[id];
}

const getCheckpointTriggers = (id) => {
  return memory[id].triggers;
}

module.exports = {
  saveNewCheckpoint,
  updateCheckpointTriggers,
  getCheckpoint,
  getCheckpointTriggers
}
