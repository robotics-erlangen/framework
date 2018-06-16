local RobotTest = {}

local robot = require "observer/robot"

local ctr = 0

function RobotTest.testOpponentDynamics()
	robot.estimateOpponentDynamics()

	ctr = ctr + 1
	if ctr % 1000 == 0 then
		local dyn = robot.getOpponentDynamics()
		log("self.maxSpeed = " .. tostring(dyn.maxSpeed))
		log("self.maxAngularSpeed = " .. tostring(dyn.maxAngularSpeed))
		log("self.acceleration.aSpeedupFMax = " .. tostring(dyn.acceleration.aSpeedupFMax))
		log("self.acceleration.aSpeedupSMax = " .. tostring(dyn.acceleration.aSpeedupSMax))
		log("self.acceleration.aSpeedupPhiMax = " .. tostring(dyn.acceleration.aSpeedupPhiMax))
		log("self.acceleration.aBrakeFMax = " .. tostring(dyn.acceleration.aBrakeFMax))
		log("self.acceleration.aBrakeSMax = " .. tostring(dyn.acceleration.aBrakeSMax))
		log("self.acceleration.aBrakePhiMax = " .. tostring(dyn.acceleration.aBrakePhiMax))
	end
end

return RobotTest
