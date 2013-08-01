local CenterBack = (require "../base/class").new("Agent.CenterBack", require "agent/base/agent")

local Default = require "agent/centerback/default"
local HandleBall = require "agent/defender/handleball"

CenterBack.robotLimit = 1 -- is not considered :(

function CenterBack.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function CenterBack:_supplyBehaviors()
	return {
		HandleBall.create(self._robot, self.inbox, self.send),
		Default.create(self._robot, self.inbox, self.send)
	}
end

function CenterBack:keepRobot()
	return self._robot.isVisible
end

function CenterBack:rateRobot()
	return 1
end

return CenterBack
