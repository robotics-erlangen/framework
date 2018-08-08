local RobotTest = {}

local World = require "../base/world"
local robot = require "observer/robot"

local ctr = 0

local function printDynamics(dyn)
	log("self.maxSpeed = " .. tostring(dyn.maxSpeed))
	log("self.maxAngularSpeed = " .. tostring(dyn.maxAngularSpeed))
	log("self.acceleration.aSpeedupFMax = " .. tostring(dyn.acceleration.aSpeedupFMax))
	log("self.acceleration.aSpeedupSMax = " .. tostring(dyn.acceleration.aSpeedupSMax))
	log("self.acceleration.aSpeedupPhiMax = " .. tostring(dyn.acceleration.aSpeedupPhiMax))
	log("self.acceleration.aBrakeFMax = " .. tostring(dyn.acceleration.aBrakeFMax))
	log("self.acceleration.aBrakeSMax = " .. tostring(dyn.acceleration.aBrakeSMax))
	log("self.acceleration.aBrakePhiMax = " .. tostring(dyn.acceleration.aBrakePhiMax))
	log("")
end

function RobotTest.testRobotDynamics()
	robot.estimateRobotDynamics()

	ctr = ctr + 1
	if ctr % 1000 == 0 then
		log(World.TeamIsBlue and "Blue Team:" or "Yellow Team:")
		printDynamics(robot.getFriendlyDynamics())
		log(World.TeamIsBlue and "Yellow Team:" or "Blue Team:")
		printDynamics(robot.getOpponentDynamics())
	end
end

return RobotTest
