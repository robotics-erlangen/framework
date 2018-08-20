let SuggestPass = require "task/ability/suggestpass"
let MoveToPos = Class("Task.MoveToPos", require "task/base", SuggestPass)

import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as World from "base/world";


// customObstacles is a table of obstacle tables
// An obstacle table contains a string field called type and parameters relevant for Path:addX
// Type can be "circle", "line", "rect" and "triangle"
function MoveToPos:_init (pos, dir, suggestPass, endSpeedLength, ignoreDefaultObstacles, customObstacles, ignoreBallPlacement, ignoreBall) {
	this._pos = pos
	this._dir = dir || (World.Ball.pos - pos).angle()
	this._suggestPassFlag = suggestPass
	this._endSpeedLength = endSpeedLength || 0
	let ignore = ignoreDefaultObstacles || false
	this._obstacleTable = {
		ignoreBall = ignore || ignoreBall,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = this._inbox,
		ignorePass = (not this._inbox) || ignore,
        ignoreBallPlacementObstacle = ignoreBallPlacement
	}
	this._customObstacles = customObstacles || {}
}

function MoveToPos:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	for (_, obstacle in ipairs(this._customObstacles)) {
		this._addCustomObstacle(obstacle)
	}

	let endSpeed = (this._pos - this._robot.pos).setLength(this._endSpeedLength)
	let _, time = this._robot.trajectory.update(ToTarget, this._pos, this._dir, undefined, endSpeed)

	if (this._suggestPassFlag) {
		this._suggestPassRobotPosition(this._pos, undefined, time)
	}
}

function MoveToPos:_addCustomObstacle (obstInfo) {
	let path = this._robot.path
	// If this gets changed, the comment before _init also needs to be updated
	if (obstInfo.type == "circle") {
		path.addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name)
	} else if (obstInfo.type == "line") {
		path.addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name)
	} else if (obstInfo.type == "rect") {
		path.addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.name)
	} else if (obstInfo.type == "triangle") {
		path.addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth. obstInfo.name)
	}
}

return MoveToPos
