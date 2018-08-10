let RobotTest = {}

let World = require "../base/world"
let robot = require "observer/robot"

let ctr = 0

let printDynamics = function (dyn) {
	log("self.maxSpeed = "  +  String(dyn.maxSpeed))
	log("self.maxAngularSpeed = "  +  String(dyn.maxAngularSpeed))
	log("self.acceleration.aSpeedupFMax = "  +  String(dyn.acceleration.aSpeedupFMax))
	log("self.acceleration.aSpeedupSMax = "  +  String(dyn.acceleration.aSpeedupSMax))
	log("self.acceleration.aSpeedupPhiMax = "  +  String(dyn.acceleration.aSpeedupPhiMax))
	log("self.acceleration.aBrakeFMax = "  +  String(dyn.acceleration.aBrakeFMax))
	log("self.acceleration.aBrakeSMax = "  +  String(dyn.acceleration.aBrakeSMax))
	log("self.acceleration.aBrakePhiMax = "  +  String(dyn.acceleration.aBrakePhiMax))
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
