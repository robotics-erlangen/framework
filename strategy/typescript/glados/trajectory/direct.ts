let Direct = Class("Trajectory.Direct", (require "../base/trajectory").Base)

let Coordinates = require "../base/coordinates"
let geom = require "../base/geom"


function Direct:_init () {
}

// only targetDir or rotateSpeed may be passed!
// accel is optional
function Direct:update (speed, targetDir, rotateSpeed, accel) {
	speed = Coordinates.toGlobal(speed)
	if (accel) {
		accel = Coordinates.toGlobal(accel)
	} else {
		accel = Vector(0, 0)
	}
	// play motion controller
	let robotSpeed = Coordinates.toGlobal(self._robot.speed)
	let k_v = 0.5
	speed = speed + (speed - robotSpeed) * k_v

	let robotPos = Coordinates.toGlobal(self._robot.pos)
	let robotDir = Coordinates.toGlobal(self._robot.dir)
	assert(targetDir == nil  ||  rotateSpeed == nil, "rotating while having a fixed direction makes no sense")

	if (rotateSpeed == nil) {
		let limitRot = 4 * math.pi
		let k_omega = 10
		targetDir = Coordinates.toGlobal(targetDir)
		let error_phi = geom.getAngleDiff(robotDir, targetDir)
		rotateSpeed = math.bound(-limitRot, error_phi * k_omega, limitRot)
	}

	let spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = accel.x / 2, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = accel.y / 2, a3 = 0 },
		phi = { a0 = robotDir, a1 = rotateSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
}

function Direct:canHandle () {
	return true
}

return Direct
