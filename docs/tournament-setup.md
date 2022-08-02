# Tournament setup Ra
There are a some things to be checked before you can use Ra for a tournament game.
Make sure to check them for each competition seperatly, in case some of the parameters have changed.
These checks should be done during setup days.

## Team name
Ra uses the team name for deciding which team we are for the tournament mode.
Check ra/mainwindow.h `TEAM_NAME` to be exactly your team name (as used by the game controller)

## Ball modell
Ra uses the ball modell in the tracking to have a more realistic ball tracking.
Please measure both fricition value (for example by passing a few passes), and the slower
(ball rolling) has to inserted in amun/processor/tracking/ballgroundfilter.cpp in `GroundFilter::predict`

Please also measure floor damping (TODO: How to actually do that) and insert int in
amun/processor/tracking/ballflyfilter.cpp `const float floorDamping`.

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

# Tournament setup Strategy/Base
Our published base for strategy scripts also has some paramters to be modified:

## Ball modell
Similar to the Ball modell in Ra, a Strategy uses a ball modell based on the measured friction values,
as well as the switch point, at which the ball switches from fast to slow ball deceleration.
Please update base/constants `ballDeceleration`, `fastBallDeceleration`, and `ballSwitchRatio` in
`switchSimulatorConstants` under `else` (i.e: If the world is not being simulated).

Please also insert the floor damping determed for the ball modell in Ra in base/constants
`floorDamping`.

## Number of robots
in base/constants modify `teamSize` to the correct Value (TODO: Divisions)
