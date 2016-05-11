# Compiling Ra

    Robotics Erlangen e.V.
    http://www.robotics-erlangen.de/
    info@robotics-erlangen.de


All programs should work on GNU/Linux (tested on Ubuntu 14.04), Mac OS X 10.10 and Windows >= 7.

In order to build Ra you will need:
 * cmake >= 2.8.12
 * g++ >= 4.6
 * qt >= 5.1.0, NOT 5.4.2 and 5.5.0 on all system; NOT 5.4.x on Mac
 * protobuf >= 2.0.0
 * luajit >= 2.0

Certain features require additional libraries:
 * libusb-1.0 - USB communication (version >= 1.0.9)
 * libsdl2 - Joystick support (version >= 2.0.2)
 * libudev - Required for joystick support (only required if libsdl2 is not available via the package manager)

Package names for Ubuntu 14.04: `cmake protobuf-compiler qtbase5-dev libsdl2-dev libluajit-5.1-dev libusb-1.0-0-dev g++`

## Linux
The recommended way of building a project with CMake is by doing an
out-of-source build. This can be done like this:

```
mkdir build
cd build
cmake ..
make
```

Ra and the Logplayer can be started from the build/bin/ directory.
To install the desktop files use this command:
```
make install-menu
```

In order to select which Qt-Installation to use specify it using a similar command line:
```
cmake -DCMAKE_PREFIX_PATH=~/Qt/5.4/gcc_64/lib/cmake ..
```

To be able to use the USB transceiver / JTAG programmer the rights for udev have to be modified.
Just copy the file at `data/udev/99-robotics-usb-devices.rules` to `/etc/udev/rules.d/99-robotics-usb-devices.rules`

## Windows
Get dependencies (tested using the given versions):
* cmake 3.2.2 - http://www.cmake.org/files/v3.2/cmake-3.2.2-win32-x86.exe
* mingw-get - http://sourceforge.net/projects/mingw/files/Installer/mingw-get-setup.exe
* ninja - https://github.com/martine/ninja/releases/download/v1.6.0/ninja-win.zip
* Qt 5 - http://download.qt.io/official_releases/online_installers/qt-opensource-windows-x86-online.exe
* protobuf 2.6.1 - https://github.com/google/protobuf/releases/download/v2.6.1/protobuf-2.6.1.tar.bz2
* luajit 2.0.3 - http://luajit.org/download/LuaJIT-2.0.4.tar.gz
* libusb 1.19 - http://downloads.sourceforge.net/project/libusb/libusb-1.0/libusb-1.0.19/libusb-1.0.19.tar.bz2
http://downloads.sourceforge.net/project/libusb/libusb-1.0/libusb-1.0.20/libusb-1.0.20.tar.bz2
* libsdl2 2.0.2 - http://libsdl.org/release/SDL2-devel-2.0.2-mingw.tar.gz

#### install cmake
use the installer, select add to PATH

#### install qt
run installer (use default install path! ), install "Qt 5.5 > MinGW 4.9.2" and "Tools > MinGW 4.9.2"

#### install mingw-get
Run installer (use default path C:\MinGW !) and install `msys-base, msys-patch`

Run `C:\mingw\msys\1.0\postinstall\pi.bat` set mingw path to `c:/Qt/Tools/mingw492_32`

use `msys.bat` in `msys\1.0` to open msys console

#### install ninja
Extract `ninja.exe` to `C:\MinGW\msys\1.0\bin`

**!!! USE MSYS TO COMPILE EVERYTHING !!!**

#### compile protobuf
```
mkdir build && cd build
../configure --prefix=/usr/local --without-zlib && make && make install
```

#### compile luajit
```
make && make install PREFIX=/usr/local && cp src/lua51.dll /usr/local/bin
```

#### compile libusb
```
mkdir build && cd build
../configure --prefix=/usr/local && make CFLAGS="-DWINVER=0x0501" && make install
```

#### install libsdl2(prebuilt mingw package!)
```
make install-package arch=i686-w64-mingw32 prefix=/usr/local
```

#### compile ra
```
mkdir build-win && cd build-win
cmake -GNinja -DCMAKE_PREFIX_PATH=/c/Qt/5.5/mingw492_32/lib/cmake -DCMAKE_BUILD_TYPE=Release -DLUA_INCLUDE_DIR=C:/MinGW/msys/1.0/local/include/luajit-2.0 -DLUA_LIBRARIES=C:/MinGW/msys/1.0/local/bin/lua51.dll -DPROTOBUF_INCLUDE_DIR=C:/MinGW/msys/1.0/local/include -DPROTOBUF_LIBRARY=C:/MinGW/msys/1.0/local/lib/libprotobuf.dll.a -DSDL2_INCLUDE_DIR=C:/MinGW/msys/1.0/local/include/SDL2 -DUSB_INCLUDE_DIR=C:/MinGW/msys/1.0/local/include/libusb-1.0 ..
cmake --build .
cp -r ../config ../data bin
cp /usr/local/bin/{libprotobuf-9,libusb-1.0,lua51,SDL2}.dll /c/Qt/5.5/mingw492_32/bin/{icudt54,icuin54,icuuc54,libgcc_s_dw2-1,libstdc++-6,libwinpthread-1,Qt5Core,Qt5Gui,Qt5Network,Qt5OpenGL,Qt5Widgets}.dll bin
mkdir bin/platforms && cp /c/Qt/5.5/mingw492_32/plugins/platforms/qwindows.dll bin/platforms
```

Finished!


## Mac OS X
Get dependencies using [Homebrew](http://brew.sh):
```
brew install cmake git sdl2 luajit protobuf libusb
```
Run the following command and install Xcode and/or the Command Line Developer Tools if prompted to do so.
```
xcode-select --install
```
Start Xcode once afterwards to ensure that everything gets setup. Starting Xcode may also be necessary after an update.

Download Qt 5 from http://qt-project.org and install it.
WARNING: DO NOT install Qt 5.4.0-5.5.0; Qt 5.5.1 is ok

Build using:
```
cd path/to/framework
mkdir build-mac && cd build-mac
cmake -DCMAKE_PREFIX_PATH=~/Qt/5.5/clang_64/lib/cmake -DCMAKE_BUILD_TYPE=Release ..
make
```

(If starting ra.app the normal way doesn't work launch it from Qt Creator)
