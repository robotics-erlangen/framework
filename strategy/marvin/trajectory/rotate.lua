local Rotate = (require "../base/class").new("Trajectory.Direct", (require "../base/trajectory").Base)
local Coordinates = require "../base/coordinates"

function Rotate:_init()
end

function Rotate:update(rotateSpeed)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotDir = Coordinates.toGlobal(self._robot.dir)
	
	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = 0, a2 = 0, a3 = 0 },
		y = { a0 = robotPos.y, a1 = 0, a2 = 0, a3 = 0 },
		phi = { a0 = robotDir, a1 = rotateSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
end

function Rotate:canHandle(rotateSpeed)
	return true
end

return Rotate
