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
  'focus',
  'blur',
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

  await page.evaluateOnNewDocument(addHasListener);
  const htmlTriggers = await detectHTMLTriggers(page);
  const eventListeners = await detectEventListeners(page);

  return {
    htmlTriggers,
    eventListeners
  };
}

const addHasListener = () => {
  const _addEventListener = EventTarget.prototype.addEventListener;
  const _removeEventListener = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.events = {};
  EventTarget.prototype.addEventListener = function(name, listener, etc) {
    let events = EventTarget.prototype.events;
    if (events[name] == null) {
      events[name] = [];
    }

    if (events[name].indexOf(listener) == -1) {
      events[name].push(listener);
    }

    _addEventListener(name, listener);
  };
  EventTarget.prototype.removeEventListener = function(name, listener) {
    let events = EventTarget.prototype.events;

    if (events[name] != null && events[name].indexOf(listener) != -1) {
      events[name].splice(events[name].indexOf(listener), 1);
    }

    _removeEventListener(name, listener);
  };
  EventTarget.prototype.hasEventListener = function(name) {
    let events = EventTarget.prototype.events;
    if (events[name] == null) {
      return false;
    }

    return events[name].length;
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
      el.id = `${el.tagName}_${performance.now()}`; // Add unique id's
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
  const types = [];
  const regex = new RegExp(`^on(${events.join('|')})`);

  for (let ev in window) {
    if (regex.test(ev)) types[types.length] = ev;
  }

  let listeners = [];
  for (let i = 0; i < documentElements.length; i++) {
    const currentElement = documentElements[i];

    if(typeof currentElement.id === 'undefined' || currentElement.id === '') {
      currentElement.id = `${currentElement.tagName}_${performance.now()}`; // Add unique id's
    }

    const elementListeners = {
      'element': currentElement.id,
      'tag': currentElement.tagName,
      'types': [],
      'teste': currentElement.hasEventListener('click')
    };

    // Events defined in attributes
    for (let j = 0; j < types.length; j++) {
      if (typeof currentElement[types[j]] === 'function') {
        elementListeners.types.push(types[j]);
      }
    }

    if (elementListeners.types.length > 0) {
      listeners.push(elementListeners);
    }

    // Events defined with addEventListener
    // if (typeof currentElement._getEventListeners === 'function') {
    //   const evts = currentElement._getEventListeners();
    //   if (Object.keys(evts).length >0) {
    //     for (let evt of Object.keys(evts)) {
    //       for (let k=0; k < evts[evt].length; k++) {
    //         listeners.push({
    //           "element": currentElement.id,
    //           "type": evt,
    //           //"func": evts[evt][k].listener.toString()
    //         });
    //       }
    //     }
    //   }
    // }
  }

  return listeners.sort();
}

module.exports = {
  detectTriggers: detect,
  detectHTMLTriggers: detectHTMLTriggers,
  detectEventListeners: detectEventListeners
};
