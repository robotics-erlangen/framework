# V8
This directory contains a script `build.sh` to allow building V8 binaries on Linux, MinGW-w64 and MinGW-w32.
Building on MacOS is currently untested.

## Table of Contents
- [Building V8](#building-v8)
- [Updating V8](#updating-v8)
  * [Obtaining an up-to-date source tree](#obtaining-an-up-to-date-source-tree)
  * [Updating the patches](#updating-the-patches)
  * [Avoiding performance regressions](#avoiding-performance-regressions)
  * [Regenerate PGO profiles](#regenerate-pgo-profiles)
  * [Updating the Docker script](#updating-the-docker-script)
  * [Updating CMake and wrapping up](#updating-cmake-and-wrapping-up)

## Building V8
Simply run `build.sh`.
It may be beneficial to inspect and start the build manually (e.g. to set build parameters).
To do this, add `depot_tools` to your `PATH`.
Afterwards you can use the `gn` command to interact with the `v8/out` folder.

## Updating V8
Updating V8 is a multistep process.
It is beneficial to do this in a new working copy.
The used `version-1`/`version-2`... tag is an internal counter to reference V8 versions, increment it when updating.
There are a number of useful resources:
- The [official V8 docs](https://v8.dev/docs)
- Google's [documentation of the GN language](https://gn.googlesource.com/gn/+/refs/heads/main/docs/)
- The [mingw-w64-x86_64-v8 package](https://packages.msys2.org/package/mingw-w64-x86_64-v8?repo=mingw64).
  This is particulary useful to update the Windows build, as MinGW provides patches to make V8 buildable which can be used as reference.
- [Instructions on building Chromium on Windows](https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md). While these can not be used directly (Chrome and V8 on Windows are built using `clang-cl` with an ABI incompatible to MinGW) they present some useful build options.

Note that the following steps are not in strict order.
For example, it is beneficial to update the Docker script early to find new dependencies and only update the Windows patches after verifying that there are no performance regressions.

### Obtaining an up-to-date source tree
According to [the V8 docs](https://v8.dev/docs/version-numbers), the V8 version shipped in the latest stable Chrome should be used.
Obtain the commit hash and use it as `V8_BASE_REVISION` in `build.sh`.
Edit `build.sh` to stop after checking out the new revision and run it once.
After downloading the source code of V8 and its dependencies, check `v8/DEPS`.
Search for the revisions of the various dependencies and update them at the top of `build.sh`.

### Updating the Patches
The old patches will probably not work in a new V8 version without changes.
They can however be used as a reference.
The most important change is adding support for the MinGW toolchain.
You can also use the [patches used by the MinGW V8 package itself](https://github.com/msys2/MINGW-packages/tree/master/mingw-w64-v8) as a reference.
- Make sure to update the content of the `.patched` file for every patch.
  It should contain the `V8_BASE_REVISION`.
- Once the patches for subprojects (`build`, `third_party/icu`) are stable, obtain a stable commit hash for these.
  This can be done by applying the patches using the `patch_safely` method in `build.sh`.
  This ensures the commit hashes are the same everytime by fixing the comitter identity and time.
  The stable hashes can then be inserted in `v8/DEPS`.
  This allows rerunning `gclient sync` without the subproject patches being reset.

### Avoiding performance regressions
To make sure there are no performance regressions, record a reasonably long log and profile it using the `replay-cli`.

### Regenerate PGO profiles
At the time of writing, V8 has three phases of profile guided optimization (PGO).
- In phase 0, PGO is disabled.
- In phase 1, the binary is instrumented to generate profile data.
- In phase 2, the profile data is used to optimize the V8 binary.

Compile a V8 binary in phase 1 and link it into Amun/Ra.
This requires Amun/Ra to be **compiled and linked using clang** and the [`-fprofile-instr-generate` option](https://clang.llvm.org/docs/UsersManual.html#profiling-with-instrumentation)
Note that the Clang version used to compile Amun/Ra must be similar to the version V8 is compiled with, as the instrumentation may be incompatible otherwise.
Upload the generated and combined profile and update the download path in `build.sh`

### Updating the Docker script
This includes inserting the correct dependencies and finding the files to be exported in the `//data/scripts/build_docker_v8` script.
Both are manual processes.
Usually, V8 manages its own dependencies and only requires the packages already present in the script and the correct Python version.
- Exporting as few files as possible is critical to keep download size and filesystem usage small.
- Only the headers and linked binaries are required.
- In a monolithic V8 build, the only binary required is `libv8_monolith.a`.
- Regarding the headers, large files worth throwing away can be found using `ncdu`.

### Updating CMake and wrapping up
Archive a new V8 binary, upload it and insert the new path in `//cmake/FindV8.cmake`.
Make sure to update the required version.
The files required for compiling and linking may have changed, so make sure to update these.
