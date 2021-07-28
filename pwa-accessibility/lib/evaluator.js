const fs = require('fs');
const puppeteer = require('puppeteer');
const worker = require('worker_threads');
const { Dom } = require('@qualweb/dom');
const { Evaluation } = require('@qualweb/evaluation/dist/index');
const { ACT, WCAG } = require('@qualweb/core/dist/index');
const { triggerEvent } = require('./event-generator');
const {
  NON_HEADLESS_CONFIG,
  HEADLESS_CONFIG,
  TEST_PAGE_URL
} = require('./constants.ts');

const evaluateCheckpointsFile = async(path) => {
  return await readFile(path);
}

const readFile = async(path) => {
  console.info(`Reading file ${path}`);
  const raw = fs.readFileSync(path, 'utf8');
  try {
    const data = JSON.parse(raw);
    const checkpoints = Object.keys(data);
    const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);
    await Promise.all(checkpoints.map(async (checkpointId) => {
      await evaluateCheckpoint(browser, data[checkpointId])
    }));
    browser.close();
  } catch (err) {
    console.err(`Couldn't read file ${path}`);
  }
}

const navigateToCheckpoint = async(page, checkpoint) => {
  return await checkpoint.path.reduce(async (memo, state) => {
    await memo;
    await triggerEvent(page, state.trigger);
    await new Promise(resolve => setTimeout(resolve, 2500));
  }, undefined);
}

const preparePage = async(page) => {
  await page.addScriptTag({
    path: require.resolve('@qualweb/qw-page/dist/qw-page.bundle.js'),
    type: 'text/javascript'
  });

  await page.addScriptTag({
    path: require.resolve('@qualweb/util/dist/util.bundle.js'),
    type: 'text/javascript'
  });

  await page.addScriptTag({
    path: require.resolve('@qualweb/act-rules/dist/act.bundle.js'),
    type: 'text/javascript'
  });

  await page.addScriptTag({
    path: require.resolve('@qualweb/wcag-techniques/dist/wcag.bundle.js'),
    type: 'text/javascript'
  });
}

const executeACT = async(page) => {
  return await page.evaluate(() => {
    window.act.executeAtomicRules();
    window.act.executeCompositeRules();
    return window.act.getReport();
  });
}

const executeWCAG = async(page) => {
  return await page.evaluate(() => {
    const html = new WCAG.WCAGTechniques();
    return html.execute(false);
  });
};

const evaluateCheckpoint = async(browser, checkpoint) => {
  const page = await browser.newPage();
  await page.goto(TEST_PAGE_URL, { waitUntil: 'networkidle2' });
  await navigateToCheckpoint(page, checkpoint);

  await preparePage(page);
  checkpoint.evaluations = new Array();
  checkpoint.evaluations.push(await executeACT(page));
  checkpoint.evaluations.push(await executeWCAG(page));

  await page.close();
}

module.exports = {
  evaluateCheckpointsFile,
  evaluateCheckpoint
}