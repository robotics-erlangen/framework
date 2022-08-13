# ER-Force Docker images
This folder contains various Dockerfiles used at ER-Force.

In general, building these images requires **at least Docker 19.03** and
[Docker BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/)
to be enabled. Prefix `docker` commands with `DOCKER_BUILDKIT=1` or take a look
at the link to get instructions on how to enable it permanently.

To build the images, it is important that the build context (the path argument
given to `docker build`) is the repository root directory. Thus, to build the
images, **enter the respsitory root** and run
```bash
$ docker build -t sometag -f data/docker/Dockerfile.something .
```

## Table of Contents
- [V8 Images](#v8-images)
- [CI Images](#ci-images)
- [Simulator-CLI](#simulator-cli)
- [Robocup Setup](#robocup-setup)

## CI images
These images need to be available on the CI runner host. Take a look at
`.gitlab-ci.yml` for the required tag names.

## Simulator CLI
This image is available from Docker Hub at
[`roboticserlangen/simulatorcli`](https://hub.docker.com/repository/docker/roboticserlangen/simulatorcli).
The available tags are `latest` and `commit-12HASH`, where `12HASH` are the
first twelve letters identifying the commit the build is based on.

## Robocup setup
According to the Robocup simulation setup developed
[here](https://github.com/RoboCup-SSL/ssl-simulation-setup), an image specified
by the team is pulled and run with a persistent volume containing the home
directory.  Thus, the image contains just the dependencies needed to build the
framework (as well as some utilities, e.g. a text editor). The framework is
then built inside a container and stored on the home volume.

Because of this, the image needs to be built only in few cases:
- The base image is updated
- A new dependency was added

If this happens, simply build using
```bash
$ cd robocup
$ docker build -t sometag .
```
