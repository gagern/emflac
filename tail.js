  Module["FS_readFile"] = FS["readFile"];
  Module["getExitStatus"] = function() {
    return ABORT ? EXITSTATUS : null;
  };
  return Module;
};

//////////////////////////////////////////////////////////////////////
// Initialization as a Node module

if (typeof window === "undefined" &&
    typeof importScripts === "undefined" &&
    typeof process === "object" &&
    typeof require === "function") {
  (function initForNode() {
    module["exports"] = function(options) {
      options = options || {};
      var standalone = !!options["standalone"];
      function noop(){}
      var dummyProcess = {
        "argv": [null, "flac"],
        "on": standalone ? process["on"].bind(process) : noop,
        "platform": process["platform"],
        "exit": standalone ? process["exit"].bind(process) : noop,
      };
      var dummyNodeModule = {
        "exports": {},
      };
      return flac(options, dummyProcess, dummyNodeModule);
    };
  })();
}
