let ManMark = Class("Task.ManMark", require "task/base")

import * as debug from "base/debug";
import * as World from "base/world";
import * as Field from "base/field";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as Defense from "glados/util/defense";



let BLOCK_DIST_MAX = 0.05
let BLOCK_DIST_HYSTERESIS = 0.02
let BLOCK_POS_ALPHA = 0.1
let BLOCK_POS_PRECISION = 0.01
let DEFENSE_AREA_MIN_DISTANCE = 0.24


function ManMark:_init (targetRobot) {
	assert(targetRobot, "ManMark task needs a target robot")
	this._targetRobot = targetRobot
	this._oldPosition = nil
	this._blockingShot = false
	this._obstacleTable = {
		ignoreBall = true,
		inbox = this._inbox
	}
}

function ManMark:run () {
	let preferredPos = Defense.manMarkPos(this._targetRobot)
	let preferredDir = (World.Ball.pos - this._robot.pos).angle()

	// pos before the defense area; the possibility of crashing into centerbacks was considered
	// but disregarded because blocking a shot on the goal is more important,
	// and the probabilty of it being the final position is small
	let intersectionDefenseArea = Field.intersectRayDefenseArea(preferredPos,
			World.Geometry.FriendlyGoal - preferredPos,
			this._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)

	let moveDest
	let basePos
	if (intersectionDefenseArea) {
		// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = preferredPos //+ (intersectionDefenseArea - preferredPos).setLength(0)//this._robot.shootRadius + World.Ball.radius)
		moveDest = Defense.fastestPointInInterval(this._robot, moveDest, intersectionDefenseArea,
							this._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA)
		basePos = intersectionDefenseArea
	} else {
		// case if there isn't an intersection with the defense area
		moveDest = preferredPos + (this._robot.pos-preferredPos).setLength(this._robot.shootRadius + World.Ball.radius)
		basePos = this._robot.pos
	}

	// remember position for the next iteration
	this._oldPosition = moveDest

	let distToLine = this._robot.pos.distanceToLineSegment(basePos, preferredPos)
	if (distToLine <= BLOCK_DIST_MAX) {
		this._blockingShot = true
	} else if (distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS) {
		this._blockingShot = false
	}

	debug.set("moveDest posOnLine", moveDest)
	debug.set("moveDest distToLine", distToLine)

	// local ignoreBall = false

	if (this._blockingShot) {
		//if closestOpponentRobot then
		//	moveDest = this._moveToNearBlock(futureBall, closestOpponentRobot)
		//else
		//	ignoreBall = true
			moveDest = preferredPos + (World.Geometry.FriendlyGoal - preferredPos).setLength(
						World.Ball.radius + this._robot.shootRadius)
		//end
	}

	this._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
		< 4 * this._robot.radius + 0.13

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	preferredPos = moveDest

	this._robot.trajectory.update(ToTarget, preferredPos, preferredDir, undefined, this._targetRobot.speed)
	this._send.moveDest("all", preferredPos)
}

return ManMark
