# ER-Force Framework
This is the framework of the SSL-Team ER-Force. Its main features are:
- Simulating SSL games with a varying number of robots on different possible field sizes
- Control robots, either autonomously using a Typescript/Lua AI script or manually
- Create recordings of the game and play them back

Note, that development of the **ER-Force autoref** does not happen in this
repository - there is a separated repository [found
here](https://github.com/robotics-erlangen/autoref). However, to ease the
development of our AI scripts, it is contained as a `git` Submodule here. To
use it, clone the repository using the `--recurse-submodules` flag. If you
already cloned it, you can also use `git submodule init && git submodule update
--recursive`.

Ra for Windows is built in a nightly pipeline and can be [downloaded here](https://project.robotics-erlangen.de/robocup/software/-/jobs/artifacts/master/download?job=cross-compile-ra).

## Table of Contents
- [Getting started and compiling the framework](#getting-started-and-compiling-the-framework)
- [Contained programs](#contained-programs-and-their-corresponding-makefile-target)
  * [Ra and Horus](#ra-and-horus)
  * [Simulator CLI](#simulator-cli)
  * [Other utilities](#other-utilities)
- [Language services and Tests](#language-services-and-tests)


## Getting started and compiling the framework
First, [see here](COMPILE.md) on how to setup a build environment.

You may then compile the [various
programs](#contained-programs-and-their-corresponding-makefile-target)
contained in the framework, or all of them using `make all`.

**Note for Robocup 2021 participants**
If you just intend to use the simulator to connect with your own software over
the network, you only need to build the [Simulator CLI](#simulator-cli).

## Contained programs (and their corresponding Makefile Target)

### Ra and Horus
Target: `ra`

The main program we use for development. Offers a GUI the various features
provided by the framework.
- Simulating a SSL game
- Control robots either manually or autonomously using a Typescript/Lua AI script
- Send commands to real robots using a wireless transceiver
- Create recordings of the game and play them back (using the Logplayer Horus)

...and many more. For a more complete description, [see here](docs/ra.md).

### Simulator CLI
Target: `simulator-cli`

Simulate the physics of a SSL game. The program will receive a team's robot
commands encoded using the [SSL simulation
protocol](https://github.com/RoboCup-SSL/ssl-simulation-protocol) and broadcast
the state of the world (i.e. positions of robots and the ball) using the SSL
vision protocol.

The `simulator-cli` takes two command line arguments:
- `-g short_file_name` sets the initial geometry to one of the defaults in `config/simulator`.
- `--realism short_file_name` sets the initial realism to on of the defaults in `config/simulator-realism`

Both of these argument take a `short_file_name`, i.e. just the filename without the path or the extension.
For example, to start the binary with no realism and 2018 setup, call `simulator-cli -g 2018 --realism None`


### Other utilities
This repo also contains various utilities:
- `amun-cli` - run an AI script from the command line.
- `loganalyzer` - analayze the memory usage of a log file.
- `logcutter-cli` - merge together multiple logs and remove unwanted sections.
- `replay-cli` - replay a log with an AI script. Can also be used for profiling.
- `visionanalyzer` - convert a SSL vision log to our own format and run the autoref on it.
- `visionextractor` - extract a SSL vision log from our own log format.

These executables are found alongside the Ra executable. Run them with `-h` for further usage information.

## Language services and Tests
A guide for setting up linting services and editor integration is provided at
[docs/language-services.md](docs/language-services.md). This is mostly for
internal usage but may be interesting if you wish to contribute.
