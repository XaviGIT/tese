const prefix = 'qualweb_';

const takeScreenshot = async(page, type, name) => {
  await page.screenshot({path: `./results/analysis/${type}-${name}.png`, fullPage: true});
}

const getElementId = (element) => {
  if(typeof element.id === 'undefined' || element.id === '') {
    const unique_id = `${performance.now()}`.replace('.', '_');
    element.id = `${prefix}${element.tagName}_${unique_id}`; // Add unique id's
  }
  return element.id;
}

const getXPathForElement = (element) => {
  const idx = (sib, name) => sib
      ? idx(sib.previousElementSibling, name||sib.localName) + (sib.localName == name)
      : 1;
  const segs = elm => !elm || elm.nodeType !== 1
      ? ['']
      : elm.id && elm.id.indexOf(prefix) === -1 && document.getElementById(elm.id) === elm
          ? [`id("${elm.id}")`]
          : [...segs(elm.parentNode), `${elm.localName.toLowerCase()}[${idx(elm)}]`];
  return segs(element).join('/');
}

const getElementByXPath = (path) => {
  return (new XPathEvaluator())
      .evaluate(path, document.documentElement, null,
                      XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue;
}

const getSelfLocationInParent = (element) => {
  let selector = '';

  if (element.name === 'body' || element.name === 'head') {
    return element['name'];
  }

  let sameEleCount = 0;

  let prev = element.prev;
  while (prev) {
    if (prev.type === 'tag' && prev.name === element.name) {
      sameEleCount++;
    }
    prev = prev.prev;
  }

  selector += `${element.name}:nth-of-type(${sameEleCount + 1})`;

  return selector;
}

const getSourceElementSelector = (element) => {
  if (element.name === 'html') {
    return 'html';
  } else if (element.name === 'head') {
    return 'html > head';
  } else if (element.name === 'body') {
    return 'html > body';
  }

  let selector = 'html > ';

  const parents = new Array();
  let parent = element.parent;
  while (parent && parent.name !== 'html') {
    parents.unshift(getSelfLocationInParent(parent));
    parent = parent.parent;
  }

  selector += parents.join(' > ');
  selector += ' > ' + getSelfLocationInParent(element);

  return selector;
}

module.exports = {
  takeScreenshot,
  getXPathForElement,
  getElementByXPath
}