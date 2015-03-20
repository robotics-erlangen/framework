# Ra
This is the framework of the SSL-Team ER-Force named "Ra". In addition it
includes a log player which replays games recorded by Ra.

The autoref is found at https://github.com/robotics-erlangen/autoref .

This document will explain some basic functions of Ra, ball speed measurement
using the plotter built into Ra and usage of the log player.


## Building Ra
See COMPILE.md for instructions on how to build Ra. On Windows the bin folder
containing Ra and all other components can be move to any location. For Linux
and Mac OS X it is required to leave the source folder in its current location
as the generated binaries required the `config/` and `data/` folder located there.
In order to remove this dependencies modify the config file `src/config.h.in`
The log player is always built alongside Ra.


## Starting Ra
If the default SSL-Vision port (10002) is used just run the Ra executable.
In order to use a different port it must be passed via the command line.
On Linux this would be:
> ./ra 10004

Ensure that the network cable is plugged in as Ra checks the network interfaces
only at startup.

If Ra is running on the same computer as SSL-Vision, Ra MUST be started before
SSL-Vision is started, otherwise Ra won't receive any vision packets.


## Basic usage of Ra
Ra can either use the builtin simulator or use the data provided by SSL-Vision.
There's also small builtin refbox, which can be enabled.

The main window of Ra shows the playing field in the center. The field can be
moved by holding down the right mouse button and moving the mouse cursor.
Zooming is possible by scrolling. On Mac there's also support for the usual
gestures. Right clicking brings up a menu that allows to show the field in a
default "vertical" or "horizontal" orientation.
Left of the field is the "debug tree" which can display debug information
provided by the loaded AI modules. Below the playing field is a textbox
containing log output of the AIs. This is also the place where the Autoref
decisions are displayed.

On the left and right side of the window are several docked subwindows which
will only be partially explained.

The "Robots" subwindow (initially in the top left corner) allows loading an
AI module for each team.
Beneath the AI selection is the robot list. In there you can configure which
robot is assigned to which team. (-> See Autoref explanation)

On the top of the window is the toolbar providing some central configuration
switches.

The first button shows a radio antenna which enables the transceiver for robot
communication. In the context of this release it is only important while the
simulator is active. The capacitor next to it allows to enable charging in
order to allow the robots to kick the ball.

The fourth button which shows a computer display is used to switch between the
internal simulator and SSL-Vision. While the simulator is enabled it's possible
to move the robots and the ball by left clicking on them and dragging them
around.

The whistle button is used to disable and enable the "Internal RefBox" subwindow.
The plotter can be started using the button representing two plots on a white
background.
The red circle starts recording of everything display in Ra into a logfile
which can be viewed using the log player. The logfile (.log) is placed into the
current working directory of Ra using.


## Ball speed measurement
Open the plotter (white icon with two plot lines).
Select Ball/v_global (only available if a ball is/was visible). This will
display the absolute ball speed.
Set the Y axis to min: 0, max: 10
When the ball is shot check whether its speed is higher than about 8,5 m/s.
In order to take a clear look at the speed curve the plotter display can be
freezed by pressing the "Freeze" button. The plot display keeps the last 60
seconds.


## Feature list
Nearly everything is internally passed as a protobuf object, these are dumped
for replay in the log player.

Processing pipeline:
* Receive SSL-Vision data / Internal simulator
* RefBox input processing
* Data association and Tracking with an Extended Kalman filter
* Pass process data to controller and AI modules

Controller:
* Use input from AI to generate robot commands
* Send commands to robots / simulator

AI modules:
* Basic runtime is included along the Autoref (see strategy/base/)
* Protobuf-to-LUA and vice versa conversion

GUI:
* Debug tree + log
* AI control
* Robot configuration (double click on robot in list for parameters)
* Field display + AI visualizations
* Simple internal RefBox
* Plotter


# Log player
The log player is built alongside Ra. Start it by running the logplayer binary.
Then open a logfile recorded by Ra. (Log files from the SSL-LogTools can't be
used).

The log player window contains most subwindows also present in Ra, except the
robot and AI configuration. In addition it contains controls to allow seeking
to an arbitrary position in the logfile. The playback speed can be changed by
changing the 100% scroll box. The playback can be controlled using shortcuts,
look at the menu entries for a complete list. Toggling play/pause is possible
by pressing Space.

The plotter and the log window is also included. As both require continuous
data their data is deleted when restarting playback after seeking. Thus only
the last timespan which was played back without interim seeking is displayed.

