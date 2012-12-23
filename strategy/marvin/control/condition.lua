local Condition = {}
local World = require "../base/world"

-- TODO: conditions for robot matching

function Condition.example(param1)
	local self = { pos = param1 }
	function self.check(robots)
		return robots[param1] ~= nil and 1 or 0
	end
	return self
end

function Condition.keeperAtPos(pos)
	local self = { pos = pos }
	function self.check(robots)
		return robots[pos] == World.FriendlyKeeper and 1 or 0
	end
	return self
end

return Condition
