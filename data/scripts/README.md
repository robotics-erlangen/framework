# ER-Force scripts
This folder contains various scripts used at ER-Force

Some of these scripts use Docker.
In general, building these images requires **at least Docker 19.03** and [Docker BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/) to be enabled.
Prefix `docker` commands with `DOCKER_BUILDKIT=1` or take a look at the link to get instructions on how to enable it permanently.

## Table of Contents
- [V8 Images](#v8-images)
  * [Building V8](#building-v8)
  * [Packaging V8](#packaging-v8)

## V8 Images
We distribute V8 binaries as Docker images.
These images are available from Docker Hub at [`roboticserlangen/v8`](https://hub.docker.com/r/roboticserlangen/v8).
They are tagged as `version-{x}-ubuntu-{y}` where `x` is a counter we bump when changing something about V8 and `y` is the used Ubuntu Version (e.g. `20.04`).

### Building V8
The `build_docker_v8` script may be used to build Docker binaries.
Use it like this
```bash
$ ./build_docker_v8 <v8 version (internal)> <ubuntu version number (dd.dd)>
$ # e.g.
$ ./build_docker_v8 1 20.04
```
This is the recommended way to build V8, since Docker provides a defined environment.
If it is required you build V8 yourself, take a look at the script to find the dependencies and adapt them to your system.
Providing the correct `python` binary is of particular importance.
V8 version 1 requires the global `python` binary (i.e. without suffix) to point to `python2`.
Depending on your distribution, the global `python` binary may point to `python3` by default.
V8 version 2 requires a global `python3` binary.

### Packaging V8
There is a script at `data/scripts/package_docker_v8` that can be used to extract the V8 binaries out of such an image.
Use it like this
```bash
$ ./package_docker_v8 sometag
$ # e.g.
$ ./package_docker_v8 version-1-ubuntu-20.04
```
