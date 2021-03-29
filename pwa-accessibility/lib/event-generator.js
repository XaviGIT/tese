const triggerEvent = async(page, elem, mutations) => {
  await page.evaluate(async(entry) => {
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
      setTimeout(() => resolve([]), 1000);
    });

    const nodesToText = (arr) => {
      const result = [];
      if (arr) {
        arr.forEach(el => {
          result.push(getXPathForElement(el));
        })
      }
      return result;
    }

    newMutations.forEach(({type, addedNodes, removedNodes, attributeName}) => {
      updateMutations(type, nodesToText(addedNodes), nodesToText(removedNodes), attributeName);
    });

    return;
  }, elem);
}

const generateEventsSequential = async(browser, page, triggers) => {

  const mutations = [];

  await page.exposeFunction('updateMutations', (type, addedNodes, removedNodes, attributeName) => {
    mutations.push({
      type,
      addedNodes,
      removedNodes,
      attributeName
    })
  });

  await triggers.reduce(async (memo, trigger) => {
    await memo;
    await triggerEvent(page, trigger, mutations);
  }, undefined);

  return mutations;
}

const generateEventsParallel = async(browser, page, triggers) => {
  const mutations = [];

  await page.exposeFunction('updateMutations', (type, addedNodes, removedNodes, attributeName) => {
    mutations.push({
      type,
      addedNodes,
      removedNodes,
      attributeName
    })
  });

  await Promise.all(triggers.map(async(trigger) => {
    await triggerEvent(page, trigger, mutations);
  }));

  return mutations;
}

module.exports = {
  generateEventsSequential,
  generateEventsParallel,
}

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