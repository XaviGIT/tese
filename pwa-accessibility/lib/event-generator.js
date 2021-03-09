const identifier = require('./change-identifier');

const generateEvents = async(browser, page, events) => {

  const mutations = await identifier.startIdentifier(page, 'body');
  events.forEach(evt => {
    triggerEvent(page, evt);
  });
}

const triggerEvent = (page, entry) => {
  if (entry.events) {
    entry.events.forEach(evt => {
      console.log(`Triggering event ${evt} in element #${entry.element}`);
      switch(evt) {
        case 'click':
          page.click(`#${entry.element}`);
          break;
        default: break;
      }
    });
  }
}

module.exports = {
  generateEvents
}