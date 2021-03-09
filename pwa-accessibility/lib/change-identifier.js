// let observer;

const startIdentifier = async(page, target) => {
  return await page.evaluate((t) => {
    const config = { characterData: true, attributes: true, childList: true, subtree: true };
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    const o = new MutationObserver((mutations) => {
      console.log(mutations);
      o.disconnect();
    });
    o.observe(document.querySelector(t), config);

  }, target);
}

const stopIdentifier = () => {
  // console.log(observer);
  // observer.disconnect();
}

module.exports = {
  startIdentifier,
  stopIdentifier
};
