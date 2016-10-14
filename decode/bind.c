#include "FLAC/stream_decoder.h"

int js_read_cb(int pos, int length, FLAC__byte buffer[]);

int js_write_cb(
    unsigned blocksize,
    unsigned sample_rate,
    unsigned channels,
    unsigned channel_assignment,
    unsigned bits_per_sample,
    unsigned number_type,
    FLAC__uint32 number_hi,
    FLAC__uint32 number_lo,
    const FLAC__int32 *const buffers[],
    const FLAC__int32 *buffer0,
    const FLAC__int32 *buffer1);

void js_streaminfo_cb(
    unsigned min_blocksize,
    unsigned max_blocksize,
    unsigned min_framesize,
    unsigned max_framesize,
    unsigned sample_rate,
    unsigned channels,
    unsigned bits_per_sample,
    FLAC__uint32 total_samples_hi,
    FLAC__uint32 total_samples_lo,
    const FLAC__byte md5sum[]);

void js_error_cb(unsigned status);

int readPos = 0;
int readEnd = 0;

static FLAC__StreamDecoderReadStatus read_cb(
    const FLAC__StreamDecoder *decoder,
    FLAC__byte buffer[],
    size_t *bytes,
    void *client_data) {
  if (*bytes <= 0)
    return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
  int res = js_read_cb(readPos, *bytes, buffer);
  if (res < 0) {
    *bytes = 0;
    return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
  }
  *bytes = res;
  if (res == 0)
    return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM;
  readPos += res;
  return FLAC__STREAM_DECODER_READ_STATUS_CONTINUE;
}
 
static FLAC__StreamDecoderSeekStatus seek_cb(
    const FLAC__StreamDecoder *decoder,
    FLAC__uint64 absolute_byte_offset,
    void *client_data) {
  if (absolute_byte_offset > readEnd)
    return FLAC__STREAM_DECODER_SEEK_STATUS_ERROR;
  readPos = absolute_byte_offset;
  return FLAC__STREAM_DECODER_SEEK_STATUS_OK;
}
 
static FLAC__StreamDecoderTellStatus tell_cb(
    const FLAC__StreamDecoder *decoder,
    FLAC__uint64 *absolute_byte_offset,
    void *client_data) {
  *absolute_byte_offset = readPos;
  return FLAC__STREAM_DECODER_TELL_STATUS_OK;
}
 
static FLAC__StreamDecoderLengthStatus length_cb(
    const FLAC__StreamDecoder *decoder,
    FLAC__uint64 *stream_length,
    void *client_data) {
  *stream_length = readEnd;
  return FLAC__STREAM_DECODER_LENGTH_STATUS_OK;
}
 
static FLAC__bool eof_cb(
    const FLAC__StreamDecoder *decoder,
    void *client_data) {
  return readPos == readEnd ? true : false;
}
 
static FLAC__StreamDecoderWriteStatus write_cb(
    const FLAC__StreamDecoder *decoder,
    const FLAC__Frame *frame,
    const FLAC__int32 *const buffer[],
    void *client_data) {
  FLAC__uint64 number;
  if (frame->header.number_type == FLAC__FRAME_NUMBER_TYPE_SAMPLE_NUMBER)
    number = frame->header.number.sample_number;
  else
    number = frame->header.number.frame_number;
  int res = js_write_cb(
    frame->header.blocksize,
    frame->header.sample_rate,
    frame->header.channels,
    frame->header.channel_assignment,
    frame->header.bits_per_sample,
    frame->header.number_type,
    number >> 32, number & 0xffffffffu,
    buffer,
    buffer[0],
    frame->header.channels > 1 ? buffer[1] : NULL);
  if (res == 0)
    return FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE;
  else
    return FLAC__STREAM_DECODER_WRITE_STATUS_ABORT;
}

static void metadata_cb(
    const FLAC__StreamDecoder *decoder,
    const FLAC__StreamMetadata *metadata,
    void *client_data) {
  if (metadata->type != FLAC__METADATA_TYPE_STREAMINFO)
    return;
  const FLAC__StreamMetadata_StreamInfo *info = &metadata->data.stream_info;
  js_streaminfo_cb(
    info->min_blocksize,
    info->max_blocksize,
    info->min_framesize,
    info->max_framesize,
    info->sample_rate,
    info->channels,
    info->bits_per_sample,
    info->total_samples >> 32, info->total_samples & 0xffffffffu,
    info->md5sum);
}
 
static void error_cb(
    const FLAC__StreamDecoder *decoder,
    FLAC__StreamDecoderErrorStatus status,
    void *client_data) {
  js_error_cb(status);
}

static int process(FLAC__StreamDecoder *decoder);

int decodeSyncCore(int totalLength) {
  FLAC__StreamDecoder *decoder;
  readPos = 0;
  readEnd = totalLength;
  if ((decoder = FLAC__stream_decoder_new()) == NULL)
    return 1;
  int res = process(decoder);
  FLAC__stream_decoder_delete(decoder);
  return res;
}

static int process(FLAC__StreamDecoder *decoder) {
  FLAC__stream_decoder_set_md5_checking(decoder, true);
  FLAC__StreamDecoderInitStatus init_status = FLAC__stream_decoder_init_stream(
        decoder, read_cb, seek_cb, tell_cb, length_cb, eof_cb,
        write_cb, metadata_cb, error_cb, NULL);
  if (init_status != FLAC__STREAM_DECODER_INIT_STATUS_OK)
    return 10 + init_status;
  FLAC__bool ok = FLAC__stream_decoder_process_until_end_of_stream(decoder);
  int res = ok ? 0 : 20 + FLAC__stream_decoder_get_state(decoder);
  FLAC__stream_decoder_finish(decoder);
  return res;
}
