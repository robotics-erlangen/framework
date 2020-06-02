FROM ubuntu:bionic

# unzip is required for luarocks
RUN set -xe; \
	apt-get update; \
	DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
		protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev libsdl2-dev libusb-1.0-0-dev \
		cmake ninja-build ccache g++ python \
		luarocks unzip \
		ca-certificates curl apt-transport-https gnupg \
		git git-lfs; \
	curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -; \
	echo 'deb https://deb.nodesource.com/node_12.x bionic main' > /etc/apt/sources.list.d/nodesource.list; \
	echo 'deb-src https://deb.nodesource.com/node_12.x bionic main' >> /etc/apt/sources.list.d/nodesource.list; \
	apt-get update; \
	DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nodejs; \
	apt-get clean; \
	rm -rf /var/lib/apt/lists/* ; \
	luarocks install luacheck; \
	npm install -g tslint@6.1.1 typescript@3.8.3; \
	wget -q https://developer.arm.com/-/media/Files/downloads/gnu-rm/7-2018q2/gcc-arm-none-eabi-7-2018-q2-update-linux.tar.bz2 -O gcc-arm.tbz2; \
	echo 299ebd3f1c2c90930d28ab82e5d8d6c0 gcc-arm.tbz2 > arm.md5; \
	md5sum -c arm.md5; \
	tar -xf gcc-arm.tbz2 -C /usr/local ; \
	rm gcc-arm.tbz2 arm.md5

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
	ln -s ../../bin/ccache /usr/lib/ccache/c++ ; \
	ln -s ../../bin/ccache /usr/lib/ccache/arm-none-eabi-gcc ; \
	ln -s ../../bin/ccache /usr/lib/ccache/arm-none-eabi-g++ ; \
	git lfs install

ENV V8_INCLUDE_DIR=/libs/v8-build/include
ENV V8_OUTPUT_DIR=/libs/v8-build/out/x64.release
ENV PATH="/usr/lib/ccache:/usr/local/gcc-arm-none-eabi-7-2018-q2-update/bin:$PATH"
ENV CCACHE_DIR="/ccache/ubuntu-18.04"
