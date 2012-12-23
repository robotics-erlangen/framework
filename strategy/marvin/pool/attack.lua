local Attack = (require "../base/class").new("Pool.Attack", require "pool/base")

-- TODO: generate conditions
Attack._conditions = {}

function Attack:_init(attackers, defenders)
	self._robots = attackers
end

function Attack:_run()
	for i = 1, #self._robots do
		if not self._tasks[i] then
			-- create assistant task
		end
	end
end

function Attack:assignRobots()
	return self:_assignRobots(self._robots, self._conditions)
end

return Attack
