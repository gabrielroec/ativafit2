(function () {
  "use strict";

  window.addEventListener("error", function (event) {
    var f = event.filename || "";
    var m = event.message || "";
    if (
      f.indexOf("extension://") !== -1 ||
      m.indexOf("_AutofillCallbackHandler") !== -1 ||
      m.indexOf("Non-Error promise rejection") !== -1 ||
      m.indexOf("Script error") !== -1
    ) {
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener("unhandledrejection", function (event) {
    var r = event.reason ? event.reason.toString() : "";
    if (
      r.indexOf("_AutofillCallbackHandler") !== -1 ||
      r.indexOf("Non-Error promise rejection") !== -1 ||
      r.indexOf("Script error") !== -1
    ) {
      event.preventDefault();
      return false;
    }
  });
})();
