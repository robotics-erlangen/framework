let ForceShoot = require "task/ability/forceshoot"
let ShootoutKeeper = Class("Task.Keeper.ShootoutKeeper",
	require "task/base", ForceShoot)

let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Goal = require "observer/goal"

let G = World.Geometry

let POSITION_PADDING = 0.02 // safety distance

let CHIP_IMPACT_DIST_FROM_BORDER = 0.5
let CHIP_DIST_FACTOR = 0.25
let CHIP_GOAL_LINE_DIST = 1

let SAFE_GOAL_MID = G.FriendlyGoal - Vector(0, 0.05)

let OBSTACLE_TABLE = {
	ignorePass = true
}

function ShootoutKeeper:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, OBSTACLE_TABLE)

	let moveDest
	let endspeed = Vector(0,0)
	let ballSpeed = World.Ball.speed
	let viewDir = World.Ball.pos - SAFE_GOAL_MID

	let ballTime = math.min(Robot.minTimeToBall(self._robot), 1)

	let ballCloserToGoal = World.Ball.pos.y < self._robot.pos.y + POSITION_PADDING
	PathHelper.setObstacleParam(self._robot, "ignoreBall", not ballCloserToGoal)
	if (ballCloserToGoal) {
		// get between ball and goal
		let ballDist = self._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (SAFE_GOAL_MID - World.Ball.pos):setLength(ballDist) + Vector(0, -POSITION_PADDING)
	} else {
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (self._robot.pos - moveDest):setLength(World.Ball.radius + self._robot.radius)
	}

	if (ballSpeed.y < 0) {
		let pos, dir = Goal.predictShot()

		// The x coordinate where the predicted ball will cross the goal line
		let predictedGoallinePoint = geom.intersectLineLine(G.FriendlyGoal, Vector(1, 0), pos, dir).x
		// The distance of the predicted point as a percentage of the half goal width, is 1 if the point is inside the goal
		let centerDistancePerc = math.max(2 * math.abs(predictedGoallinePoint) / G.GoalWidth, 1)

		// Used to determine a spot between predicted shot position and the catch position near the ball
		let alpha = ( 1 - math.exp(-ballSpeed:length() / 2) ) / ( 1 + self._robot.pos:distanceTo(pos) / 2 )
		// It is unlikely that the opponent doesn't want to shoot the ball at our goal
		alpha = alpha / centerDistancePerc

		let interceptPos = self._robot.pos:orthogonalProjection(pos, pos+dir)

		vis.addCircle("t/k/shootoutkeeper: intercept", interceptPos, World.Ball.radius, vis.colors.gold, true)
		vis.addCircle("t/k/shootoutkeeper: intercept", moveDest, World.Ball.radius, vis.colors.gold, true)

		// If the ball was shot and we probably wont reach it in time, we go rambo
		if (ballSpeed.y < -2  &&  ballTime == 1) {
			endspeed = (interceptPos - self._robot.pos):setLength(2) + self._robot.speed
			moveDest = self._robot.pos + (self._robot.speed + endspeed) * ballTime / 2
		} else {
			moveDest = moveDest * (1 - alpha) + interceptPos * alpha
		}
	} else {
		endspeed = viewDir * 0.5
	}

	self:_chipToBorderIfSafe()

	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endspeed)
}


let leftFriendlyCorner = Vector(-G.FieldWidthHalf, -G.FieldHeightHalf)
let rightFriendlyCorner = Vector(G.FieldWidthHalf, -G.FieldHeightHalf)

// assume chips crossing this line might cross the goal line
let leftNearBasePoint = Vector(-G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let rightNearBasePoint = Vector(G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
let nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function ShootoutKeeper:_chipToBorderIfSafe () {
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
			chipPos = G.OpponentGoal
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

return ShootoutKeeper
