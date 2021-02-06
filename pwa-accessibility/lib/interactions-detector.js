// list of triggers we want to search for
const TRIGGERS = [
  { id: 'internal-anchor-01', selector: 'a[href="#"]' },
  { id: 'internal-button-01', selector: 'button:not([type=submit])' },
  { id: 'carousel-01', selector: '.carousel a' },
  { id: 'carousel-02', selector: '.carousel ol li' },
  { id: 'carousel-03', selector: '.carousel .next' },
  { id: 'carousel-04', selector: '.carousel .prev' },
  { id: 'carousel-05', selector: '.carousel .previous' },
  { id: 'toggle-01', selector: '[aria-expanded]' },
  { id: 'toggle-02', selector: '[data-bs-toggle]' },
  { id: 'pagination-03', selector: '.pagination .next' },
  { id: 'pagination-04', selector: '.pagination .prev' },
  { id: 'pagination-05', selector: '.pagination .previous' },
  { id: 'pagination-06', selector: '.menu .next' },
  { id: 'pagination-07', selector: '.menu .prev' },
  { id: 'pagination-08', selector: '.menu .previous' },
  // { id: 'menu-01', selector: 'nav li > :not(a)' },
  // { id: 'menu-02', selector: '.pagination li:not(:has(a))' },
  { id: 'select-01', selector: '[aria-selected]' },
  { id: 'editable-01', selector: '[contenteditable]' },
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
  console.log('Detecting elements who trigger interactions...');

  const htmlTriggers = await detectHTMLTriggers(page);
  const eventListeners = await detectEventListeners(page);

  return {
    htmlTriggers,
    eventListeners
  };
}

const detectHTMLTriggers = async(page) => {
  return await page.evaluate(listAllHTMLTriggers, allTriggersSelector);
}

const listAllHTMLTriggers = (selector) => {
  const documentElements = Array.prototype.slice.call(document.querySelectorAll(selector));
  let triggers = [];

  documentElements.forEach(el => {
    if(typeof el.id === 'undefined' || el.id === '') {
      const unique_id = `${performance.now()}`.replace('.', '_');
      el.id = `${el.tagName}_${unique_id}`; // Add unique id's
    }

    triggers.push({
      'element': el.id,
      'tag': el.tagName
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

    if(typeof currentElement.id === 'undefined' || currentElement.id === '') {
      const unique_id = `${performance.now()}`.replace('.', '_');
      currentElement.id = `${currentElement.tagName}_${unique_id}`; // Add unique id's
    }

    const elementListeners = {
      'element': currentElement.id,
      'tag': currentElement.tagName,
      'events': []
    };

    events.forEach(type => {
      // console.log(`${type}: ${currentElement.id}, ${currentElement.hasEventListener(type)}`);
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
