let RandomKeeper = Class("Task.RandomKeeper", require "task/base")

let Field = require "../base/field"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let DEST_SWITCH_DISTANCE = 0.02
let GOAL_DISTANCE = 0.06

function RandomKeeper:_init () {
	self._nextX = nil
}

function RandomKeeper:run () {
	if (not self._nextX  ||  math.abs(self._robot.pos.x - self._nextX) < DEST_SWITCH_DISTANCE) {
		let bound = World.Geometry.GoalWidth/2 - self._robot.radius
		self._nextX = math.random() * bound * 2 - bound
	}

	let moveDest = Vector(self._nextX,
			-World.Geometry.FieldHeightHalf + self._robot.radius + GOAL_DISTANCE)

	// ignore goal walls if ball is shot
	let obstacleTable = {
		ignoreBall = true,
		ignoreGoals = false,
		ignoreDefenseArea = true,
		stopBallDistance = 0.05
	}
	if (Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius)) {
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, moveDest, math.pi/2)
}

return RandomKeeper
