const fs = require('fs');
const memory = require('./checkpoint-memory');
const detector = require('./interactions-detector');

const triggerEvent = async (page, elem, mutations) => {
  const measures = await page.evaluate(async (entry) => {
    const element = document
      .evaluate(entry.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue;

    const { x, y, width, height } = element.getBoundingClientRect();

    const nodesToText = (arr) => {
      const result = [];
      if (arr) {
        arr.forEach(el => {
          result.push(getXPathForElement(el));
        });
      }
      return result;
    };

    const config = { characterData: true, attributes: true, childList: true, subtree: true };
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    const observer = new MutationObserver((changes) => {
        changes.forEach(({ type, target, addedNodes, removedNodes, attributeName }) => {
        updateMutations(type, nodesToText([target]), nodesToText(addedNodes), nodesToText(removedNodes), attributeName);
      });
    });
    observer.observe(document.querySelector('body'), config);

    return `${x},${y},${width},${height}`;
  }, elem);

  const measuresArr = measures.split(',');
  // we're targeting the middle of the trigger
  const mouseX = parseInt(measuresArr[0]) + (parseInt(measuresArr[2]) / 2);
  const mouseY = parseInt(measuresArr[1]) + (parseInt(measuresArr[3]) / 2);
  await page.mouse.click(mouseX, mouseY);
  // element.click();
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
  const {id, url, triggers, path, tested} = checkpoint;

  if (!tested) {
    checkpoint.tested = true;

    await Promise.all(triggers.filter(trigger => !trigger.tested)
      .map(async (trigger) => {
        const mutations = [];
        const page = await browser.newPage();
        const preload = fs.readFileSync(__dirname+'/preload.js', 'utf8');
        page.evaluateOnNewDocument(preload);

        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.addScriptTag({ path: 'lib/utils.js'});
        await preventExternalInteractions(page, url);

        const updatePageTitle = async(id) => {
          await page.evaluate((id) => {
            document.title = `Checkpoint ${id}`;
          }, id);
        }

        const navigateToCheckpoint = async(path) => {
          await path.reduce(async (memo, state) => {
            await memo;
            await triggerEvent(page, state.trigger);
            await new Promise(resolve => setTimeout(resolve, 2500));
          }, undefined);
        }

        updatePageTitle(id);

        if (path.length !== 0) { // root checkpoint
          await navigateToCheckpoint(path);
        }

        await exposeMutations(page, mutations, trigger);
        await triggerEvent(page, trigger, mutations);
        trigger.tested = true;

        const checkMutations = async(mutations, memory, oldId, trigger) => {
          if (mutations.length > 0) {
            const newPath = [{
              id,
              trigger
            }].concat(path);
            const newId = await memory.saveCheckpoint(page, newPath);

            if (newId !== -1) { // not saved
              updatePageTitle(newId);
              await page.screenshot({path: `./results/${newId}.png`});

              memory.updateCheckpointPrevById(newId, {
                id: oldId,
                trigger
              });

              memory.updateCheckpointNextById(id, {
                id: newId,
                trigger,
                mutations
              });

              if (!memory.isCheckpointTested(newId)) {
                // run again
                await detector.detectTriggers(page, newId);
                await generateEventsTabs(browser, newId);
              }
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // needs to wait for  mutations to appear
        await checkMutations(mutations, memory, id, trigger);
        page.close();
      }
    ));
  }
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
  await page.exposeFunction('updateMutations', (type, target, addedNodes, removedNodes, attributeName) => {
    mutations.push({
      type,
      target,
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