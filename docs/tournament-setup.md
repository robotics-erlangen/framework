# Tournament setup Ra
There are a some things to be checked before you can use Ra for a tournament game.
Make sure to check them for each competition seperatly, in case some of the parameters have changed.
These checks should be done during setup days.

## Team name
Ra uses the team name for deciding which team we are for the tournament mode.
Check ra/mainwindow.h `TEAM_NAME` to be exactly your team name (as used by the game controller)

## Ball modell
To import the ball model and damping parameters that are broadcasted by the vision, use the "Field Parameters" widget in Ra.
The world state above the button should be "Real Field", if its simulator you are importing the values from the simulator config instead.
After importing them you can fine adjust the values.

## Radio Channels
During the RoboCup, each team gets assigned a number of frequencies to use.
The frequencies should be input into `firmware-interface/radiocommand.h`.
Each transceiver and every robot should be flashed with these frequencies and the correct channel should be selected in Ra.

## Divisions
Ra detects divisions based on the geometry of the field.
Make sure config/division-dimensions.txt is updated with the correct field sizes for division A and B

## System Delay
TODO: I have no idea. Apearantly it does something, but we don't know where to insert it

## Vision Port + Ref Port
In the ra configuration dialog choose the correct ports for the tournament
You'll get the correct value from the OC.
