const fs = require('fs');
const puppeteer = require('puppeteer');
const detector = require('./lib/interactions-detector');
const generator = require('./lib/event-generator');
const { performance, PerformanceObserver } = require("perf_hooks")

const po = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
});
po.observe({ entryTypes: ["measure"], buffer: true });


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
  performance.mark('start-puppeteer');
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);
  const page = await browser.newPage();

  performance.mark('add-ids');
  const preload = fs.readFileSync(__dirname+'/lib/preload.js', 'utf8');
  page.evaluateOnNewDocument(preload);

  performance.mark('start-page');
  await page.goto(PAGE_URL, {waitUntil: 'networkidle2'});

  performance.mark('start-detect-triggers');
  const matches = await detector.detectTriggers(page);
  performance.mark('end-detect-triggers');
  // printHTMLTriggersAnalysis(matches.htmlTriggers);
  // printEventListenersAnalysis(matches.eventListeners);
  printCompleteAnalysis(matches.combined);

  // performance.mark('generate events');
  generator.generateEvents(browser, page, matches.combined);

  // performance.measure('start', 'start-puppeteer', 'start-detect-triggers');
  performance.measure('triggers', 'start-detect-triggers', 'end-detect-triggers');

  // await browser.close();
})();

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