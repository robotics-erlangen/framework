/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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

import { log } from "base/amun";
import * as World from "base/world";

import * as Robot from "glados/observer/robot";

let ctr = 0;

function printDynamics(dyn: Robot.RobotDynamics) {
	log(`this.maxSpeed = ${dyn.maxSpeed}`);
	log(`this.maxAngularSpeed = ${dyn.maxAngularSpeed}`);
	log(`this.acceleration.aSpeedupFMax = ${dyn.acceleration.aSpeedupFMax}`);
	log(`this.acceleration.aSpeedupSMax = ${dyn.acceleration.aSpeedupSMax}`);
	log(`this.acceleration.aSpeedupPhiMax = ${dyn.acceleration.aSpeedupPhiMax}`);
	log(`this.acceleration.aBrakeFMax = ${dyn.acceleration.aBrakeFMax}`);
	log(`this.acceleration.aBrakeSMax = ${dyn.acceleration.aBrakeSMax}`);
	log(`this.acceleration.aBrakePhiMax = ${dyn.acceleration.aBrakePhiMax}`);
	log("");
}

export function testRobotDynamics() {
	Robot.estimateRobotDynamics();

	ctr++;
	if (ctr % 1000 === 0) {
		log(World.TeamIsBlue ? "Blue Team:" : "Yellow Team:");
		printDynamics(Robot.getFriendlyDynamics());
		log(World.TeamIsBlue ? "Yellow Team:" : "Blue Team:");
		printDynamics(Robot.getOpponentDynamics());
	}
}
