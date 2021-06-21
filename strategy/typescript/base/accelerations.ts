/**************************************************************************
*   Copyright 2021 Tobias Heineken                                        *
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
import { RobotAccelerationProfile } from "base/trajectory";

export interface RobotSpecs {
	profile: RobotAccelerationProfile;
	vmax: number;
	vangular: number;
}

export let accelerationsByTeam: Map<string, RobotSpecs> = new Map();

accelerationsByTeam["RoboIME"] = { profile: {
	aSpeedupFMax: 6.3,
	aSpeedupSMax: 6.3,
	aSpeedupPhiMax: 60,
	aBrakeFMax: 7.3,
	aBrakeSMax: 7.3,
	aBrakePhiMax: 60
},
	vmax: 4.2,
	vangular: 20,
};

accelerationsByTeam["RoboTeam Twente"] = {
	profile: {
		aSpeedupFMax: 5.9,
		aSpeedupSMax: 5.9,
		aSpeedupPhiMax: 55,
		aBrakeFMax: 7,
		aBrakeSMax: 7,
		aBrakePhiMax: 50},
	vmax: 3.8,
	vangular: 4.8,
};

accelerationsByTeam["TIGERs Mannheim"] = {
	profile: {
		aSpeedupFMax: 3.5,
		aSpeedupSMax: 3.5,
		aSpeedupPhiMax: 55,
		aBrakeFMax: 3.5,
		aBrakeSMax: 3.5,
		aBrakePhiMax: 55
	},
	vmax: 4.5,
	vangular: 25
};

accelerationsByTeam["RobôCIn"] = {
	profile: {
		aSpeedupFMax: 4.9,
		aSpeedupSMax: 4.9,
		aSpeedupPhiMax: 55,
		aBrakeFMax: 6,
		aBrakeSMax: 6,
		aBrakePhiMax: 55
	},
	vmax: 3.5,
	vangular: 25
};

accelerationsByTeam["RoboFEI"] = {
	profile: {
		aSpeedupFMax: 4.9,
		aSpeedupSMax: 4.9,
		aSpeedupPhiMax: 55,
		aBrakeFMax: 6,
		aBrakeSMax: 6,
		aBrakePhiMax: 55
	},
	vmax: 3.5,
	vangular: 25
};

accelerationsByTeam["UBC Thunderbots"] = {
	profile: {
		aSpeedupFMax: 3.3,
		aSpeedupSMax: 3.3,
		aSpeedupPhiMax: 38.6,
		aBrakeFMax: 3.3,
		aBrakeSMax: 3.3,
		aBrakePhiMax: 38.6,
	},
	vmax: 4.83,
	vangular: 56.8,
};
