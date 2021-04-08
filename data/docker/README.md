# Building the containers

Run `copy-libs.sh` before building. Afterwards it's just standard docker building.
e.g.
```
cd ubuntu-18.04
docker build -t ubuntu-18.04 .
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
