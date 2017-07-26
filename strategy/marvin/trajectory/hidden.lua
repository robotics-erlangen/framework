local Hidden = Class("Trajectory.Hidden", (require "../base/trajectory").Base)


-- only works for hidden robots
function Hidden:_init()
end

function Hidden:update(speedForward, speedSide, omega)
	assert(not self._robot.isVisible, "can only control invisible robots")
	assert(speedForward ~= nil and speedSide ~= nil and omega ~= nil, "missing parameters!")
	return { v_f = speedForward, v_s = speedSide, omega = omega }, self._robot.pos, 0
end

function Hidden:canHandle()
	return true
end

return Hidden
