#!/usr/bin/env node

require("./")({
  standalone: true,
  mountNodeFS: true,
}).callMain(process.argv.slice(2).map(function(arg) {
  return String(arg).replace(/^\//, "/fs/");
}));
