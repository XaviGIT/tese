const fs = require('fs');
const lineReader = require('linebyline');
const memory = require('./checkpoint-memory');
const detector = require('./interactions-detector');
const utils = require('./utils');

const getTriggerMeasures = async(page, trigger) => {
  const measures = await page.evaluate(async (entry) => {
    const element = document
      .evaluate(entry.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue;

    element.scrollIntoView();
    const { x, y, width, height } = element.getBoundingClientRect();

    return `${x},${y},${width},${height},${element.offsetTop}`;
  }, trigger);

  // console.log(measures);
  return measures;
}

const printTrigger = async(page, measures) => {
  await page.evaluate(async(m) => {
    const overlay = document.createElement('div');
    overlay.id = 'pwaAnalysisOverlay';
    overlay.style.cssText = `
      display: block;
      position: fixed;
      left: ${m.x}px;
      top: ${m.y}px;
      width: ${m.width}px;
      height: ${m.height}px;
      background-color: red;
      opacity: 0.2;
    `;
    document.body.appendChild(overlay);
  }, measures);

  await utils.takeScreenshot(page, 'trigger', Date.now());

  await page.evaluate(() => {
    const overlay = document.getElementById('pwaAnalysisOverlay');
    overlay.parentNode.removeChild(overlay);
  });
}

const setMutationsObserver = async(page) => {
  await page.evaluate(() => {
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
  })
}

const triggerEvent = async (page, elem) => {
  const measures = await getTriggerMeasures(page, elem);
  const measuresArr = measures.split(',');

  const x = measuresArr[0];
  const y = measuresArr[1];
  const width = measuresArr[2];
  const height = measuresArr[3];

  await printTrigger(page, {x, y, width, height});

  await setMutationsObserver(page);

  // we're targeting the middle of the trigger
  const mouseX = parseInt(x) + (parseInt(width) / 2);
  const mouseY = parseInt(y) + (parseInt(height) / 2);
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
    await triggerEvent(page, trigger);
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
    await triggerEvent(page, trigger);
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
        await removeAds(page);

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
        await triggerEvent(page, trigger);
        trigger.tested = true;

        const checkMutations = async(mutations, memory, utils, oldId, trigger) => {
          if (mutations.length > 0) {
            const newPath = [{
              id,
              trigger
            }].concat(path);
            const newId = await memory.saveCheckpoint(page, newPath);

            if (newId !== -1) { // not saved
              updatePageTitle(newId);
              await utils.takeScreenshot(page, 'mutation', newId);

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
        await checkMutations(mutations, memory, utils, id, trigger);
        page.close();
      }
    ));
  }
}

const removeAds = async(page) => {
  const rl = lineReader('ads.txt');
  const ads = [];

  rl.on('line', (line, lineCount, byteCount) => {
    ads.push(line);
  }).on('error', (err) => {
      console.error(err);
  });

  const knownAds = memory.getKnownAds();
  await page.evaluate((ads) => {
    ads.forEach(xpath => {
      const ad = document
        .evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;

      ad.remove();
    });
  }, knownAds);

  const frames = await page.mainFrame()
    .childFrames()
    .forEach(f => {
      if (ads.find(ad => f.url().includes(ad))) {
        const xpath = getXPathForElement(f);
        memory.addKnownAd(xpath);
      }
    });
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
  generateEventsTabs,
  triggerEvent
};
