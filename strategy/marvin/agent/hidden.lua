local Hidden = (require "../base/class").new("Agent.Hidden", require "agent/base/agent")

local Default = require "agent/hidden/default"

function Hidden.takeRobot(robots)
	for _, robot in pairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

function Hidden:keepRobot()
	return not self._robot.isVisible
end

function Hidden:_initBehaviour()
	self._behaviours = Default.create(self._robot)
end

return Hidden
