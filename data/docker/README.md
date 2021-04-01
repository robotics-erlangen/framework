# Building the containers

Run `copy-libs.sh` before building. Afterwards it's just standard docker building.
e.g.
```
cd ubuntu-18.04
docker build -t ubuntu-18.04 .
```

## Robocup setup
The Image should be automatically built by Docker Hub on publications to
Github. It is then pulled by the Robocup simulation setup developed
[here](https://github.com/RoboCup-SSL/ssl-simulation-setup). If you build the image locally, you don't need to run `copy-libs.sh`.
