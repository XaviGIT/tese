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
  console.time('analysis');
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);
  const page = await browser.newPage();

  console.time('add event listeners');
  const preload = fs.readFileSync(__dirname+'/lib/preload.js', 'utf8');
  page.evaluateOnNewDocument(preload);
  console.timeEnd('add event listeners');

  await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });

  const id = await analyseCheckpoint(page);
  await generateCheckpointEvents(browser, page, id);

  // await browser.close();

  console.timeEnd('analysis');
})();

const analyseCheckpoint = async(page) => {
  console.time('analyse checkpoint');
  const id = await memory.saveNewCheckpoint(page);
  const matches = await detector.detectTriggers(page);

  // printHTMLTriggersAnalysis(matches.htmlTriggers);
  // printEventListenersAnalysis(matches.eventListeners);
  printCompleteAnalysis(matches.combined);
  memory.updateCheckpointTriggers(id, matches.combined);

  console.timeEnd('analyse checkpoint');
  return id;
}

const generateCheckpointEvents = async (browser, page, checkpointId) => {
  console.time('generate events');
  const mutations = await generator.generateEventsSequential(browser, page, memory.getCheckpointTriggers(checkpointId));
  // const mutations = generator.generateEventsParallel(browser, page, memory.getCheckpointTriggers(checkpointId));
  console.log(mutations);
  console.timeEnd('generate events');
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