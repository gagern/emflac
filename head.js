var flac = function flac(Module, process, module) {
  Module = Module || {};

  if (Module["mountNodeFS"]) {
    if (!Module["preRun"])
      Module["preRun"] = [];
    else if (typeof Module["preRun"] == "function")
      Module["preRun"] = [Module["preRun"]];
    else
      Module["preRun"] = Module["preRun"].slice();
    Module["preRun"].push(function() {
      if (ENVIRONMENT_IS_NODE) {
        FS.mkdir("fs");
        FS.mount(NODEFS, { "root": "/" }, "fs");
        FS.chdir("fs/" + global["process"]["cwd"]());
      }
    });
  }
