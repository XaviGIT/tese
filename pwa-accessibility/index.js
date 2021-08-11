const fs = require('fs');
const puppeteer = require('puppeteer');
const detector = require('./lib/interactions-detector');
const generator = require('./lib/event-generator');
const memory = require('./lib/checkpoint-memory');
const utils = require('./lib/utils');
const beep = require('node-beep');

const NON_HEADLESS_CONFIG = {
  args: [
  '--ignore-certificate-errors',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--window-size=1920,1080',
  "--disable-accelerated-2d-canvas",
  "--disable-gpu"],
  ignoreHTTPSErrors: true,
  headless: false,
  defaultViewport: null
};

const HEADLESS_CONFIG = {
  args: [
  '--ignore-certificate-errors',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--window-size=1920,1080',
  "--disable-accelerated-2d-canvas",
  "--disable-gpu"],
  ignoreHTTPSErrors: true,
  headless: true,
  defaultViewport: null
};

// const PAGE_URL = 'https://getbootstrap.com/docs/5.0/components/dropdowns/';
// const PAGE_URL = 'https://www.google.com';
// const PAGE_URL = 'https://www.kayak.pt/';
const PAGE_URL = process.argv[2];

(async () => {
  console.time('full run');
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);

  await analyseCheckpoint(browser, PAGE_URL);
  // await browser.close();

  console.timeEnd('full run');
  beep(1);
})();

const analyseCheckpoint = async(browser, url, checkpointId = -1) => {
  const page = await browser.newPage();

  // console.time('add event listeners');
  const preload = fs.readFileSync(__dirname+'/lib/preload.js', 'utf8');
  page.evaluateOnNewDocument(preload);
  // console.timeEnd('add event listeners');
  await page.goto(url, { waitUntil: 'networkidle2' });

  let id = checkpointId === -1 ? await memory.saveCheckpoint(page, []) : checkpointId;

  await utils.takeScreenshot(page, 'mutation', id);
  await detectCheckpointTriggersById(page, id);
  await generateCheckpointEvents(browser, page, id);

  await page.close();
  await browser.close();
}

const detectCheckpointTriggersById = async(page, checkpointId) => {
  // console.time('analyse checkpoint');

  const matches = await detector.detectTriggers(page, checkpointId);

  // printHTMLTriggersAnalysis(matches.htmlTriggers);
  // printEventListenersAnalysis(matches.eventListeners);
  // printCompleteAnalysis(matches.combined);

  // console.timeEnd('analyse checkpoint');
}

const generateCheckpointEvents = async (browser, page, checkpointId) => {
  // const checkpoint = memory.getCheckpointById(checkpointId);
  // console.time('generate events sequential');
  // const mutationsSequential = await generator.generateEventsSequential(browser, page, checkpoint);
  // console.timeEnd('generate events sequential');
  // console.log(mutationsSequential);
  // console.time('generate events parallel');
  // const mutationsParallel = await generator.generateEventsParallel(browser, page, checkpoint);
  // console.timeEnd('generate events parallel');
  // console.log(mutationsParallel);
  // console.time('generate events tabs');
  await generator.generateEventsTabs(browser, checkpointId);
  // console.timeEnd('generate events tabs');
  // console.log(`--------end--------`)
  memory.print();
  memory.saveToFile();
}

const printHTMLTriggersAnalysis = (htmlTriggers) => {
  console.log(`HTML triggers: ${htmlTriggers.length}`);
  console.table(htmlTriggers);
}

const printEventListenersAnalysis = (eventListeners) => {
  console.log(`Event listeners: ${eventListeners.length}`);
  console.table(eventListeners);
}