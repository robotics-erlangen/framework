local Rating = {}

local Physics = require "observer/physics"


function Rating.timeToRating(time)
	if time < 0 then
		return 1
	else
		return 1/(time+1)^2
	end
end

function Rating.posToRating(robot, targetPos)
	return Rating.timeToRating(Physics.robotTimeToPos(robot, targetPos, Vector(0, 0)))
end

function Rating.valueToRating(value, zero, one)
	return math.bound(0, (value - zero) / (one - zero), 1)
end

return Rating
