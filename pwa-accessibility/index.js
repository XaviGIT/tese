const fs = require('fs');
const puppeteer = require('puppeteer');
const detector = require('./lib/interactions-detector');
const generator = require('./lib/event-generator');
const memory = require('./lib/checkpoint-memory');

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
};

// const PAGE_URL = 'https://getbootstrap.com/docs/5.0/components/dropdowns/';
// const PAGE_URL = 'https://www.google.com';
// const PAGE_URL = 'https://www.kayak.pt/';
const PAGE_URL = process.argv[2];

(async () => {
  console.time('full run');
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);

  analyseCheckpoint(browser, PAGE_URL);
  // await browser.close();

  console.timeEnd('full run');
})();

const analyseCheckpoint = async(browser, url, checkpointId = -1) => {
  const page = await browser.newPage();

  await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });

  let id = checkpointId === -1 ? await memory.saveCheckpoint(page) : checkpointId;
  await detectCheckpointTriggersById(page, id);
  await generateCheckpointEvents(browser, page, id);

  page.close();
}

const detectCheckpointTriggersById = async(page, checkpointId) => {
  console.time('analyse checkpoint');

  const matches = await detector.detectTriggers(page);

  // printHTMLTriggersAnalysis(matches.htmlTriggers);
  // printEventListenersAnalysis(matches.eventListeners);
  printCompleteAnalysis(matches.combined);
  memory.updateCheckpointTriggersById(checkpointId, matches.combined);

  console.timeEnd('analyse checkpoint');
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
  console.time('generate events tabs');
  await generator.generateEventsTabs(browser, checkpointId);
  console.timeEnd('generate events tabs');
  console.log(memory.print());
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

const printCompleteAnalysis = (combined) => {
  console.log('Interactions detected:');
  console.table(combined);
}