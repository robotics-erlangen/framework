local Base = require "agent/base/agent"
local Hidden = Class("Agent.Hidden", Base)

local Default = require "agent/hidden/default"


Hidden._behaviors = {
	Default
}

function Hidden.takeRobot(robots)
	for _, robot in pairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

function Hidden:keepRobot()
	return not self._robot.isVisible and not self._robot.userControl
end

function Hidden:rateRobot()
	return 0
end

return Hidden
