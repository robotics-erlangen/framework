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
