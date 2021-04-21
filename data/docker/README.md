## Building the CI containers

Run `copy-libs.sh` before building. Afterwards it's just standard docker building.
e.g.
```
cd ubuntu-18.04
docker build -t ubuntu-18.04 .
```
## Simulator CLI
This image is available from Docker Hub at
[`roboticserlangen/simulatorcli`](https://hub.docker.com/repository/docker/roboticserlangen/simulatorcli).
The available tags are `latest` and `commit-12HASH`, where `12HASH` are the
first twelve letters identifying the commit the build is based on.

You can also build the image yourself.The Simulator CLI needs to copy files
from the repository root. Because of this, the top level folder needs to be
used as build context. Building the image requires
[BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/)
and **at least Docker 19.03**.  In the **repository root**, run
```sh
$ DOCKER_BUILDKIT=1 docker build -t roboticserlangen/simulatorcli:latest -f data/docker/Dockerfile.simulatorcli .

```

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
There is no need to run `copy-libs.sh`.
