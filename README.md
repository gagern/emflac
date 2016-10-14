# emflac

**JavaScript version of the [Free Lossless Audio Codec][flac] (FLAC).**

The core of the code here was compiled from
version 1.3.1
of [the reference implementation][refimpl] (written in C)
using [emscripten][emscripten].
So it's fully JavaScript, but with most of the features and quality
you would expect from the C version.

## Getting emflac

Emflac is [available via npm][npmjs].
`npm install emflac` should install it into your current directory or project.
This is the preferred means of obtaining a compiled source file
even if you intend to use it outside Node.
The source repository does not contain the compiled files.

## The flac tool

The FLAC reference implementation comes with several components.
One is the library *libFLAC*, another is the command line tool *flac*.
While reasonable bindings to *libFLAC* are still under development,
emflac does offer different kinds of access to the command-line tool.

### As a command-line tool

Installing the package using `npm install emflac` will provide you with
a script called `node_modules/.bin/flac` which resembles the command-line
utility of the same name from the official sources.

```sh
export PATH=node_modules/.bin:$PATH # automatically done in npm scripts
flac foo.wav                        # creates foo.flac
flac -d -o foo2.wav foo.flac        # foo.wav and foo2.wav should sound the same
```

### As a node module

You can also use the module to call the command line utility
from another piece of code, like this:

```js
"use strict";

const fs = require("fs");
const flac = require("./");

const cmd = flac({
  TOTAL_MEMORY: 8*1024*1024, // 8 MiB
  TOTAL_STACK: 64*1024, // 64 kiB
});
let data = fs.readFileSync(process.argv[2]);
cmd.FS_createDataFile(".", "in.wav", data, true, false);
cmd.callMain(["-o", "out.flac", "in.wav"]);
if (cmd.getExitStatus() === 0) {
  data = cmd.FS_readFile("out.flac");
  data = Buffer.from(data);
  fs.writeFileSync(process.argv[3], data);
}
```

The `flac` function in the above example accepts an optional argument
which is an emscripten module configuration object.
This can be used to set a large variety of configuration settings
for the underlying code, like the memory sizes given above.

There are some extra arguments:

* **`standalone`** (boolean, default `false`):
  If set to true will allow the module to set up global exception handlers
  and also exit the node environment once the command is done.
  Mainly intended for standalone scripts which do nothing else.
* **`mountNodeFS`** (boolean, default `false`):
  If set to true, the machine's file system will be mounted at `/fs`,
  so that a command-line argument `/fs/home/john/in.wav`
  refers to the file `/home/john/in.wav` on the local machine.
  The current working directory of the module will reflect that
  of the node process, so relative path names should work as expected.

The result is an emscripten-compiled module.
By default the main method of that module has not been executed,
so you may invoke `callMain` on that object.
Usually after setting up some in-memory file as in the example above.
The methods `FS_readFile` and `getExitStatus` are not commonly found
in emscripten-compiled modules, but specific to this module here.
Their use is demonstrated in the example above.

### As a web worker

The file [`useWorker.html`][useWorker] demonstrates how the codec
can be used from within a browser.
The worker expects messages of the form

```js
{
  "id": ‹clonable value›,
  "arguments": ["‹arg1›", "‹arg2›", …],
  "data": ‹ArrayBuffer›
}
```

If the first argument is `-d`, this will decode FLAC to WAV.
Otherwise a WAV to FLAC encoding is performed.
The given data is taken as the input of the operation.
If the operation was successful, the reply is a message like

```js
{
  "id": ‹copied from input›,
  "stderr": "",
  "stdout": "",
  "exitStatus": 0,
  "data": ‹ArrayBuffer›
}
```

In case of an error, the resulting message is

```js
{
  "id": ‹copied from input›,
  "exitStatus": ‹int or undefined›,
  "stdout": "‹program output›",
  "stderr": "‹program messages›",
  "error": "‹message›",
  "stack": ‹string or undefined›
}
```

## Decompression tool

The file `decompress.js` provides more direct bindings to
the stream decompression module of *libFLAC*.
It does so using a fraction of the size of the full `emflac.js` script,
and is also subject only to the [MIT][CMIT] license of *emflac*
and the [BSD-style license][CXiph] of *libFLAC*,
as opposed to the [GPL license][CGPL] of the full `flac` tool.

These improvements come at a cost, though.
It only supports WAV output, 16 bits per sample, one or two channels.
And only on little-endian systems.

### decodeSync(‹Uint8Array›[, ‹options›]) → ‹Uint8Array›

The script `decompress.js` exports a single symbol
called `emflac.decodeSync` in the browser
or `decodeSync` when used as a Node module.
Input is a `Uint8Array` representing the contents of the compressed file.
Output is a `Uint8Array` giving the corresponding WAV file.
Possible options include `TOTAL_MEMORY` and similar.

### Web worker decompression

The decompression tool can employ the same kind of web-worker protocol
as the full `emflac.js` script, except it's restricted to those settings
that actually make sense for its limited scope.
This includes `id`, `data`, `error` and `stack`
but excludes `arguments`, `stdout`, `stderr` and `exitStatus`.

## Convenience functions

While `decodeSync` is a first step towards providing conventient-to-use
functions for common tasks, more of these may be added to the project over time.
It is unclear whether these would end up in one of the existing output files
or in separate files tailored for their specific needs.

## Library access

Currently the symbols from libFLAC are not exported by the generated modules.
This may change in a future version.
If you have an application where you would need some of these functions
exported, feel free to file a ticket and request adding them to the code.

## License

The sources of `emflac` itself are licensed under the [MIT][CMIT] license.
However, this does not apply to the FLAC sources I link against.
Accoding to the FLAC README:

> FLAC is comprised of several components distributed under different licenses.
> The codec libraries are distributed under Xiph.Org's BSD-like license
> (see the file [`COPYING.Xiph`][CXiph] in this distribution).
> All other programs, libraries, and plugins are distributed
> under the LGPL or GPL
> (see [`COPYING.LGPL`][CLGPL] and [`COPYING.GPL`][CGPL]).

In particular, most parts of the `flac` command line utility
are covered by the GPL, and since that is the strictest of all these licenses,
this makes the final binary (i.e. emscripten output) GPL-licensed.
So while you may use part of this infrastructure under MIT license,
you have to conform to GPL for the project as a whole.

The decoder has more relaxed licensing, as described above.

[flac]: https://xiph.org/flac/
[refimpl]: https://xiph.org/flac/download.html
[emscripten]: https://kripken.github.io/emscripten-site/index.html
[npmjs]: https://www.npmjs.com/package/emflac
[useWorker]: https://github.com/gagern/emflac/blob/master/useWorker.html
[CMIT]: https://spdx.org/licenses/MIT.html#licenseText
[CXiph]: https://git.xiph.org/?p=flac.git;a=blob;f=COPYING.Xiph;h=c0361fd97ee56441037b4ab7df8e5a71b07e38fc;hb=0e11f73eabd3544f59937d0a0d8e076d7c9c2d1d
[CLGPL]: https://git.xiph.org/?p=flac.git;a=blob;f=COPYING.LGPL;h=5ab7695ab8cabe0c5c8a814bb0ab1e8066578fbb;hb=0e11f73eabd3544f59937d0a0d8e076d7c9c2d1d
[CGPL]: https://git.xiph.org/?p=flac.git;a=blob;f=COPYING.GPL;h=d159169d1050894d3ea3b98e1c965c4058208fe1;hb=0e11f73eabd3544f59937d0a0d8e076d7c9c2d1d
