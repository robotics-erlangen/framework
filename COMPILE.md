# Setting up a build environment

All programs should work on GNU+Linux Mac OS X 10.10 and Windows >= 7.
Building is tested automatically on recent Ubuntu versions (currently 20.04, 22.04 and
24.04)

Currently, the software is also manually tested and proven to run for openSuse Leap and Manjaro

In order to build the framework, you will need:
- `cmake` >= `3.11`
- `g++` >= `7.5`
- `Qt` >= `6.2`
- `libssl`

Also, `protobuf` >= `2.6.0` is required, but will be built from source when no
suitable version is found.

Certain features require additional libraries:
- `libusb-1.0` >= `1.0.9` - USB communication with a wireless transceiver
- `libsdl2` >= `2.0.2` - Gamepad support
- `libudev` - required for Gamepad support (only required if `libsdl2` is not available via the package manager)
- `libqt6svg6-dev` - Required for taking SVG screenshots of the fieldwidget
- `python2` and `git` - Required to build V8

## Note for Robocup 2021 participants
None of the additional libraries are required to use the simulator. You'll
just need to install the required dependencies.

The following instructions advise to execute `make` without arguments, thus
building **all** targets. This is **not needed** if you just want to use the
`simulator-cli`.  Build it using `make simulator-cli`, that will be significantly
faster.

## Linux

### Required packages

#### Ubuntu 22.04/24.04
The package names are
```
cmake protobuf-compiler libprotobuf-dev qt6-base-dev libqt6opengl6-dev g++ libusb-1.0-0-dev libsdl2-dev libqt6svg6-dev libssl-dev
```
where `protobuf-compiler` and `libprotobuf-dev` will be built from source if
not already installed.

These additional packages are needed to debug the firmware:
```
libncursesw5 python3.8
```
This custom repository contains python3.8 if it isn't available in the standard repos anymore:
```
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
```
#### Arch/Manjaro
The package names are
```
cmake qt6-base patch base-devel sdl2 libusb pkgconf openssl
```
There is a provided `protobuf` package, however its current version breaks
compilation. It is advisable to let the build system build `protobuf` from
source.

#### Fedora (tested with Fedora 42)
The required packages can be installed with
```
dnf install cmake pkgconf patch libusb1 libusb1-devel mesa-libGLU-devel mesa-libGL-devel openssl-devel qt6-qtbase-devel qt6-qtsvg g++
```
There are provided `protobuf-compiler` and `protobuf-devel` packages, however we require 3.21.12 and the version in fedora 42 is 3.19.6.
It is advisable to let the build system build `protobuf` from source.

#### Open Suse (tested with Leap 15.6)
The required packages can be installed with
```
sudo zypper install git cmake qt6-base-devel qt6-svg-devel libusb-1_0-devel libudev1 patch glu-devel libopenssl-devel
```

Currently, builing the firmware on open suse is not supported.
To ignore the firmware, even if you already have some arm compiler installed, use
```
cmake -DBUILD_FIRMWARE=FALSE ..
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

Compilation on Windows is done using `MSYS2`.

### Setup

First, download dependencies and setup the compiler environment. The setup is
tested using the given versions.

#### MSYS2
Run the most recent [installer](http://repo.msys2.org/distrib/x86_64) (e.g. msys2-x86_64-20190524.exe)
(use the default path `C:\msys64`). Open `MSYS2 MINGW64` (NOT MSYS2 UCRT) and run the following command
```
$ pacman -Syu
```
Close the console when prompted and open it again
```
$ pacman -Su
# Dependencies for Ra
$ pacman -S patch make git mingw-w64-x86_64-gcc mingw-w64-x86_64-cmake mingw-w64-x86_64-ninja mingw-w64-x86_64-qt6-base mingw-w64-x86_64-qt6-svg mingw-w64-x86_64-SDL2 mingw-w64-x86_64-libusb
# Dependencies for V8
$ pacman -S python3 git
```
Close the MSYS console.
It is very helpful to set the home directory of mingw to your actual home directory (the default one is something like C:\msys2\mingw64\usr\home).
To accomplish this you have two options:
1. Creating/updating /etc/nsswitch.conf with a line
```
db_home: windows
```
This way not only is the home where you expect it to be, but git and more specifically ssh finds your C:\Users\<username>\.ssh directory.
2. Set/create the environment variable HOME to whatever you want e.g. C:\Users\<insert your username>.
If you don't know how to do that google "set environment variable windows".
Beware that git might not work with this option.

### Compiling
After setting up the dependencies, you are ready to start the compilation

**DO**
- **USE THE `MSYS2` CONSOLE CORRESPONDING TO YOUR ARCHITECTURE TO COMPILE EVERYTHING** i.e. `MSYS2 MinGW 32-bit` on 32-bit systems, and `MSYS2 MinGW 64-bit` on 64-bit systems
- Use a folder with a short path like `C:\software` as base folder
- Recreate the build folder after updating `Qt` or the compiler

**DON'T**
- Use a folder whose path contains whitespace
- Use a base folder with a path name longer 30 characters

To compile Ra, run the following commands
```
$ libs/v8/build.sh
$ mkdir build-win && cd build-win
$ cmake -GNinja -DCMAKE_BUILD_TYPE=Release ..
```
To use precompiled V8, use the following commands instead of the commands above
```
$ mkdir build-win && cd build-win
$ cmake -GNinja -DDOWNLOAD_V8=TRUE -DCMAKE_BUILD_TYPE=Release ..
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

#### Windows 10/11 - Problems with USB driver (e.g. radio device)
Install [Zadig](https://zadig.akeo.ie/) try to find the device that causes problems (you may need to select "list all devices" for it to show up in the list) and then install the WinUSB driver for it.

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
brew install cmake git sdl2 protobuf libusb python@2 qt@6
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

## Cross Compiling Ra from Linux to Windows

The framework can be cross compiled using the [mxe toolkit](https://mxe.cc) as follows:
First install the required packages (https://mxe.cc/#requirements). This can vary between linux distributions.

### Compile mxe
```
git clone https://github.com/mxe/mxe.git
cd mxe
git checkout 8dff0819708293da5bedb5383023926a4b36c50e
make gcc qt6-qtbase qt6-qtsvg libusb1 sdl2 MXE_TARGETS='x86_64-w64-mingw32.static' MXE_PLUGIN_DIRS='plugins/gcc14'
```

Then, set up the necessary environment variables, adapting it to the location you cloned mxe into:

```
ENV MXE_ROOT_DIR=/path/where/you/cloned/and/compiled/mxe
ENV PATH="${MXE_ROOT_DIR}/usr/bin/:${MXE_ROOT_DIR}/usr/x86_64-pc-linux-gnu/bin:${PATH}"
```

### Compile Ra
To compile ra or other parts of the framework, run the following from the root of this repository (otherwise adapt the path to the cmake wrapper):

```
mkdir build
cd build
$MXE_ROOT_DIR/usr/bin/x86_64-w64-mingw32.static-cmake -DCMAKE_C_HOST_COMPILER=gcc -DCMAKE_CXX_HOST_COMPILER=g++ -DDOWNLOAD_V8=TRUE ..
make
make assemble
```

Without the call to make assemble, it will not be possible to run ra.
The host compilers need to be set to be able to compile protoc for the host system and can also be set to clang and clang++.
