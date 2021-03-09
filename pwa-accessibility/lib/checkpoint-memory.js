const hash = require('object-hash');

let memory = {};

const generateHash = (page) => {
  return hash(page);
}

const initializeMemory = () => {
  memory = {};
  return memory;
}

const saveCheckpoint = (page) => {
  const id = generateHash(page);
  memory[id] = page;
}

module.exports = {
  initializeMemory,
  saveCheckpoint
}
