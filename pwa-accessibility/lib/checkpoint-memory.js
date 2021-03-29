const hash = require('object-hash');

let memory = {};

const generateHash = (content) => {
  return hash(content);
}

const saveNewCheckpoint = async (page) => {
  const content = await page.$eval('body', element => element);
  const id = generateHash(content);
  memory[id] = {
    prev: null,
    content: page,
    triggers: [],
    next: []
  };

  return id;
}

const updateCheckpointTriggers = (id, triggers) => {
  memory[id].triggers = triggers;
}

const getCheckpointTriggers = (id) => {
  return memory[id].triggers;
}

module.exports = {
  saveNewCheckpoint,
  updateCheckpointTriggers,
  getCheckpointTriggers
}
