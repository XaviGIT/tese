const fs = require('fs');

const ANALYSIS_PATH = './results/analysis';
const EVALUATIONS_PATH = './results/evaluation';

const storeData = (data, path) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
}

const loadData = (path) => {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch (err) {
    console.error(err)
    return false
  }
}

const saveAnalysis = (data) => {
  storeData(data, `${ANALYSIS_PATH}/data.json`);
}

const saveEvaluation = (data) => {
  storeData(data, `${EVALUATIONS_PATH}/result.json`);
}

module.exports = {
  storeData,
  loadData,
  saveAnalysis,
  saveEvaluation
}