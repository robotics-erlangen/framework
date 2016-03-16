local Hidden = Class("Trajectory.Hidden", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"


-- only works for hidden robots
function Hidden:_init()
end

function Hidden:update(speedForward, speedSide, omega)
	assert(not self._robot.isVisible, "can only control invisible robots")
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	return { v_f = speedForward, v_s = speedSide, omega = omega }, self._robot.pos, 0
end

function Hidden:canHandle(speed, targetDir)
	return true
end

return Hidden
