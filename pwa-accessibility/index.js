const fs = require('fs');
const puppeteer = require('puppeteer');
const detector = require('./lib/interactions-detector');

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
  const browser = await puppeteer.launch(NON_HEADLESS_CONFIG);
  const page = await browser.newPage();

  const preload = fs.readFileSync(__dirname+'/lib/preload.js', 'utf8');
  page.evaluateOnNewDocument(preload);

  await page.goto(PAGE_URL, {waitUntil: 'networkidle2'});

  const matches = await detector.detectTriggers(page);
  printHTMLTriggersAnalysis(matches.htmlTriggers);
  printEventListenersAnalysis(matches.eventListeners);
  printCompleteAnalysis(matches);

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

const printCompleteAnalysis = (matches) => {
  const resultSet = new Set(matches.htmlTriggers.map(({ element }) => element));
  const combined = [
    ...matches.htmlTriggers,
    ...matches.eventListeners.filter(({ element }) => !resultSet.has(element))
  ];

  console.log('Combined:');
  console.table(combined);
}