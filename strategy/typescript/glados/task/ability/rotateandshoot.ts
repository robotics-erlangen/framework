let RotateAndShoot = {}

import * as geom from "base/geom";
import * as World from "base/world";
let Direct = require "trajectory/direct"


function RotateAndShoot:init () {
	this._RAS_startTime = nil
}

function RotateAndShoot:_rotateAndShoot (destAngle) {
	if (not this._RAS_startTime) {
		this._RAS_startTime = World.Time
	}
	let t = World.Time - this._RAS_startTime

	// 1 when rotating ccw, -1 when rotating cw
	let invert = this._robot.dir < destAngle ? 1 : -1
	let toBall = (World.Ball.pos - this._robot.pos):normalize()
	let sidewards = toBall.copy().perpendicular() * invert


	let vf_min, vf_max, vf_t = 0.5, 2.0, 0.2
	let vs_min, vs_max, vs_t = 0.5, 2.0, 0.1
	let vf = MathUtil.bound(vf_min, t * vf_max / vf_t, vf_max)
	let vs = MathUtil.bound(vs_min, (vs_t - t) * vs_max / vs_t, vs_max)

	//HACK
	if (t < 0.12) {
		vf = 0
	}

	let rotate = 0.4 * (2*Math.PI) * invert
	if (Math.abs(geom.getAngleDiff(this._robot.dir, destAngle)) < 8 * Math.PI/180) {
		this._robot.shoot(Infinity)
	}


	let move = toBall * vf + sidewards * vs
	this._robot.trajectory.update(Direct, move, undefined, rotate)
	// this._robot:setDribblerSpeed(1)
}

return RotateAndShoot
