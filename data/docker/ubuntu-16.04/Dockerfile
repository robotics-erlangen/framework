FROM ubuntu:xenial

# unzip is required for luarocks
RUN set -xe; \
	apt-get update; \
	DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
		protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev libsdl2-dev libusb-1.0-0-dev \
		cmake ninja-build ccache g++ gcc-arm-none-eabi gdb-arm-none-eabi libnewlib-arm-none-eabi libstdc++-arm-none-eabi-newlib \
		luarocks unzip \
		npm ca-certificates \
		git; \
	apt-get clean; \
	rm -rf /var/lib/apt/lists/* ; \
	luarocks install luacheck; \
	npm -g install tslint typescript; \
	ln -s /usr/bin/nodejs /usr/bin/node

COPY libs /libs
RUN set -xe; \
	/libs/v8/build.sh ; \
	mkdir -p /libs/v8-build/out ; \
	cp -r /libs/v8/v8/include /libs/v8-build/ ; \
	cp -r /libs/v8/v8/out/x64.release /libs/v8-build/out ; \
	rm -rf /libs/v8

# also wrap cc and c++ with ccache as cmake uses those
RUN set -xe; \
	ln -s ../../bin/ccache /usr/lib/ccache/cc ; \
	ln -s ../../bin/ccache /usr/lib/ccache/c++

ENV V8_INCLUDE_DIR=/libs/v8-build/include
ENV V8_OUTPUT_DIR=/libs/v8-build/out/x64.release
ENV PATH="/usr/lib/ccache:$PATH"
ENV CCACHE_DIR="/ccache/ubuntu-16.04"
