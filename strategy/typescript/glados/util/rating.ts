let Rating = {}

let Physics = require "observer/physics"


function Rating.timeToRating (time) {
	if (time < 0) {
		return 1
	} else {
		return 1/(time+1)^2
	}
}

function Rating.posToRating (robot, targetPos) {
	return Rating.timeToRating(Physics.robotTimeToPos(robot, targetPos, Vector(0, 0)))
}

function Rating.valueToRating (value, zero, one) {
	return math.bound(0, (value - zero) / (one - zero), 1)
}

return Rating
