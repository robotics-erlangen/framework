/**
 * @module constants
 * Contains system specific constants. THat is constants that are due to intrinsic properties of the robots/camera system/game rules.
 * See source for constant and description
 */

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

/* It is important for this to be a type only import. Since base/world imports
 * base/constants this would be a cyclic import.
 */
import type { DIVISION } from "base/world";


/** distance to ball during stop [m] */
export const stopBallDistance = 0.5;

/** total system latency [s] */
export const systemLatency = 0.04;

/** possible position error from vision [m] */
export const positionError = 0.005;

/** maximum shooting speed [m/s] to use for safe shooting */
export const maxBallSpeed = 6.1;
/** maximum allowed shooting speed [m/s] */
export const allowedMaxBallSpeed = 6.5;

export const maxDribbleDistance = 1;

export const maxRobotRadius = 0.09;

export const maxRobotHeight = 0.15;

/** maximum time keeper may keep the ball in defence area [s] */
export const maxTimeBallDefenseArea: ReadonlyRec<{ [K in typeof DIVISION]: number }> = {
	/**
	 * 5 is given as default for the empty string. Old logs don't have
	 * World.DIVISION set and are assumed to be division A
	 */
	"": 5,
	"A": 5,
	"B": 10,
};

/** maximum allowed driving speed during stop states [m/s] */
export const stopSpeed = 1.5;

/** minimum speed difference with which a collision foul is considered crashing [m/s] */
export const crashingSpeedDifference = 1.5;

/** Get the maximum allowed number of robots for the given division. */
export const maxTeamSize: ReadonlyRec<{ [K in typeof DIVISION]: number }> = {
	/**
	 * 11 is given as default for the empty string. Old logs don't have
	 * World.DIVISION set and are assumed to be division A
	 */
	"": 11,
	"A": 11,
	"B": 6,
};
