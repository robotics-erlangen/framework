let StopAttack = Class("Task.StopAttack", require "task/base")

let Constants = require "../base/constants"
let Field = require "../base/field"
let geom = require "../base/geom"
let Math = require "../base/math"
let World = require "../base/world"
let Physics = require "observer/physics"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let UtilDefense = require "util/defense"
let RobotList = require "util/robotlist"

let POSITION_PADDING = 0.2 // safety distance

function StopAttack:_init (minDistToBall) {
	self._focusPoint = Vector(0, -World.Geometry.FieldHeightHalf + 4 * self._robot.radius)
	self._side = World.Ball.pos.x < 0 ? "left" : "right"
	self._defenseHysteresis = false
	self._minDistToBall = minDistToBall  ||  Constants.stopBallDistance
}

// normalize angle created by direction to be always relative to segment ball to field border
let getNormalizedAngle = function (direction) {
	let angle = direction:angle()
	if (World.Ball.pos.x > 0) {
		angle = geom.normalizeAnglePositive(angle)
	}
	return angle
}

function StopAttack:run () {
	let stopRadius = self._minDistToBall + self._robot.radius + POSITION_PADDING
	let pos = World.Ball.pos + (self._focusPoint - World.Ball.pos):setLength(stopRadius)
	let driveAngle = (World.Ball.pos - pos):angle()

	let opponentShooter, dist = UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	// hysteresis on distance between opponent shooter and ball
	if (self._defenseHysteresis) {
		dist = dist - 0.5
	}

	// try to always be where the opponent shooter will try to shoot
	let isOpponentFreekickState = World.RefereeState == "IndirectDefensive"  ||  World.RefereeState == "DirectDefensive"
	let defendOpponentPasses = World.Ball.pos.y > 0  &&  isOpponentFreekickState

	let passReceivers = RobotList.excludeRobots(World.OpponentRobots, {opponentShooter, World.OpponentKeeper})
	if (dist < 0.2 + self._robot.radius  &&  defendOpponentPasses  &&  #passReceivers > 0) {
		let minAngle = math.huge
		let maxAngle = -math.huge
		for (_, robot in ipairs(passReceivers)) {
			let angle = getNormalizedAngle(Field.limitToAllowedField(Physics.robotBrakePos(robot), robot.radius) - World.Ball.pos)
			if (World.Ball.pos.x > 0) {
				angle = geom.normalizeAnglePositive(angle)
			}
			if (angle < minAngle) {
				minAngle = angle
			}
			if (angle > maxAngle) {
				maxAngle = angle
			}
		}
		let relativeAngle = getNormalizedAngle(World.Ball.pos - opponentShooter.pos)
		let boundedAngle = Math.bound(minAngle, relativeAngle, maxAngle)
		let opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter.dir))
		let boundedOppDirection = Math.bound(minAngle, opponentDirection, maxAngle)
		let middleAngle = (boundedAngle + boundedOppDirection) / 2

		pos = World.Ball.pos + Vector.fromAngle(middleAngle):setLength(stopRadius)
		// try to hit the side of the opponent robot to reflect the ball out of the field
		driveAngle = (opponentShooter.pos - pos):angle() + 0.02

		self._defenseHysteresis = true
		self._robot:setDribblerSpeed(0.8) // might be quite loud
	} else {
		// position between ball and goal
		self._defenseHysteresis = false
		if (Field.isInFriendlyDefenseArea(pos, 4 * self._robot.radius + 0.05)) {
			let intersections = Field.intersectCircleDefenseArea(World.Ball.pos,
					stopRadius, 4 * self._robot.radius + 0.05, true)
			if (#intersections > 0) {
				pos = nil
				let distanceToSqMin = math.huge
				for (_,p in ipairs(intersections)) {
					let distanceToSqCur = p:distanceToSq(World.Geometry.FriendlyGoal)
					if (distanceToSqCur < distanceToSqMin) {
						pos = p
						distanceToSqMin = distanceToSqCur
					}

//					TODO: Think!
//					if not pos or (self._side == "left" and p.x < pos.x) or
//							(self._side == "right" and p.x > pos.x) then
//						pos = p
//					end
				}
			}
		}
		if (self._side == "left"  &&  World.Ball.pos.x < -0.3) {
			self._side = "right"
		} else if (self._side == "right"  &&  World.Ball.pos.x > 0.3) {
			self._side = "left"
		}

		if (World.RefereeState == "DirectDefensive"  ||  World.RefereeState == "IndirectDefensive") {
			self._robot:setDribblerSpeed(0.6)
		}
	}

	let obstacleTable = {
		ignorePass = false,
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	self._robot.trajectory:update(ToTarget, pos, driveAngle)
}

return StopAttack
