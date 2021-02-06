(function() {
  // keep a reference to the original methods
  const _addEventListener = Element.prototype.addEventListener;
  const _removeEventListener = Element.prototype.removeEventListener;
  Element.prototype.events = {};

  Element.prototype.addEventListener = function (type, listener, useCapture) {
    const events = Element.prototype.events;

    if (!events[type]) {
      events[type] = [];
    }

    if (events[type].indexOf(listener) === -1) {
      events[type].push(listener);
    }

    // call the original method
    return _addEventListener.call(this, type, listener, useCapture);
  };

  Element.prototype.removeEventListener = function (type, listener, useCapture) {
    const events = Element.prototype.events;

    if (events[type] && events[type].indexOf(listener) !== -1) {
      events[type].splice(events[type].indexOf(listener), 1);
    }

    return _removeEventListener.call(this, type, listener, useCapture);
  }

  Element.prototype.hasEventListener = function(type, listener, useCapture) {
    const events = Element.prototype.events;
    console.log(events);
    if (!events[type] || events[type].indexOf(listener) === -1) {
      return false;
    }

    return true;
  }

}());
