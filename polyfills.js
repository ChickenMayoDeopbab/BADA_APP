if (typeof globalThis.DOMException === 'undefined') {
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'Error';
      this.message = message || '';
    }
  }
  globalThis.DOMException = DOMException;
}
