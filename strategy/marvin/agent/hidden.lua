local Hidden = (require "../base/class").new("Agent.Hidden", require "agent/base/agent")

local Default = require "agent/hidden/default"

function Hidden.takeRobot(robots)
	for _, robot in pairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

function Hidden:_supplyBehaviors()
	return {
		Default.create(self._robot, self.inbox, self.send)
	}
end

function Hidden:applyForMainAttacker()
	-- not a good idea for hidden robots
end

function Hidden:keepRobot()
	return not self._robot.isVisible
end

function Hidden:rateRobot()
	return 0
end

return Hidden
