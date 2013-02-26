local Attack = (require "../base/class").new("Pool.Attack", require "pool/base")

-- TODO: generate conditions
Attack._conditions = {}

function Attack:_updateTasks()
	for i = 1, #self._robots do
		if not self._tasks[i] then
			-- create assistant task
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
