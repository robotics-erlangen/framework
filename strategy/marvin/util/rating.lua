local Rating = {}
local Robot = require("observer/robot")

function Rating.timeToRating(time)
	if time < 0 then
		return 1
	else
		return 1/(time+1)^2
	end
end

function Rating.posToRating(robot, targetPos)
	return Rating.timeToRating(Robot.timeToPos(robot, targetPos))
end

return Rating
