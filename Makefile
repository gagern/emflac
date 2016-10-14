CONFIG = release

DEFINES = \
	-DFLAC__CPU_UNKNOWN \
	-DFLAC__NO_ASM \
	-DFLAC__ALIGN_MALLOC_DATA

MAKEARGS = \
	USE_OGG=0 \
	USE_ICONV=0 \
	USE_LROUND=1 \
	USE_FSEEKO=1 \
	USE_LANGINFO_CODE=0 \
	OS=Browser \
	PROC=JavaScript \
	CC=emcc \
	LINK='$(LINK)' \
	CUSTOM_CFLAGS='-iquote $(CURDIR)/override' \
	DEFINES='$(DEFINES)' \
	DYNAMIC_LIB_SUFFIX=bc \
	$(EXTRA_MAKEARGS)

LIBS = libFLAC share
BINS = flac
PARTS = $(LIBS) $(BINS)

FLACJS = flac/objs/$(CONFIG)/bin/flac.js

default: emflac.js decode.js

all: $(PARTS)

clean:
	$(MAKE) -C flac/src -f Makefile.lite $(MAKEARGS) clean

.PHONY: default all clean $(PARTS)

$(PARTS):
	$(MAKE) -C flac/src/$@ -f Makefile.lite $(MAKEARGS) $(CONFIG)

$(LIBS): LINK = emar cru

$(BINS): LINK = $(CURDIR)/linkexe $(LINKFLAGS)

stamp: linkexe head.js tail.js
	$(RM) $(FLACJS)
	@touch $@

flac: libFLAC share stamp
flac: EXTRA_MAKEARGS = PROGRAM_NAME=flac.js

emflac.js: flac
	@if test $(FLACJS) -nt $@; then cp -v $(FLACJS) $@; else :; fi

DECODE_SRCS = ccargs.txt bind.c lib.js head.js tail.js

decode.js: $(DECODE_SRCS:%=decode/%) libFLAC
	emcc $(shell paste -d' ' -s decode/ccargs.txt ) $(LINKFLAGS)
