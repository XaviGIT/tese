const fs = require('fs');

// list of triggers we want to search for
const TRIGGERS = [
  { id: 'internal-anchor-01', selector: 'a[href="#"]' },
  { id: 'internal-button-01', selector: 'button:not([type=submit])' },
  { id: 'carousel-01', selector: '.carousel a' },
  { id: 'carousel-02', selector: '.carousel ol li' },
  { id: 'carousel-03', selector: '.carousel .next' },
  { id: 'carousel-04', selector: '.carousel .prev' },
  { id: 'carousel-05', selector: '.carousel .previous' },
  { id: 'toggle-01', selector: '[data-bs-toggle]' },
  { id: 'pagination-03', selector: '.pagination .next' },
  { id: 'pagination-04', selector: '.pagination .prev' },
  { id: 'pagination-05', selector: '.pagination .previous' },
  { id: 'pagination-06', selector: '.menu .next' },
  { id: 'pagination-07', selector: '.menu .prev' },
  { id: 'pagination-08', selector: '.menu .previous' },
  // { id: 'menu-01', selector: 'nav li > :not(a)' },
  // { id: 'menu-02', selector: '.pagination li:not(:has(a))' },
  // { id: 'editable-01', selector: '[contenteditable]' },
  { id: 'aria-widget-roles-01', selector: '[role="button"]' },
  { id: 'aria-widget-roles-02', selector: '[role="checkbox"]' },
  { id: 'aria-widget-roles-03', selector: '[role="gridcell"]' },
  { id: 'aria-widget-roles-04', selector: '[role="link"]' },
  { id: 'aria-widget-roles-05', selector: '[role="menuitem"]' },
  { id: 'aria-widget-roles-06', selector: '[role="menuitemcheckbox"]' },
  { id: 'aria-widget-roles-07', selector: '[role="menuitemradio"]' },
  { id: 'aria-widget-roles-08', selector: '[role="option"]' },
  { id: 'aria-widget-roles-09', selector: '[role="progressbar"]' },
  { id: 'aria-widget-roles-10', selector: '[role="radio"]' },
  { id: 'aria-widget-roles-11', selector: '[role="scrollbar"]' },
  { id: 'aria-widget-roles-12', selector: '[role="searchbox"]' },
  { id: 'aria-widget-roles-13', selector: '[role="separator"]' },
  { id: 'aria-widget-roles-14', selector: '[role="slider"]' },
  { id: 'aria-widget-roles-15', selector: '[role="spinbutton"]' },
  { id: 'aria-widget-roles-16', selector: '[role="switch"]' },
  { id: 'aria-widget-roles-17', selector: '[role="tab"]' },
  { id: 'aria-widget-roles-18', selector: '[role="textbox"]' },
  { id: 'aria-widget-roles-18', selector: '[role="treeitem"]' },
  { id: 'aria-widget-attributes-01', selector: '[aria-selected]' },
  { id: 'aria-widget-attributes-02', selector: '[aria-expanded]' },
];

const EVENTS = [
  // 'focus',
  // 'blur',
  'keydown',
  'keypress',
  'keyup',
  'click',
  'dblclick',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'mouseup'
];

// transforms list of triggers into string
const allTriggersSelector = TRIGGERS.map(({selector }) => selector).join(', ');

const detect = async(page) => {
  console.log('\nDetecting elements who trigger interactions...');

  console.time('add event listeners');
  const preload = fs.readFileSync(__dirname+'/preload.js', 'utf8');
  page.evaluateOnNewDocument(preload);
  await page.reload();
  console.timeEnd('add event listeners');

  await page.addScriptTag({ path: 'lib/utils.js'});

  const htmlTriggers = await detectHTMLTriggers(page);
  const eventListeners = await detectEventListeners(page);

  const resultSet = new Set(htmlTriggers.map(({ xpath }) => xpath));
  const combined = [
    ...htmlTriggers,
    ...eventListeners.filter(({ xpath }) => !resultSet.has(xpath))
  ];

  return {
    htmlTriggers,
    eventListeners,
    combined
  };
}

const detectHTMLTriggers = async(page) => {
  return await page.evaluate(listAllHTMLTriggers, allTriggersSelector);
}

const listAllHTMLTriggers = (selector) => {
  const documentElements = Array.prototype.slice.call(document.querySelectorAll(selector));
  let triggers = [];

  documentElements.forEach(el => {
    triggers.push({
      'xpath': getXPathForElement(el),
      'tag': el.tagName,
      'events': ['click']
    });
  });

  return triggers;
}

const detectEventListeners = async(page) => {
  return await page.evaluate(listAllEventListeners, EVENTS);
}

const listAllEventListeners = (events) => {
  const documentElements = Array.prototype.slice.call(document.querySelectorAll('body *'));

  let listeners = [];
  for (let i = 0; i < documentElements.length; i++) {
    const currentElement = documentElements[i];

    const elementListeners = {
      'xpath': getXPathForElement(currentElement),
      'tag': currentElement.tagName,
      'events': []
    };

    events.forEach(type => {
      if (
        typeof currentElement[`on${type}`] === 'function' ||   // Events defined in attributes
        currentElement.hasEventListener(type)                  // Events defined in event listeners
      ) {
        elementListeners.events.push(type);
      }
    });

    if (elementListeners.events.length > 0) {
      listeners.push(elementListeners);
    }
  }

  return listeners.sort();
}

module.exports = {
  detectTriggers: detect,
  detectHTMLTriggers: detectHTMLTriggers,
  detectEventListeners: detectEventListeners
};
