local Attack = (require "../base/class").new("Pool.Attack", require "pool/base")
local Assistant = require "task/assistant"

Attack._conditions = {}

function Attack:_updateTasks()
	for i = 1, #self._robots do
		if not self._tasks[i] then
			self._tasks[i] = Assistant.create(self._robots[i])
		end
	end
end

function Attack:_takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

return Attack
