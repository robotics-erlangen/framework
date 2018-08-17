let RandomKeeper = Class("Task.RandomKeeper", require "task/base")

import * as Field from "base/field";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let DEST_SWITCH_DISTANCE = 0.02
let GOAL_DISTANCE = 0.06

function RandomKeeper:_init () {
	this._nextX = nil
}

function RandomKeeper:run () {
	if (not this._nextX || Math.abs(this._robot.pos.x - this._nextX) < DEST_SWITCH_DISTANCE) {
		let bound = World.Geometry.GoalWidth/2 - this._robot.radius
		this._nextX = Math.random() * bound * 2 - bound
	}

	let moveDest = new Vector(this._nextX,
			-World.Geometry.FieldHeightHalf + this._robot.radius + GOAL_DISTANCE)

	// ignore goal walls if ball is shot
	let obstacleTable = {
		ignoreBall = true,
		ignoreGoals = false,
		ignoreDefenseArea = true,
		stopBallDistance = 0.05
	}
	if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot.trajectory.update(ToTarget, moveDest, Math.PI/2)
}

return RandomKeeper
