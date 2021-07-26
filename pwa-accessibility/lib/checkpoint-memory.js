const hash = require('object-hash');
// const hash = require('../node_modules/tlsh/lib/tlsh');
const DigestHashBuilder = require('../node_modules/tlsh/lib/digests/digest-hash-builder');
const files = require('./file-manager');

class Memory {
  testCounter = 0;

  constructor() {
    this.memory = {};
    this.ads = [];
  }

  generateHash = (content) => {
    return hash(content);
  }

  generateId = async(page) => {
    const content = await page.evaluate(() => document.body.innerHTML);
    return this.generateHash(content);
  }

  createCheckpoint = async(id, url, path) => {
    const digest = new DigestHashBuilder().withHash(id).build();

    this.memory[id] = {
      id,
      digest,
      prev: [],
      url,
      triggers: [],
      changes: [],
      next: [],
      path,
      tested: false
    };
  }

  updateCheckpoint = async(id, newPrev = [], changes = []) => {
    this.memory[id].prev.concat(newPrev);
    this.memory[id].changes.concat(changes);
  }

  saveCheckpoint = async(page, path) => {
    const id = await this.generateId(page);
    if (!this.hasCheckpointById(id)) {
      // const hasSimilar = await this.hasSimilarCheckpoint(id);
      // if (hasSimilar) {
      //   return -1;
      // }
      const url = await page.url();
      this.createCheckpoint(id, url, path);
    } else if (path.length < this.memory[id].path.length) {
      this.memory[id].path = path;
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
    if (id !== newNext.id && !this.memory[id].next.some(c => c.id === newNext.id)) {
      this.memory[id].next.push(newNext);
    }
  }

  updateCheckpointPrevById = (id, newPrev) => {
    if (id !== newPrev.id && !this.memory[id].prev.some(c => c.id === newPrev.id)) {
      this.memory[id].prev.push(newPrev);
    }
  }

  print = () => {
    console.log(this.memory);
    console.log(`Number of checkpoints: ${Object.keys(this.memory).length}`)
  }

  saveToFile = () => {
    files.storeData(this.memory, './results/data.json');
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
    this.testCounter++;

    return this.memory[id].tested;
  }

  delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hasSimilarCheckpoint = async(id) => {
    const digest = new DigestHashBuilder().withHash(id).build();
    const hasSimilar = await Object.keys(this.memory).some(otherId => {
        const other = this.memory[otherId];
        return digest !== other.digest &&
        this.areCheckpointsSimilar(digest, other.digest)
      });

    return hasSimilar;
  }

  areCheckpointsSimilar = (digest1, digest2) => {
    const difference = digest2.calculateDifference(digest1, true);
    return difference <= 3; // custom value, read more in https://github.com/idealista/tlsh-js
  }

  getCheckpointPathById = (id, path = []) => {
    const checkpoint = this.memory[id];
    path.push(checkpoint);

    if (checkpoint.rootDistance === 0) {
      return path;
    }

    let shortest;
    for (const prev in checkpoint.prev) {
      if (prev.rootDistance === 0) {
        path.push(prev);
        return path;
      } else if (!shortest || shortest.rootDistance > prev.rootDistance) {
        shortest = prev;
      }
    }

    return this.getCheckpointPathById(shortest.id, path);
  }

  // ads
  getKnownAds = () => {
    return this.ads;
  }

  addKnownAd = (ad) => {
    this.ads.push(ad);
  }

}
module.exports = new Memory();
