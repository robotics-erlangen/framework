# ER-Force scripts
This folder contains various scripts used at ER-Force

Some of these scripts use Docker.
In general, building these images requires **at least Docker 19.03** and [Docker BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/) to be enabled.
Prefix `docker` commands with `DOCKER_BUILDKIT=1` or take a look at the link to get instructions on how to enable it permanently.
`docker` aliased to Podman should also work.

## Table of Contents
- [V8 Images](#v8-images)
  * [Building V8](#building-v8)
  * [Packaging V8](#packaging-v8)

## V8 Images
We distribute V8 binaries as Docker images.
These images are available from Docker Hub at [`roboticserlangen/v8`](https://hub.docker.com/r/roboticserlangen/v8).
They are tagged as `version-{x}-ubuntu-{y}-{arch}` where `x` is a counter we bump when changing something about V8, `y` is the used Ubuntu Version (e.g. `24.04`) and `arch` is the compilation target (either `x64` or `arm64`). The `-{arch}` postfix is only present from 2024 onwards, all builds before that are for x64 only.

### Building V8
The `build_docker_v8` script may be used to build Docker binaries.
Use it like this
```bash
$ ./build_docker_v8 [--arch=x64|arm64] <v8 version (internal)> <ubuntu version number (dd.dd)>
$ # e.g.
$ ./build_docker_v8 2 24.04
$ # or, if you are cross-compiling for arm64
$ ./build_docker_v8 --arch=arm64 2 24.04
```
This is the recommended way to build V8, since Docker provides a defined environment.
If it is required you build V8 yourself, take a look at the script to find the dependencies and adapt them to your system.
Providing the correct `python` binary is of particular importance.
V8 version 1 requires the global `python` binary (i.e. without suffix) to point to `python2`.
Depending on your distribution, the global `python` binary may point to `python3` by default.
V8 version 2 requires a global `python3` binary.
#### Building for arm64
The only option to get a v8 build for arm64 is to cross-compile it from x86, native compilation on arm is not supported. The command to do so is listed above.

### Packaging V8
There is a script at `data/scripts/package_docker_v8` that can be used to extract the V8 binaries out of such an image.
Use it like this
```bash
$ ./package_docker_v8 sometag
$ # e.g.
$ ./package_docker_v8 version-2-ubuntu-24.04-x64
```
