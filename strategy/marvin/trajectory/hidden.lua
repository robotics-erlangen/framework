local Base = require "trajectory/base"
local Hidden = (require "../base/class").new("Trajectory.Hidden", Base)
local Coordinates = require "../base/coordinates"

-- only works for hidden robots
function Hidden:_init()
end

function Hidden:update(speedForward, speedSide)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	return { v_f = speedForward, v_s = speedSide }, self._robot.pos, 0
end

function Hidden:canHandle(speed, targetDir)
	return true
end

return Hidden
