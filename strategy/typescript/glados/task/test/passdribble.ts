let CatchBall = require "task/ability/catchball"
let PassDribble = Class("Task.PassDribble", require "task/base", CatchBall)

import * as PathHelper from "glados/trajectory/pathhelper";

let obstacleTable = {
    ignorePass = true
}

function PassDribble:_init (targetRobot) {
	this._targetRobot = targetRobot
}

function PassDribble:run () {
    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot:setDribblerSpeed(1)
	this._catchBall(this._targetRobot.pos, 0, undefined)
}

return PassDribble
