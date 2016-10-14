  Module["FS_readFile"] = FS["readFile"];
  Module["getExitStatus"] = function() {
    return ABORT ? EXITSTATUS : null;
  };
  return Module;
};

//////////////////////////////////////////////////////////////////////
// Initialization as a Node module

(function initFlac() {
  if (typeof window === "object")
    (function initForWeb() {
    })();
  else if (typeof importScripts === "function")
    (function initForWorker() {

      self["onmessage"] = function(msg) {
        var data = msg["data"];
        var stdout = [];
        var stderr = [];
        var res = {
          "id": data["id"],
        };
        var transfer = [];
        try {
          var args = data["arguments"];
          var input, output;
          if (args[0] === "-d") {
            input = "in.flac";
            output = "out.wav";
          } else {
            input = "in.wav";
            output = "out.flac";
          }
          var cmd = flac({
            "print": function(txt) {
              stdout.push(txt);
            },
            "printerr": function(txt) {
              stderr.push(txt);
            },
          });
          var content = new Uint8Array(data["data"]);
          cmd.FS_createDataFile(".", input, content, true, false);
          cmd.callMain(["-s"].concat(args, "-o", output, input));
          var status = res["exitStatus"] = cmd.getExitStatus();
          if (status === 0) {
            transfer[0] = res["data"] = cmd.FS_readFile(output).buffer;
          } else {
            res["error"] = "flac exited with status " + status + ":\n" +
              stderr.join("");
          }
        } catch (e) {
          res["error"] = String(e);
          if (e.stack)
            res["stack"] = e.stack;
        } finally {
          res["stdout"] = stdout.join("");
          res["stderr"] = stderr.join("");
          self["postMessage"](res, transfer);
        }
      };

    })();
  else if (typeof process === "object" && typeof require === "function")
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
  else
    (function initForShell() {
    })();
})();
