
///// Contains system specific constants. That is constants that are due to intrinsic properties of the robots / camera system / game rules.
//// See source for constant and description
//module "Constants"
////

//***********************************************************************
//*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************


export const stopBallDistance = 0.5; // distance to ball during stop [m]

export const systemLatency = 0.04; // total system latency [s]

export const positionError = 0.005; // possible position error from vision [m]

export const maxBallSpeed = 6.3; // maximum allowed shooting speed [m/s]

export const maxDribbleDistance = 1;

export const maxRobotRadius = 0.09;

export const maxRobotHeight = 0.15;

export const floorDamping = 0.55; // vertical speed damping coeffient for a ball hitting the ground

export const stopSpeed = 1.5; // maximum allowed driving speed during stop states [m/s]

// measured by looking at the ball speed graph in the plotter
export let ballDeceleration; // acceleration which brakes the ball [m/s^2]

export let fastBallDeceleration; // accerlation which brakes the ball until it is rolling [m/s^2]

export let ballSwitchRatio; // if ball is slower than switchRatio * shootSpeed then switch from fast to normal ball deceleration
export function switchSimulatorConstants (isSimulated: boolean) { {
	if (isSimulated) {
		ballDeceleration = -0.35;
		fastBallDeceleration = -4.5;
		ballSwitchRatio = 0.69;
	} } else {{
		
		ballDeceleration = -0.3;
		fastBallDeceleration = -2.5;
		ballSwitchRatio = 0.6;
	}
}
		Constants.ballSwitchRatio = 0.6 
	}
}

switchSimulatorConstants(false);
