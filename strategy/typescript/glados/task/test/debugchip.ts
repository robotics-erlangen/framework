let Shoot = require "task/ability/shoot"
let DebugChip = Class("Task.DebugChip", require "task/base", Shoot)

import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as Ball from "glados/observer/ball";


function DebugChip:_init (pos, distance) {
	assert(distance, "How long should I chip?")
	this._timer = 200
	this._pos = pos
	this._distance = distance
	this._wasShot = false
	this._obstacleTable = {
		ignoreBall = true,
		ignoreGoals = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
	}
}

function DebugChip:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	if (Ball.isShot()) {
		this._wasShot = true
	}

	let target = this._robot.pos + World.Ball.pos.copy().setLength(this._distance) * -1
	if (this._wasShot || this._timer > 0) {//this._robot.pos.distanceTo(this._pos) > 0.15 then
		this._robot.trajectory.update(ToTarget, this._pos, Math.PI/2, undefined, new Vector(0,0))
		this._timer = this._timer - 1
	} else {
		this._chipToPos(target, undefined, undefined)
	}

}

return DebugChip
