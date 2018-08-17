let Direct = Class("Trajectory.Direct", (require "+/base/trajectory").Base)

let Coordinates = require "+/base/coordinates"
import * as geom from "base/geom";


function Direct:_init () {
}

// only targetDir or rotateSpeed may be passed!
// accel is optional
function Direct:update (speed, targetDir, rotateSpeed, accel) {
	speed = Coordinates.toGlobal(speed)
	if (accel) {
		accel = Coordinates.toGlobal(accel)
	} else {
		accel = new Vector(0, 0)
	}
	// play motion controller
	let robotSpeed = Coordinates.toGlobal(this._robot.speed)
	let k_v = 0.5
	speed = speed + (speed - robotSpeed) * k_v

	let robotPos = Coordinates.toGlobal(this._robot.pos)
	let robotDir = Coordinates.toGlobal(this._robot.dir)
	assert(targetDir == undefined || rotateSpeed == undefined, "rotating while having a fixed direction makes no sense")

	if (rotateSpeed == undefined) {
		let limitRot = 4 * Math.PI
		let k_omega = 10
		targetDir = Coordinates.toGlobal(targetDir)
		let error_phi = geom.getAngleDiff(robotDir, targetDir)
		rotateSpeed = MathUtil.bound(-limitRot, error_phi * k_omega, limitRot)
	}

	let spline = { {t_start = 0, t_end = Infinity,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = accel.x / 2, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = accel.y / 2, a3 = 0 },
		phi = { a0 = robotDir, a1 = rotateSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, this._robot.pos, 0
}

function Direct:canHandle () {
	return true
}

return Direct
