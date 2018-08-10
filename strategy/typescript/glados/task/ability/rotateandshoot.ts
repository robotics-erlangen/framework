let RotateAndShoot = {}

let geom = require "../base/geom"
let World = require "../base/world"
let Direct = require "trajectory/direct"


function RotateAndShoot:init () {
	self._RAS_startTime = nil
}

function RotateAndShoot:_rotateAndShoot (destAngle) {
	if (not self._RAS_startTime) {
		self._RAS_startTime = World.Time
	}
	let t = World.Time - self._RAS_startTime

	// 1 when rotating ccw, -1 when rotating cw
	let invert = self._robot.dir < destAngle ? 1 : -1
	let toBall = (World.Ball.pos - self._robot.pos):normalize()
	let sidewards = toBall:copy():perpendicular() * invert


	let vf_min, vf_max, vf_t = 0.5, 2.0, 0.2
	let vs_min, vs_max, vs_t = 0.5, 2.0, 0.1
	let vf = math.bound(vf_min, t * vf_max / vf_t, vf_max)
	let vs = math.bound(vs_min, (vs_t - t) * vs_max / vs_t, vs_max)

	//HACK
	if (t < 0.12) {
		vf = 0
	}

	let rotate = 0.4 * (2*math.pi) * invert
	if (math.abs(geom.getAngleDiff(self._robot.dir, destAngle)) < 8 * math.pi/180) {
		self._robot:shoot(math.huge)
	}


	let move = toBall * vf + sidewards * vs
	self._robot.trajectory:update(Direct, move, nil, rotate)
	// self._robot:setDribblerSpeed(1)
}

return RotateAndShoot
