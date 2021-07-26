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
    const test = Object.keys(data)[1];
    console.log(test)
    return evaluateCheckpoint(data[test]);
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

}

const evaluateCheckpoint = async(checkpoint) => {
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);
  const page = await browser.newPage();
  await page.goto(TEST_PAGE_URL, { waitUntil: 'networkidle2' });
  await navigateToCheckpoint(page, checkpoint);

  const executeWCAG = async(validation, options) => {
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

    // const newTabWasOpen = await this.detectIfUnwantedTabWasOpened();
    const newTabWasOpen = false;

    return await page.evaluate(
      (newTabWasOpen, validation, options) => {
        // if (options) {
        //   window.wcag.configure(options);
        // }

        // window.wcag = new WCAG.WCAGTechniques(options);
        // return window.wcag.execute(newTabWasOpen, validation);
        window.act.executeAtomicRules();
        return window.act.getReport();
      },
      newTabWasOpen,
      (validation ?? null),
      options
    );
  };

  const validation = undefined;
  const options = {
    "wcag-techniques": {
      "rules": ["QW-WCAG-T1"],
      "exclude": ["QW-WCAG-T2"],
      "levels": ["A", "AA", "AAA"],
      "principles": ["Perceivable", "Operable", "Understandable", "Robust"]
    }
  };
  const result = await executeWCAG(validation, options['wcag-techniques']);
  console.log(result);
}

module.exports = {
  evaluateCheckpointsFile,
  evaluateCheckpoint
}