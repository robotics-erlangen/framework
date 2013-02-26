local Defense = (require "../base/class").new("Pool.Defense", require "pool/base")

-- TODO: generate conditions
Defense._conditions = {}

function Defense:_updateTasks()
	--if #self._robots > 0 and not self._tasks[1] then
		--self._tasks[1] = Keeper.create(self._robots[1])
	--end
	-- TODO: default behaviour
end

function Defense:_takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

return Defense
