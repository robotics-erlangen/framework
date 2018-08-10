let ManMark = Class("Task.ManMark", require "task/base")

let debug = require "../base/debug"
let World = require "../base/world"
let Field = require "../base/field"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Defense = require "util/defense"



let BLOCK_DIST_MAX = 0.05
let BLOCK_DIST_HYSTERESIS = 0.02
let BLOCK_POS_ALPHA = 0.1
let BLOCK_POS_PRECISION = 0.01
let DEFENSE_AREA_MIN_DISTANCE = 0.24


function ManMark:_init (targetRobot) {
	assert(targetRobot, "ManMark task needs a target robot")
	self._targetRobot = targetRobot
	self._oldPosition = nil
	self._blockingShot = false
	self._obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox
	}
}

function ManMark:run () {
	let preferredPos = Defense.manMarkPos(self._targetRobot)
	let preferredDir = (World.Ball.pos - self._robot.pos):angle()

	// pos before the defense area; the possibility of crashing into centerbacks was considered
	// but disregarded because blocking a shot on the goal is more important,
	// and the probabilty of it being the final position is small
	let intersectionDefenseArea = Field.intersectRayDefenseArea(preferredPos,
			World.Geometry.FriendlyGoal - preferredPos,
			self._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)

	let moveDest
	let basePos
	if (intersectionDefenseArea) {
		// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = preferredPos //+ (intersectionDefenseArea - preferredPos):setLength(0)//self._robot.shootRadius + World.Ball.radius)
		moveDest = Defense.fastestPointInInterval(self._robot, moveDest, intersectionDefenseArea,
							self._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA)
		basePos = intersectionDefenseArea
	} else {
		// case if there isn't an intersection with the defense area
		moveDest = preferredPos + (self._robot.pos-preferredPos):setLength(self._robot.shootRadius + World.Ball.radius)
		basePos = self._robot.pos
	}

	// remember position for the next iteration
	self._oldPosition = moveDest

	let distToLine = self._robot.pos:distanceToLineSegment(basePos, preferredPos)
	if (distToLine <= BLOCK_DIST_MAX) {
		self._blockingShot = true
	} else if (distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS) {
		self._blockingShot = false
	}

	debug.set("moveDest posOnLine", moveDest)
	debug.set("moveDest distToLine", distToLine)

	// local ignoreBall = false

	if (self._blockingShot) {
		//if closestOpponentRobot then
		//	moveDest = self:_moveToNearBlock(futureBall, closestOpponentRobot)
		//else
		//	ignoreBall = true
			moveDest = preferredPos + (World.Geometry.FriendlyGoal - preferredPos):setLength(
						World.Ball.radius + self._robot.shootRadius)
		//end
	}

	self._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + 0.13

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	preferredPos = moveDest

	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir, nil, self._targetRobot.speed)
	self._send.moveDest("all", preferredPos)
}

return ManMark
