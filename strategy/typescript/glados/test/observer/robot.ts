let RobotTest = {}

import * as World from "base/world";
import * as Robot from "glados/observer/robot";

let ctr = 0

let printDynamics = function (dyn) {
	log("this.maxSpeed = "  +  String(dyn.maxSpeed))
	log("this.maxAngularSpeed = "  +  String(dyn.maxAngularSpeed))
	log("this.acceleration.aSpeedupFMax = "  +  String(dyn.acceleration.aSpeedupFMax))
	log("this.acceleration.aSpeedupSMax = "  +  String(dyn.acceleration.aSpeedupSMax))
	log("this.acceleration.aSpeedupPhiMax = "  +  String(dyn.acceleration.aSpeedupPhiMax))
	log("this.acceleration.aBrakeFMax = "  +  String(dyn.acceleration.aBrakeFMax))
	log("this.acceleration.aBrakeSMax = "  +  String(dyn.acceleration.aBrakeSMax))
	log("this.acceleration.aBrakePhiMax = "  +  String(dyn.acceleration.aBrakePhiMax))
	log("")
}

function RobotTest.testRobotDynamics () {
	robot.estimateRobotDynamics()

	ctr = ctr + 1
	if (ctr % 1000 == 0) {
		log(World.TeamIsBlue ? "Blue Team:" : "Yellow Team:")
		printDynamics(robot.getFriendlyDynamics())
		log(World.TeamIsBlue ? "Yellow Team:" : "Blue Team:")
		printDynamics(robot.getOpponentDynamics())
	}
}

return RobotTest
