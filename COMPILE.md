# Setting up a build environment

All programs should work on GNU+Linux Mac OS X 10.10 and Windows >= 7.
Building is tested automatically on recent Ubuntu versions (currently 18.04 and
20.04)

Currently, the software is also manually tested and proven to run for openSuse Leap and Manjaro

In order to build the framework, you will need:
- `cmake` >= `3.5` (`3.7` on Windows)
- `g++` >= `7.5`
- `Qt` >= `5.9` (**NOT** `5.9.[0-2]` on Windows)
- `libssl`

Also, `protobuf` >= `2.6.0` is required, but will be built from source when no
suitable version is found.

Certain features require additional libraries:
- `libusb-1.0` >= `1.0.9` - USB communication with a wireless transceiver
- `libsdl2` >= `2.0.2` - Gamepad support
- `libudev` - required for Gamepad support (only required if `libsdl2` is not available via the package manager)
- `libqt5svg5-dev` - Required for taking SVG screenshots of the fieldwidget
- `python2` and `git` - Required to build V8

## Table Of Contents
- [Note for Robocup 2021 participants](#note-for-robocup-2021-participants)
- [Linux](#linux)
  * [Required packages](#required-packages)
    * [Ubuntu 18.04/20.04](#ubuntu-18042004)
    * [Manjaro](#manjaro)
    * [Open Suse](#open-suse)
  * [Building V8 (optional)](#building-v8-optional-needed-for-javascript-support)
  * [Building the Framework](#building-the-framework)
- [Windows](#windows)
  * [Setup](#setup)
  * [Compiling](#compiling)
  * [Common problems](#common-problems)
- [macOS](#macos)

## Note for Robocup 2021 participants
None of the additional libraries are required to use the simulator. You'll
just need to install the required dependencies.

The following instructions advise to execute `make` without arguments, thus
building **all** targets. This is **not needed** if you just want to use the
`simulator-cli`.  Build it using `make simulator-cli`, that will be significantly
faster.

## Linux

### Required packages

#### Ubuntu 18.04/20.04
The package names are
```
cmake protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev g++ libusb-1.0-0-dev libsdl2-dev libqt5svg5-dev libssl-dev
```
where `protobuf-compiler` and `libprotobuf-dev` will be built from source if
not already installed.
#### Manjaro
The package names are
```
cmake qt5-base patch pck-conf sdl2 libusb pkgconf openssl
```
There is a provided `protobuf` package, however its current version breaks
compilation. It is advisable to let the build system build `protobuf` from
source.

#### Open Suse
The required packages can be installed with
```
sudo zypper install git cmake libqt5-qtbase-devel libusb-1_0-devel libqt5-qtsvg-devel python2-pip libudev-devel patch glu-devel openssl-devel
```

For building V8 you need to select pip2 as pip, with
```
sudo alternatives --config pip
```

Currently, builing the firmware on open suse is not supported.
To ignore the firmware, even if you already have some arm compiler installed, use
```
cmake -DBUILD_FIRMWARE=false ..
```

instead of the normale cmake command (`cmake ..`)

### Building V8 (optional, needed for Javascript support)
Note, that this is **not required** for the simulator.

There are multiple options to obtain V8 binaries.

1. Download the precompiled version through CMake by specifying the `DOWNLOAD_V8` option.
To do so, invoke `cmake` using `cmake -DDOWNLOAD_V8=ON`
This might not support all operating systems or distributions.

2. Build V8 yourself.
Take a look at [`data/scripts/README.md`](data/scripts/README.md).
### Building the Framework

The recommended way of building a project with CMake is by doing an
out-of-source build. This can be done like this:
```
mkdir build && cd build
cmake ..
make
```

Alternatively in order to select which Qt-Installation to use specify it using a similar command line:
```
cmake -DCMAKE_PREFIX_PATH=~/Qt/5.6/gcc_64/lib/cmake ..
```

In order to download and use the precompiled V8, use:
```
cmake -DDOWNLOAD_V8=TRUE ..
```

The framework has an "easy mode" version we use to introduce new members to our software.
It disables some of the features to make it less likely for new people to accidentally change something they didn't want to change.
For example the simulator, kicker and internal referee can't be disabled in this version.
It also changes the default config to make it easier to just start, e.g. select all robots.
To build the easy mode version use:
```
cmake -DEASY_MODE=TRUE ..
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

## Windows

Compilation on Windows is done using `MSYS2` and `cmake`. You'll also need to
install `Qt 5`.

### Setup

First, download dependencies and setup the compiler environment. The setup is
tested using the given versions.

#### cmake
Use the [cmake 3.15.5 installer](https://github.com/Kitware/CMake/releases/download/v3.15.5/cmake-3.15.5-win64-x64.msi)
and select add to `PATH`.

#### MSYS2
Run the [installer](http://repo.msys2.org/distrib/x86_64/msys2-x86_64-20190524.exe)
(use the default path `C:\msys64`). Open `MSYS2 MSYS` and run the following command
```
$ pacman -Syu
```
Close the console when prompted and open it again
```
$ pacman -Su
# Dependencies for Ra
$ pacman -S patch make mingw-w64-i686-gcc mingw-w64-i686-cmake mingw-w64-i686-ninja
# Dependencies for V8
$ pacman -S python2 git
```
Close the MSYS console.

#### QT 5
Run the [online installer](http://download.qt.io/official_releases/online_installers/qt-unified-windows-x86-online.exe) (use the default install path).
- On **32bit**, install `QT 5.13.2 > MinGW 7.3.0 32-bit`
- On **64bit**, install `QT 5.13.2 > MinGW 7.3.0 64-bit`

In case you use the offline installer, change to install path such that `Qt
5.13.2` ends up in `c:\Qt\5.13.2`.

### Compiling
After setting up the dependencies, you are ready to start the compilation

**DO**
- **USE THE `MSYS2` CONSOLE CORRESPONDING TO YOUR ARCHITECTURE TO COMPILE EVERYTHING** i.e. `MSYS2 MinGW 32-bit` on 32-bit systems, and `MSYS2 MinGW 64-bit` on 64-bit systems
- Use a folder with a short path like `C:\software` as base folder
- Recreate the build folder after updating `Qt` or the compiler

**DON'T**
- Use a folder whose path contains whitespace
- Use a base folder with a path name longer 30 characters

If you're compiling on a 32bit system, setup the shell like this
```
$ export USED_QT=/c/Qt/5.13.2/mingw73_32/lib/cmake
```
On a 64bit system, do this
```
$ export PATH=/c/Qt/Tools/mingw730_64/bin:$PATH
$ export USED_QT=/c/Qt/5.13.2/mingw73_64/lib/cmake
```
To compile Ra, run the following commands
```
$ libs/v8/build.sh
$ mkdir build-win && cd build-win
$ cmake -GNinja -DCMAKE_PREFIX_PATH="$USED_QT" -DCMAKE_BUILD_TYPE=Release ..
```
Then close the shell to reset the PATH variable and in the new shell you can build with
```
$ cmake --build .
$ cmake --build . --target assemble
```
Automatic packing of Ra is possible with
```
$ cmake --build . --target pack
```
Note than when doing this, the other calls to `cmake --build` are not necessary.
### Common problems

#### Windows 7 - Problems with USB driver installation
In case windows does not automatically find the driver for the transceiver, follow
the following steps:
- Access the website http://catalog.update.microsoft.com/
- Search for "windows phone winusb" and download "Windows Phone - Other hardware - WinUsb Device"
- Unpack the downloaded _cab_ files, so that there is a file with the name `winusbcompat.inf`
- Open the device manager and choose to manually select a driver for the transceiver.
  Then select the folder containing the `winusbcompat.inf`.

## macOS
Homebrew requires Xcode and Command Line Utilities.

Install Xcode from the App Store, run it once and then install the utilities with:
```
xcode-select --install
```

Get dependencies using [Homebrew](http://brew.sh):

```
brew install cmake git sdl2 protobuf libusb python@2 qt@5
```

Build using:
```
$ cd path/to/framework
$ libs/v8/build.sh
$ mkdir build-mac && cd build-mac
$ cmake -DCMAKE_BUILD_TYPE=Release ..
$ make
```

(If starting `Ra.app` the normal way doesn't work launch it from Qt Creator)

