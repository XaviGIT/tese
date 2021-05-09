const memory = require('./checkpoint-memory');
const detector = require('./interactions-detector');

const triggerEvent = async (page, elem, mutations) => {
  await page.evaluate(async (entry) => {

    const newMutations = await new Promise((resolve, reject) => {
      const config = { characterData: true, attributes: true, childList: true, subtree: true };
      const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
      const observer = new MutationObserver((changes) => {
        resolve(changes);
      });
      observer.observe(document.querySelector('body'), config);

      const element = document
        .evaluate(entry.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
      element.click();
      setTimeout(() => resolve([]), 500);
    });

    const nodesToText = (arr) => {
      const result = [];
      if (arr) {
        arr.forEach(el => {
          result.push(getXPathForElement(el));
        });
      }
      return result;
    };

    newMutations.forEach(({ type, addedNodes, removedNodes, attributeName }) => {
      updateMutations(type, nodesToText(addedNodes), nodesToText(removedNodes), attributeName);
    });

    return;
  }, elem);
};

const generateEventsSequential = async (browser, page, checkpoint) => {
  const triggers = checkpoint.triggers;
  const url = checkpoint.url;
  const mutations = [];

  await preventExternalInteractions(page, url);
  await exposeMutations(page, mutations);

  await triggers.reduce(async (memo, trigger) => {
    await memo;
    await triggerEvent(page, trigger, mutations);
  }, undefined);

  return mutations;
};

const generateEventsParallel = async (browser, page, checkpoint) => {
  const triggers = checkpoint.triggers;
  const url = checkpoint.url;
  const mutations = [];

  await preventExternalInteractions(page, url);
  await exposeMutations(page, mutations);

  await Promise.all(triggers.map(async (trigger) => {
    await triggerEvent(page, trigger, mutations);
  }));

  return mutations;
};

const generateEventsTabs = async (browser, checkpointId) => {
  const checkpoint = memory.getCheckpointById(checkpointId);
  const {id, url, triggers} = checkpoint;

  await Promise.all(triggers.map(async (trigger) => {
    const mutations = [];
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.addScriptTag({ path: 'lib/utils.js'});

    await preventExternalInteractions(page, url);
    await exposeMutations(page, mutations, trigger);
    await triggerEvent(page, trigger, mutations);
    trigger.tested = true;

    setTimeout(async() => {
      if (mutations.length > 0) {
        const newId = await memory.saveCheckpoint(page, id, mutations);
        memory.updateCheckpointNextById(id, newId);
        if (!memory.isCheckpointTested(newId)) {
            // TODO: continue evaluation
          // await detector.detectTriggers(page);
          // await generateEventsTabs(browser, newId);
        } else {
          page.close();
        }
      } else {
        page.close();
      }

    }, 500);
  }));

  checkpoint.tested = true;
}

const preventExternalInteractions = async(page, url) => {
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== url) {
      // no redirect chain means the navigation is caused by setting `location.href`
      req.respond(req.redirectChain().length
        ? { body: '' } // prevent 301/302 redirect
        : { status: 204 } // prevent navigation by js
      )
    } else {
      req.continue()
    }
  });
}

const exposeMutations = async(page, mutations, trigger) => {
  await page.exposeFunction('updateMutations', (type, addedNodes, removedNodes, attributeName) => {
    mutations.push({
      type,
      addedNodes,
      removedNodes,
      attributeName,
      trigger
    });
  });
}

module.exports = {
  generateEventsSequential,
  generateEventsParallel,
  generateEventsTabs
};

// await page.exposeFunction('triggerEvent', (element, events) => {
  //     if (element && events) {

  //       trigger.events.forEach(evt => {
  //         console.log(`Triggering event ${evt} in element #${trigger.element}`);
  //         switch(evt) {
  //           case 'click':
  //             page.click(`#${trigger.element}`);
  //             break;
  //           default: break;
  //         }
  //       });
  //     }
  // });