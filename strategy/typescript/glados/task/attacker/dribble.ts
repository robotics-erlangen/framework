let CatchBall = require "task/ability/catchball"
let SuggestPass = require "task/ability/suggestpass"
let Dribble = Class("Task.Dribble", require "task/base", SuggestPass, CatchBall)

import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";

// Warning: This task has some very strict precoditions.
// 1. It will only work if you have the ball in the dribbler at the start
// 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}).absoluteAngleDiff(viewDir) is pretty small

let obstacleTable = {
	ignoreBall = true,
	ignorePass = true
}
function Dribble:_init (pos, suggestPass, endSpeedLength) {
	this._pos = pos
	this._dir = (pos - this._robot.pos).angle()
	this._suggestPassFlag = suggestPass
	this._endSpeedLength = endSpeedLength || 0
}

function Dribble:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot:setDribblerSpeed(0.7)

	let time
	if (World.Ball.pos.distanceTo(this._robot.pos) > this._robot.radius + World.Ball.radius + 0.05) {
		let catchTime = this._catchBall(this._pos, 0)
		time = catchTime + Physics.robotTimeToPos(this._robot, this._pos, new Vector(0, 0))
	} else {
		let endSpeed = (this._pos - this._robot.pos).setLength(this._endSpeedLength)
		let _; _, time = this._robot.trajectory.update(ToTarget, this._pos, this._dir, 1.0, endSpeed, undefined, true)
	}


	if (this._suggestPassFlag) {
		this._suggestPass(this._pos, undefined, time)
	}
}

return Dribble
