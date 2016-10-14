    return Module;
  };
  var createModule = compiledCode;
  function noop(){}

  var errorMessages = {
    "1": "MEMORY_ALLOCATION_ERROR",
    // FLAC__StreamDecoderInitStatus
    "11": "UNSUPPORTED_CONTAINER",
    "12": "INVALID_CALLBACKS",
    "13": "MEMORY_ALLOCATION_ERROR",
    "14": "ERROR_OPENING_FILE",
    "15": "ALREADY_INITIALIZED",
    // FLAC__StreamDecoderState
    "20": "SEARCH_FOR_METADATA",
    "21": "READ_METADATA",
    "22": "SEARCH_FOR_FRAME_SYNC",
    "23": "READ_FRAME",
    "24": "END_OF_STREAM",
    "25": "OGG_ERROR",
    "26": "SEEK_ERROR",
    "27": "ABORTED",
    "28": "MEMORY_ALLOCATION_ERROR",
    "29": "UNINITIALIZED",
    // FLAC__StreamDecoderErrorStatus
    "30": "LOST_SYNC",
    "31": "BAD_HEADER",
    "32": "FRAME_CRC_MISMATCH",
    "33": "UNPARSEABLE_STREAM",
  };

  function decodeSync(flacData, settings) {
    var mod = createModule(settings);
    mod["flacData"] = flacData;
    var res = mod["_decodeSyncCore"](flacData["length"]);
    if (mod["flacErrorStatus"])
      res = mod["flacErrorStatus"];
    if (res != 0)
      throw Error("Failed to decode FLAC data (" + res + "): " +
                  (mod["flacErrorMessage"] || errorMessages[res]));
    var i, pos = 0, parts = mod["wavData"];
    for (i = 0; i < parts["length"]; ++i)
      pos += parts[i]["byteLength"];
    var out = new Uint8Array(pos);
    pos = 0;
    for (i = 0; i < parts["length"]; ++i) {
      out.set(new Uint8Array(parts[i]["buffer"]), pos);
      pos += parts[i]["byteLength"];
    }
    return out;
  }

  var emflac = context["emflac"] || (context["emflac"] = {});
  emflac["decodeSync"] = decodeSync;

  if (typeof window === "object") {
    // Browser

  } else if (typeof importScripts === "function") {
    // WebWorker

    context["onmessage"] = function(msg) {
      var data = msg["data"];
      var res = {
        "id": data["id"],
      };
      var transfer = [];
      try {
        res["data"] = decodeSync(new Uint8Array(data["data"]));
      } catch (e) {
        res["error"] = String(e);
        if (e.stack)
          res["stack"] = e.stack;
      }
      context["postMessage"](res, transfer);
    };

  } else if (typeof process === "object" && typeof require === "function") {
    // Node
    createModule = function(Module) {
      return compiledCode(Module, {
        "argv": [null, "flac"],
        "on": noop,
        "platform": process["platform"],
        "exit": noop,
      }, {
        "exports": {},
      });
    };
    module["exports"] = emflac;
    if (require["main"] === module) {
      var fs = require("fs");
      var flac = fs["readFileSync"](process["argv"][2]);
      var wav = decodeSync(new Uint8Array(flac));
      fs["writeFileSync"](process["argv"][3], Buffer["from"](wav));
    }

  } else {
    // Console?
  }

})(this || {});
