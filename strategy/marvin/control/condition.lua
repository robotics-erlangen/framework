local Condition = {}

-- TODO: conditions for robot matching
function Condition.example(param1)
	return function (robots)
		return robots[param1] ~= nil
	end
end

return Condition
