local Direct = (require "../base/class").new("Trajectory.Direct", (require "../base/trajectory").Base)
local Coordinates = require "../base/coordinates"

function Direct:_init()
end

function Direct:update(speed, targetDir, rotateSpeed)
	speed = Coordinates.toGlobal(speed)
	targetDir = Coordinates.toGlobal(targetDir)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	
	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = 0, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = 0, a3 = 0 },
		phi = { a0 = targetDir, a1 = rotateSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
end

function Direct:canHandle(speed, targetDir)
	return true
end

return Direct
