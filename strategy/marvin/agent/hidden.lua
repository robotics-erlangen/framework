local Hidden = (require "../base/class").new("Agent.Hidden", require "agent/base")
--local RescueRobot = require "task/rescuerobot"

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

function Hidden:_run(priorityMessages, notifications, trainerMessage)
	if not self._task then
		--self._task = RescueRobot.create(self._robot)
	end
	return {}
end

return Hidden
