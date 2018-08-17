let ForceShoot = require "task/ability/forceshoot"
let AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ForceShoot)

import * as Field from "base/field";
import * as geom from "base/geom";
import * as vis from "base/vis";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let POSITION_PADDING = 0.02 // safety distance

let CHIP_IMPACT_DIST_FROM_BORDER = 0.5
let CHIP_DIST_FACTOR = 0.25
let CHIP_GOAL_LINE_DIST = 1

function AggressiveKeeper:run () {
	let safeGoalMid = World.Geometry.FriendlyGoal - new Vector(0, 0.05)
	let moveDest
	let ignoreBall
	if (World.Ball.pos.y < this._robot.pos.y + POSITION_PADDING) {
		// get between ball and goal
		let ballDist = this._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (safeGoalMid - World.Ball.pos).setLength(ballDist) + new Vector(0, -POSITION_PADDING)
		ignoreBall = false
	} else {
		let ballTime = Robot.minTimeToBall(this._robot)
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (this._robot.pos - moveDest).setLength(World.Ball.radius)
		ignoreBall = true
	}

	this._chipToBorderIfSafe()

	let obstacleTable = {
		["ignoreBall"] = ignoreBall,
		ignorePass = true
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	let viewDir = World.Ball.pos - safeGoalMid
	this._robot.trajectory.update(ToTarget, moveDest, viewDir.angle(), undefined, viewDir * 0.5)
}


let leftFriendlyCorner = new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
let rightFriendlyCorner = new Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)

// assume chips crossing this line might cross the goal line
let leftNearBasePoint = new Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let rightNearBasePoint = new Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function AggressiveKeeper:_chipToBorderIfSafe () {
	let robotPos = this._robot.pos
	let ballPos = World.Ball.pos
	let robotDir = ballPos - robotPos
	let viewAngle = robotDir.angle()
	let rigthCornerAngle = (rightFriendlyCorner - robotPos).angle()
	let leftCornerAngle = (leftFriendlyCorner - robotPos).angle()
	if (viewAngle > rigthCornerAngle || viewAngle < leftCornerAngle) { // not towards own goal line
		let touchLineIntersection = Field.nextLineCut(robotPos, robotDir)
		let chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)

		if (chipPos && touchLineIntersection) {
			if (robotPos.distanceTo(touchLineIntersection) < robotPos.distanceTo(chipPos)) {
				chipPos = touchLineIntersection
			}
		} else if (touchLineIntersection) { // no nearBaseline
			chipPos = touchLineIntersection
		} else {// probably because ball is out of field
			chipPos = World.Geometry.OpponentGoal
		}
		let chipDist = World.Ball.pos.distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER
		if (chipPos != touchLineIntersection) { // try to avoid icing if chipping towards the opponent goal line
			chipDist = chipDist*CHIP_DIST_FACTOR
		}

		vis.addCircle("t/a/chipToBorder", ballPos + robotDir.copy().setLength(chipDist), 0.1, vis.colors.blue, true)
		if (not Robot.hadBall(this._robot, 0)) {
			this._forceShootTimer = nil
		}
		this._doForceShoot()
		this._robot.chip(chipDist)
	}
}

return AggressiveKeeper
