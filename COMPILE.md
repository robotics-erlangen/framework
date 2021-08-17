# Setting up a build environment

All programs should work on GNU+Linux Mac OS X 10.10 and Windows >= 7.
Building is tested automatically on recent Ubuntu versions (currently 18.04 and
20.04)

In order to build the framework, you will need:
- `cmake` >= `3.5` (`3.7` on Windows)
- `g++` >= `4.6`
- `Qt` >= `5.9` (**NOT** `5.9.[0-2]` on Windows)

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
  * [Building V8 (optional)](#building-v8-optional-needed-for-javascript-support)
    * [Building V8 inside Docker](#building-v8-inside-docker)
  * [Building Ra](#building-the-framework)
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
cmake protobuf-compiler libprotobuf-dev qtbase5-dev libqt5opengl5-dev g++ libusb-1.0-0-dev libsdl2-dev libqt5svg5-dev
```
where `protobuf-compiler` and `libprotobuf-dev` will be built from source if
not already installed.
#### Manjaro
The package names are
```
cmake qt5-base patch pck-conf sdl2 libusb pkgconf
```
There is a provided `protobuf` package, however its current version breaks
compilation. It is advisable to let the build system build `protobuf` from
source.

### Building V8 (optional, needed for Javascript support)
Note, that this is **not required** for the simulator.

To build V8, `git` and `python2` are required to be executable commands.
The package names are

| Distribution       | Packages              |
|--------------------|-----------------------|
| Ubuntu 20.04       | `git python2` |
| Ubuntu 18.04       | `git python` |
| Manjaro            | `git python2` |

Also, the `python` command needs to be available and point to `python2`. On
Ubuntu 18.04, this is already the case when installing these
packages. **On Ubuntu 20.04 and Manjaro** you'll need to **temporarily** symlink
`python` to point to `python2` with
```
$ sudo ln -nfs /usr/bin/python{2,}
```
Remember to undo the link later, either by linking back to `python3` or by
deleting the symlink, depending on your system's default.

On Ubuntu 20.04, you can also install `python-is-python2`.

Finally, run the following in the repository root directory
```
$ libs/v8/build.sh
```

#### Building V8 inside Docker
You can also build V8 inside a Docker container and copy out the result. Take a
look at [`data/docker/README.md`](data/docker/README.md).

### Building the Framework

The recommended way of building a project with CMake is by doing an
out-of-source build. This can be done like this:
```
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

