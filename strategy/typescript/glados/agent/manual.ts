local Base = require "agent/base/agent"
local Manual = Class("Agent.Manual", Base)

local Default = require "agent/manual/default"


Manual._behaviors = {
	Default
}

function Manual.takeRobot(robots)
	for _, robot in ipairs(robots) do
		// take robots which get command from an input device
		if robot.userControl then
			return robot
		end
	end
end

function Manual:keepRobot()
	return self._robot.userControl
end

function Manual:rateRobot()
	return 0
end

return Manual
