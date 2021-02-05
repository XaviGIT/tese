const puppeteer = require('puppeteer');
const detector = require('./lib/interactions-detector');

// const PAGE_URL = 'https://getbootstrap.com/docs/5.0/components/dropdowns/';
// const PAGE_URL = 'https://www.google.com';
// const PAGE_URL = 'https://www.kayak.pt/';
const PAGE_URL = process.argv[2];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(PAGE_URL, {waitUntil: 'networkidle2'});

  const matches = await detector.detectTriggers(page);
  printHTMLTriggersAnalysis(matches.htmlTriggers);
  printEventListenersAnalysis(matches.eventListeners);
  printCompleteAnalysis(matches);

  await browser.close();
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