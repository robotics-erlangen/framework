let Hidden = Class("Trajectory.Hidden", (require "+/base/trajectory").Base)


// only works for hidden robots
function Hidden:_init () {
}

function Hidden:update (speedForward, speedSide, omega) {
	assert(not this._robot.isVisible, "can only control invisible robots")
	assert(speedForward != undefined && speedSide != undefined && omega != undefined, "missing parameters!")
	return { v_f = speedForward, v_s = speedSide, omega = omega }, this._robot.pos, 0
}

function Hidden:canHandle () {
	return true
}

return Hidden
