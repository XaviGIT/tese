let observer;

const startIdentifier = () => {
  const config = { characterData: true, attributes: true, childList: true, subtree: true };
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
  observer = new MutationObserver((mutations) => {
    console.log(mutations);
  });
  observer.observe(document.querySelector('body'), config);
}

const stopIdentifier = () => {
  observer.disconnect();
}

module.exports = {
  startIdentifier,
  stopIdentifier
};
