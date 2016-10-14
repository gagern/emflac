mergeInto(LibraryManager.library, {

  js_read_cb: function(pos, length, buffer) {
    var data = Module["flacData"];
    var end = Math["min"](data["length"], pos + length);
    HEAPU8["set"](data["subarray"](pos, end), buffer);
    return end - pos;
  },

  js_write_cb: function(
      blocksize, sample_rate, channels, channel_assignment, bits_per_sample,
      number_type, number_hi, number_lo, buffers, buffer0, buffer1) {
    if (bits_per_sample !== 16) {
      Module["flacErrorMessage"] =
        "Only 16 bits per sample supported, input has " + bits_per_sample;
      return 1;
    }
    if (channels !== 1 && channels !== 2) {
      Module["flacErrorMessage"] =
        "Only 1 or 2 channels supported, input has " + channels;
      return 2;
    }
    var inbufs = (channels == 1) ? [buffer0] : [buffer0, buffer1];
    var ch;
    for (ch = 0; ch < channels; ++ch) {
      if (inbufs[ch] & 3) {
        Module["flacErrorMessage"] = "Unaligned buffer";
        return 3;
      }
      inbufs[ch] >>= 2;
    }
    var outbuf;
    var outpos = 0;
    if (bits_per_sample === 16) {
      outbuf = new Int16Array(blocksize * channels);
      for (var sample = 0; sample < blocksize; ++sample)
        for (ch = 0; ch < channels; ++ch)
          outbuf[outpos++] = HEAP32[inbufs[ch]++];
    }
    Module["wavData"]["push"](outbuf);
  },

  js_streaminfo_cb: function(
      min_blocksize, max_blocksize, min_framesize, max_framesize,
      sample_rate, channels, bits_per_sample,
      total_samples_hi, total_samples_lo, md5sum) {
    var headlen = 16;
    var blockAlign = channels * (bits_per_sample >>> 3);
    var datalen = total_samples_lo * blockAlign;
    var buf = new ArrayBuffer(headlen + 2*8 + 12);
    var head = new DataView(buf);
    head.setUint32(0, 0x52494646, false); // RIFF
    head.setUint32(4, headlen + datalen + 2*8 + 4, true);
    head.setUint32(8, 0x57415645, false); // WAVE
    head.setUint32(12, 0x666d7420, false); // fmt
    head.setUint32(16, headlen, true); // fmt
    var pos = 20;
    head.setUint16(pos, 1, true); // formatTag: PCM
    head.setUint16(pos + 2, channels, true);
    head.setUint32(pos + 4, sample_rate, true);
    head.setUint32(pos + 8, sample_rate * blockAlign, true);
    head.setUint16(pos + 12, blockAlign, true);
    head.setUint16(pos + 14, bits_per_sample, true);
    pos += headlen;
    head.setUint32(pos, 0x64617461, false); // data
    head.setUint32(pos + 4, datalen, true);
    pos += 8;
    if (pos !== buf.byteLength)
      throw Error("WAV header length mismatch");
    if (bits_per_sample === 16)
      buf = new Int16Array(buf);
    Module["wavData"] = [buf];
  },

  js_error_cb: function(status) {
    Module["flacErrorStatus"] = status + 30;
  },

});
