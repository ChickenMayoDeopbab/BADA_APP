// Hermes(React Native JS 엔진)에는 DOMException 전역이 없어,
// RN 코어 초기화 시 이를 참조하는 모듈에서 "Property 'DOMException' doesn't exist"가 발생한다.
// metro.config.js의 serializer.getPolyfills 최상단에서 실행되어, 어떤 모듈보다 먼저 전역을 보충한다.
// (이 단계에는 부수 효과 없이 순수 전역 정의만 두고, class 대신 함수로 작성해 호환성을 최대화한다.)
(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : global;
  if (typeof g.DOMException === 'undefined') {
    function DOMException(message, name) {
      var err = Error.call(this, message);
      this.message = message || '';
      this.name = name || 'Error';
      if (err && err.stack) {
        this.stack = err.stack;
      }
    }
    DOMException.prototype = Object.create(Error.prototype);
    DOMException.prototype.constructor = DOMException;
    g.DOMException = DOMException;
  }
})();
