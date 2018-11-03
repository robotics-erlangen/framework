# Compiling Ra

    Robotics Erlangen e.V.
    http://www.robotics-erlangen.de/
    info@robotics-erlangen.de


All programs should work on GNU/Linux (tested on Ubuntu 16.04), Mac OS X 10.10 and Windows >= 7.

In order to build Ra you will need:
 * cmake >= 3.5 (3.7 on Windows)
 * g++ >= 4.6
 * qt >= 5.6.0, NOT 5.4.2 and 5.5.0 on all system; NOT 5.4.x on Mac; NOT 5.9.[0-2] on Windows
 * protobuf >= 2.6.0

Certain features require additional libraries:
 * libusb-1.0 - USB communication (version >= 1.0.9)
 * libsdl2 - Joystick support (version >= 2.0.2)
 * libudev - Required for joystick support (only required if libsdl2 is not available via the package manager)

## Linux
Names of required package for Ubuntu 16.04: `cmake protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev libsdl2-dev libusb-1.0-0-dev g++`
Only on Ubuntu 14.04 you'll need `cmake3`.

Names of required package for Arch/Manjaro (tested on Manjaro 17.1.15): `cmake qt5-base protobuf sdl2 libusb`

The recommended way of building a project with CMake is by doing an
out-of-source build. This can be done like this:

```
libs/v8/build.sh
mkdir build && cd build
cmake ..
make
```

To be able to use the USB transceiver / JTAG programmer the rights for udev have to be modified.
This only needs to be done once.
```
sudo cp data/udev/99-robotics-usb-devices.rules /etc/udev/rules.d/99-robotics-usb-devices.rules
```

Ra and the Logplayer can be started from the build/bin/ directory.
To install the desktop files use this command:
```
make install-menu
```

In order to select which Qt-Installation to use specify it using a similar command line:
```
cmake -DCMAKE_PREFIX_PATH=~/Qt/5.6/gcc_64/lib/cmake ..
```

## Windows
Get dependencies (tested using the given versions):
* cmake 3.9.2 - https://cmake.org/files/v3.9/cmake-3.9.2-win32-x86.msi
* MSYS2 - http://repo.msys2.org/distrib/x86_64/msys2-x86_64-20180531.exe
* Qt 5 - http://download.qt.io/official_releases/online_installers/qt-unified-windows-x86-online.exe

### install compiler environment

#### install cmake
use the installer, select add to PATH

#### install qt
Use the online installer! run installer (use default install path! ), install "Qt 5.11.1 > MinGW 5.3.0" and "Tools > MinGW 5.3.0". Qt 5.11.1 is a LTS release and thus should stay supported for some time.
In case you use the offline installer, change to install path such that Qt 5.11.1 ends up in `c:\Qt\5.11.1`

#### install MSYS2
Run installer (use default path C:\msys64 !)
Open `MSYS2 MSYS` and run the following commands
```
pacman -Syu
```
Close the console when promted and open it again
```
pacman -Su
# dependencies for ra
pacman -S patch make mingw-w64-i686-gcc mingw-w64-i686-cmake mingw-w64-i686-ninja
# dependencies for v8
pacman -S python2 git
```

### compile ra
*Do:*
- **!!! USE THE `MSYS2 MinGW 32-bit` CONSOLE TO COMPILE EVERYTHING !!!**
- Use a folder with a short path like `C:\Robocup` as base folder
- Recreate the build folder after updating Qt or the Compiler

*Don't:*
- Use a folder whose path contains whitespace
- Use a base folder with a path name longer than 30 characters

```
libs/v8/build.sh
mkdir build-win && cd build-win
cmake -GNinja -DCMAKE_PREFIX_PATH=/c/Qt/5.11.1/mingw53_32/lib/cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build .
cmake --build . --target assemble
```

Automatic packing of ra is possible with (Note that the other calls to `cmake --build` are **not** necessary):
```
cmake --build . --target pack
```

Finished!


#### Windows 7 - problems with usb driver installation
In case windows does not automatically find the driver for the transceiver, follow
the following steps:
- Access the website http://catalog.update.microsoft.com/
- Search for "windows phone winusb" and download "Windows Phone - Other hardware - WinUsb Device"
- Unpack the downloaded _cab_ files, so that there is a file with the name `winusbcompat.inf`
- Open the device manager and choose to manually select a driver for the transceiver.
  Then select the folder containing the `winusbcompat.inf`.


## Mac OS X
Get dependencies using [Homebrew](http://brew.sh):
```
brew install cmake git sdl2 protobuf libusb
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
libs/v8/build.sh
mkdir build-mac && cd build-mac
cmake -DCMAKE_PREFIX_PATH=~/Qt/5.6/clang_64/lib/cmake -DCMAKE_BUILD_TYPE=Release ..
make
```

(If starting ra.app the normal way doesn't work launch it from Qt Creator)


# Compiling a strategy


In order to build a strategy you will need:
 * node
 * prebuilt butterflyscript-compiler

## Linux
Names of required package for Ubuntu 16.04: `npm`

To build a strategy using the precompiled butterflyscript-compiler call `node /path/to/tsc -w` in strategy/typescript.
The resulting compiled strategy can be found in strategy/built/strategy_name/init.js

## Windows
Install node LTS via installer (https://nodejs.org/en/download/)

To build a strategy using the precompiled butterflyscript-compiler type `node /path/to/tsc -w` in the Windows Powershell while beeing in strategy/typescript.
The resulting compiled strategy can be found in strategy/built/strategy_name/init.js
