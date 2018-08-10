let ForceShoot = require "task/ability/forceshoot"
let AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ForceShoot)

let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let POSITION_PADDING = 0.02 // safety distance

let CHIP_IMPACT_DIST_FROM_BORDER = 0.5
let CHIP_DIST_FACTOR = 0.25
let CHIP_GOAL_LINE_DIST = 1

function AggressiveKeeper:run () {
	let safeGoalMid = World.Geometry.FriendlyGoal - Vector(0, 0.05)
	let moveDest
	let ignoreBall
	if (World.Ball.pos.y < self._robot.pos.y + POSITION_PADDING) {
		// get between ball and goal
		let ballDist = self._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (safeGoalMid - World.Ball.pos):setLength(ballDist) + Vector(0, -POSITION_PADDING)
		ignoreBall = false
	} else {
		let ballTime = Robot.minTimeToBall(self._robot)
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (self._robot.pos - moveDest):setLength(World.Ball.radius)
		ignoreBall = true
	}

	self:_chipToBorderIfSafe()

	let obstacleTable = {
		["ignoreBall"] = ignoreBall,
		ignorePass = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	let viewDir = World.Ball.pos - safeGoalMid
	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, viewDir * 0.5)
}


let leftFriendlyCorner = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
let rightFriendlyCorner = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)

// assume chips crossing this line might cross the goal line
let leftNearBasePoint = Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let rightNearBasePoint = Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function AggressiveKeeper:_chipToBorderIfSafe () {
	let robotPos = self._robot.pos
	let ballPos = World.Ball.pos
	let robotDir = ballPos - robotPos
	let viewAngle = robotDir:angle()
	let rigthCornerAngle = (rightFriendlyCorner - robotPos):angle()
	let leftCornerAngle = (leftFriendlyCorner - robotPos):angle()
	if (viewAngle > rigthCornerAngle  ||  viewAngle < leftCornerAngle) { // not towards own goal line
		let touchLineIntersection = Field.nextLineCut(robotPos, robotDir)
		let chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)

		if (chipPos  &&  touchLineIntersection) {
			if (robotPos:distanceTo(touchLineIntersection) < robotPos:distanceTo(chipPos)) {
				chipPos = touchLineIntersection
			}
		} else if (touchLineIntersection) { // no nearBaseline
			chipPos = touchLineIntersection
		} else {// probably because ball is out of field
			chipPos = World.Geometry.OpponentGoal
		}
		let chipDist = World.Ball.pos:distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER
		if (chipPos != touchLineIntersection) { // try to avoid icing if chipping towards the opponent goal line
			chipDist = chipDist*CHIP_DIST_FACTOR
		}

		vis.addCircle("t/a/chipToBorder", ballPos + robotDir:copy():setLength(chipDist), 0.1, vis.colors.blue, true)
		if (not Robot.hadBall(self._robot, 0)) {
			self._forceShootTimer = nil
		}
		self:_doForceShoot()
		self._robot:chip(chipDist)
	}
}

return AggressiveKeeper
