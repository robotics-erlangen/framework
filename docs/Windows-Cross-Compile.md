# Cross Compiling Ra from Linux to Windows

The framework can be cross compiled using the [mxe toolkit](https://mxe.cc) as follows:
First install the required packages (https://mxe.cc/#requirements). This can vary between linux distributions.

After this, there are two ways to set up mxe. The project provides pre-compiled packages for many linux distributions
that can be used. However, the GCC used for these is to old and does not support C++17.

## First option: Fully compile mxe
The first option is therefore to fully compile mxe yourself while specifying a more modern GCC.
This approach will always work, however it might take significantly longer to compile:

```
git clone https://github.com/mxe/mxe.git
cd mxe
git checkout 02852a7b690aa411ce2a2089deea25a7292a33d6
make gcc qtbase qtsvg protobuf libusb1 MXE_TARGETS='x86_64-w64-mingw32.shared' MXE_PLUGIN_DIRS='plugins/gcc11' 
```

Then, set up the necessary environment variables, adapting it to the location you cloned mxe into:

```
ENV MXE_ROOT_DIR=/path/where/you/cloned/and/compiled/mxe
ENV PATH="${MXE_ROOT_DIR}/usr/bin/:${MXE_ROOT_DIR}/usr/x86_64-pc-linux-gnu/bin:${PATH}"
```

## Second option: Partially use pre-compiled libraries
The second option is to only compile the gcc yourself and use the pre-compiled packages for qt and other libraries.
This may not always work depending on your distribution or system setup.
Compiling the reduced mxe packages can be done in a similar fashion:

```
git clone https://github.com/mxe/mxe.git
cd mxe
git checkout 02852a7b690aa411ce2a2089deea25a7292a33d6
make gcc cmake MXE_TARGETS='x86_64-w64-mingw32.shared' MXE_PLUGIN_DIRS='plugins/gcc11'
```

After that, install the pre-compiled packages.
Follow the intructions here https://mxe.cc/#tutorial-3b to set up the mxe repository for apt,
and install the packages:

```
sudo apt install mxe-x86-64-w64-mingw32.shared-libusb1 mxe-x86-64-w64-mingw32.shared-protobuf mxe-x86-64-w64-mingw32.shared-qt5
```

Then, set up the necessary environment variables, adapting it to the location you cloned mxe into:

```
ENV MXE_ROOT_DIR=/path/where/you/cloned/and/compiled/mxe
ENV PATH="${MXE_ROOT_DIR}/usr/bin/:${MXE_ROOT_DIR}/usr/x86_64-pc-linux-gnu/bin:/usr/lib/mxe/usr/bin/:/usr/lib/mxe/usr/x86_64-pc-linux-gnu/bin:${PATH}"
```

## Compile Ra
To compile ra or other parts of the framework, run the following from the root of this repository (otherwise adapt the path to the cmake wrapper):

```
mkdir build
cd build
../cmake/mxe-cmake-wrapper ..
make
make assemble
```

Without the call to make assemble, it will not be possible to run ra.
