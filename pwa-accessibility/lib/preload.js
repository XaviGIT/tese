(function() {
  // keep a reference to the original methods
  const _addEventListener = Element.prototype.addEventListener;
  const _removeEventListener = Element.prototype.removeEventListener;
  Element.prototype.events = {};

  Element.prototype.addEventListener = function (type, ...args) {
    const events = Element.prototype.events;

    if (!events[type]) {
      events[type] = [];
    }

    // Add unique id
    if(this.id === '') {
      const unique_id = `${performance.now()}`.replace('.', '_');
      this.id = `${this.tagName}_${unique_id}`;
    }

    if (events[type].indexOf(this.id) === -1) {
      events[type].push(this.id);
    }

    // call the original method
    return _addEventListener.call(this, type, ...args);
  };

  Element.prototype.removeEventListener = function (type, ...args) {
    const events = Element.prototype.events;

    if (events[type] && events[type].indexOf(this.id) !== -1) {
      events[type].splice(events[type].indexOf(this.id), 1);
    }

    return _removeEventListener.call(this, type, ...args);
  }

  Element.prototype.hasEventListener = function(type, ...args) {
    const events = Element.prototype.events;

    if (!events[type] || events[type].indexOf(this.id) === -1) {
      return false;
    }

    return true;
  }

}());
