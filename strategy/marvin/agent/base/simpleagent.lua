local SimpleAgent = Class("Agent.Base.SimpleAgent", require "agent/base/agent")

local debug = require "../base/debug"
local World = require "../base/world"

-- Child class must set _behaviors
-- SimpleAgent._behaviors = {}

function SimpleAgent.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function SimpleAgent:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

function SimpleAgent:rateRobot()
	return 1
end

return SimpleAgent
