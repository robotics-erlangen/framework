local Defense = (require "../base/class").new("Pool.Defense", require "pool/base")
local Condition = require "control/condition"
local Keeper = require "task/keeper"

-- TODO: generate conditions
Defense._conditions = {
	Condition.keeperAtPos(1)
}

function Defense:_init(attackers, defenders)
	self._robots = defenders
end

function Defense:_run()
	if #self._robots > 0 and not self._tasks[1] then
		self._tasks[1] = Keeper.create(self._robots[1])
	end
	-- TODO: default behaviour
end

function Defense:assignRobots()
	return self:_assignRobots(self._robots, self._conditions)
end

return Defense
