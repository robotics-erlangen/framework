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

function HiddenRobots:cleanupRobots()
	local robots = {}
	for _, robot in pairs(self._robots) do
		if not robot.isVisible then
			table.insert(robots, robot)
		end
	end
	if #robots ~= #self._robots then
		self._robotsDirty = true
		self._robots = robots
	end
end

function HiddenRobots:_takeRobot(robots)
	for _, robot in pairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

return HiddenRobots
