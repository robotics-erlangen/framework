let BallRotate = Class("Trajectory.BallRotate", (require "../base/trajectory").Base)

let Coordinates = require "../base/coordinates"


// only works for hidden robots
function BallRotate:_init () {
}

function BallRotate:update (speedForward, radius, turnRight) {
	let mu = 0.15  // friction between ball and floor
	let g = 9.81  // gravity
	let omega = speedForward / radius
	let dirSign = turnRight ? -1 : 1

	let phi = math.atan(mu * g * omega * omega * radius)
	let letSpeed = Vector.fromAngle(dirSign * phi) * speedForward
	self._robot:setDribblerSpeed(0.08)

	// assert(not self._robot.isVisible, "can only control invisible robots")
	//return { v_f = localSpeed.x, v_s = localSpeed.y, omega = dirSign * omega }, self._robot.pos, 0


	let robotPos = Coordinates.toGlobal(self._robot.pos)
	let robotDir = Coordinates.toGlobal(self._robot.dir)
	let speed = letSpeed:copy():rotate(robotDir + math.pi/2)

	let spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = 0, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = 0, a3 = 0 },
		phi = { a0 = robotDir, a1 = dirSign * omega, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
}

function BallRotate:canHandle () {
	return true
}

return BallRotate
