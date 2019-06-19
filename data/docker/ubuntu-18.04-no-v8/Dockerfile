FROM ubuntu:bionic

# unzip is required for luarocks
RUN set -xe; apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
        protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev libsdl2-dev libusb-1.0-0-dev \
	cmake ninja-build ccache g++ gcc-arm-none-eabi libnewlib-arm-none-eabi libstdc++-arm-none-eabi-newlib \
	luarocks unzip \
	npm ca-certificates \
	git git-lfs; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/* ; \
	luarocks install luacheck; \
	npm -g install tslint typescript ; \
	wget -q https://developer.arm.com/-/media/Files/downloads/gnu-rm/7-2018q2/gcc-arm-none-eabi-7-2018-q2-update-linux.tar.bz2 -O gcc-arm.tbz2; \
	echo 299ebd3f1c2c90930d28ab82e5d8d6c0 gcc-arm.tbz2 > arm.md5; \
	md5sum -c arm.md5; \
	tar -xf gcc-arm.tbz2 -C /usr/local ; \
	rm gcc-arm.tbz2 arm.md5 ; \
	ln -s ../../bin/ccache /usr/lib/ccache/cc ; \
	ln -s ../../bin/ccache /usr/lib/ccache/c++ ; \
	git lfs install

ENV PATH="/usr/lib/ccache:/usr/local/gcc-arm-none-eabi-7-2018-q2-update/bin:$PATH"
ENV CCACHE_DIR="/ccache/ubuntu-18.04-no-v8"
