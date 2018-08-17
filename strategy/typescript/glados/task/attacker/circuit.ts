let Circuit = Class("Task.Circuit", require "task/base", require "task/ability/suggestpass")

import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function Circuit:_init (center, angleOffset, radius, passPos, anonym) {
	this._center = center
	this._angleOffset = angleOffset
	this._radius = radius || 0.5
	this._passPos = passPos
	this._anonym = anonym
	this._obstacleTable = {
		ignorePass = true
	}
}

function Circuit:run () {
	let angle = (World.Time % 1000) % (Math.PI*2) + this._angleOffset
	let pos = this._center + Vector.fromAngle(angle) * this._radius
	let dir = (World.Ball.pos - pos).angle()

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)
	this._robot.trajectory.update(ToTarget, pos, dir)

	if (this._passPos) {
		this._suggestPassRobotPosition(this._passPos,nil,nil, this._anonym)
	}
}

return Circuit
