const hash = require('object-hash');
const files = require('./file-manager');

class Memory {
  constructor() {
    this.memory = {};
  }

  generateHash = (content) => {
    return hash(content);
  }

  generateId = async(page) => {
    const content = await page.evaluate(() => document.body.innerHTML);
    return this.generateHash(content);
  }

  createCheckpoint = async(id, url, prev = [], changes = []) => {
    this.memory[id] = {
      id,
      prev: prev,
      url,
      triggers: [],
      changes,
      next: [],
      tested: false
    };
  }

  updateCheckpoint = async(id, newPrev = [], changes = []) => {
    if (newPrev) {
      this.memory[id].prev.concat(newPrev);
    }
    this.memory[id].changes.concat(changes);
  }

  saveCheckpoint = async(page, prev, changes = []) => {
    const id = await this.generateId(page);
    const prevArr = prev ? [prev] : [];
    if (!this.hasCheckpointById(id)) {
      const url = await page.url();
      this.createCheckpoint(id, url, prevArr, changes);
    } else {
      this.updateCheckpoint(id, prevArr, changes);
    }
    return id;
  }

  hasCheckpointByPage = async(page) => {
    const id = await this.generateId(page);
    return this.memory[id] !== undefined;
  }

  hasCheckpointById = (id) => {
    return this.memory[id] !== undefined;
  }

  getCheckpointById = (id) => {
    return this.memory[id];
  }

  getCheckpointTriggersById = (id) => {
    return this.memory[id].triggers;
  }

  updateCheckpointTriggersById = (id, triggers) => {
    this.memory[id].triggers = triggers;
  }

  updateCheckpointNextById = (id, newNext) => {
    this.memory[id].next.push(newNext);
  }

  print = () => {
    console.log(this.memory);
  }

  saveToFile = () => {
    files.storeData(this.memory, './data.json');
  }

  getCheckpointsNotTested = () => {
    const result = [];

    for (let checkpointId in this.memory) {
      if (!this.memory[checkpointId].tested) {
        result.push(checkpointId);
      }
    }

    return result;
  }

  isCheckpointTested = (id) => {
    return this.memory[id].tested;
  }
}
module.exports = new Memory();
