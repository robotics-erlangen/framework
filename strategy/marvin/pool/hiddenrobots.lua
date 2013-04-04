local HiddenRobots = (require "../base/class").new("Pool.HiddenRobots", require "pool/base")
--local RescueRobot = require "task/rescuerobot"

HiddenRobots._conditions = {}

function HiddenRobots:_updateTasks()
	for i = 1, #self._robots do
		if not self._tasks[i] then
			--self._tasks[i] = RescueRobot.create(self._robots[i])
		end
	end
end

function HiddenRobots:_keepRobot(robot)
	return not robot.isVisible
end

function HiddenRobots:_takeRobot(robots)
	for _, robot in pairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

return HiddenRobots
