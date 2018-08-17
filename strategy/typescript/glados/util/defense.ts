let Defense = {}

import * as Ball from "glados/tobserver/ball";
import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as Rating from "glados/util/rating";

let G = World.Geometry


function Defense.centerBackDistanceToDefenseArea () {
	// 0.18 (robot diameter) + 0.08 (default distance) + 0.50 (stop radius)
	if (Referee.isStopState()) {
		let dist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)
		return MathUtil.bound(0.01, dist - 0.68, 0.08)
	}
	return 0.08
}

Defense.centerBackDefaultPos = new Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.09 + 0.02)

Defense.POSITION_PADDING = 0.02 // safety distance
Defense.PENALTY_LINE_DISTANCE = 0.35 // prevent robots from crossing the penalty line

Defense.MARKING_DISTANCE = 0.6
Defense.OFFENSIVE_MARKING_DISTANCE = 0.3

let manMarkPos = function (opponent) {
	// use the position at which the robot would brake if it started immediately
	let targetPos = Physics.robotBrakePos({pos: opponent.pos, speed = opponent.speed, radius = opponent.radius})
	if (World.Ball.pos.y > G.FieldHeightHalf * 0.7 && World.Ball.speed.length() < 0.5 && Referee.isStopState()) {
		let dist = opponent.radius + Constants.maxRobotRadius + Defense.OFFENSIVE_MARKING_DISTANCE
		targetPos = targetPos + (World.Ball.pos - targetPos).setLength(dist)
	} else {
		let oppDistToGoal = targetPos.distanceTo(G.FriendlyGoal)
		let markingDistance = Defense.MARKING_DISTANCE + Math.max(0, (oppDistToGoal - G.FieldHeightHalf * 0.8) * 0.5)
		if (Referee.isFriendlyFreeKickState()) {
			markingDistance = markingDistance + 0.4
		}
		let dist = opponent.radius + Constants.maxRobotRadius + markingDistance
		dist = Math.min(oppDistToGoal - 0.01, dist)
		targetPos = targetPos + (G.FriendlyGoal - targetPos).setLength(dist)
	}

	if (Field.isInFriendlyDefenseArea(targetPos, Constants.maxRobotRadius)) {
		let defenseIntersection = Field.intersectRayDefenseArea(targetPos,
			targetPos - G.FriendlyGoal, Constants.maxRobotRadius, true)
		// just to be sure
		if (defenseIntersection) {
			targetPos = defenseIntersection
		} else {
			targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius)
		}
	} else {
		targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius)
	}

	let intersectionDefenseArea = Field.intersectRayDefenseArea(targetPos,
				G.FriendlyGoal - targetPos,
				Constants.maxRobotRadius + 0.1, true)

	if (intersectionDefenseArea && not Referee.isStopState()) {
		targetPos = intersectionDefenseArea + (targetPos - intersectionDefenseArea).scaleLength(0.3)
	}

	if (Referee.isStopState() ? not Referee.isKickoffState() : intersectionDefenseArea
				 &&  intersectionDefenseArea.distanceToSq(targetPos) < 0.75*0.75) {
		targetPos = intersectionDefenseArea || targetPos
	}

	if (World.RefereeState == "PenaltyOffensivePrepare" || World.RefereeState == "PenaltyOffensive") {
		targetPos.y = Math.min(targetPos.y, G.PenaltyLine - Defense.PENALTY_LINE_DISTANCE)
	}

	return targetPos
}
Defense.manMarkPos = Cache.forFrame(manMarkPos)

let piggyPos = function (opponent) {
	let passLine = World.Ball.pos-opponent.pos

	let perpendicularOffset = passLine.perpendicular().setLength(0.3)


	let offset = passLine.setLength(0.3) + perpendicularOffset

	return opponent.pos + offset
}
Defense.piggyPos = Cache.forFrame(piggyPos)

let wasGoalLineIntersection = false
let calculateBallPositionField = function () {
	let targetPos, targetDir, isShot = Goal.predictShot()
	if (isShot && targetDir.y < 0) {
		let goalLineIntersection = geom.intersectLineLine(targetPos,
			targetDir, World.Geometry.FriendlyGoal, new Vector(1, 0))
		let extraWidth = wasGoalLineIntersection ? 0.25 : 0.15
		if (goalLineIntersection  &&
				Math.abs(goalLineIntersection.x) < World.Geometry.GoalWidth / 2 + extraWidth) {
			wasGoalLineIntersection = true
			return targetPos, targetDir
		}
	}
	wasGoalLineIntersection = false
	return targetPos
}
Defense.calculateBallPositionField = Cache.forFrame(calculateBallPositionField)

let calculateBallPosition = function () {
	return Defense.centerBackPos(calculateBallPositionField())
}
Defense.calculateBallPosition = calculateBallPosition

//calculates the centerBackPos for a target
//if targetDir is supplied, the CB will position itself between targetPos and intersectRayDefenseArea(pos, dir, ...)
//if that intersection is empty or no dir is supplied, it wil position itself between the target and the center of the goal
let centerBackPos = function (targetPos, targetDir) {
	let dist = Defense.centerBackDistanceToDefenseArea() + Constants.maxRobotRadius
	if (targetDir) {
		//use targetPos even if it is slightly outside the field if it is going to be shot back in
		//don't rely on the autoref to disqualify this shot
		let pos, way, sec = Field.intersectRayDefenseArea(targetPos, targetDir, dist, true)
		if (pos) {
			return pos, way, sec
		}
	}
	targetPos = Field.limitToField(targetPos, -0.01)
	let dir = targetPos - World.Geometry.FriendlyGoal
	let pos, way, sec = Field.intersectRayDefenseArea(World.Geometry.FriendlyGoal, dir, dist, true)
	return pos || Defense.centerBackDefaultPos, way, sec
}
Defense.centerBackPos = Cache.forFrame(centerBackPos)

// if the ball will reach our defense area with at least that speed, stay defender
let DANGEROUS_BALL_SPEED = 3.0
function Defense.dangerousBallTowardsDefense (opp) {
	// if the ball rolls towards our defense area with high speed, stay defender
	let defenseLineIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, not opp)
	if (defenseLineIntersection) {
		let timeToDefenseLine = Physics.ballRollTime(World.Ball,
			World.Ball.pos.distanceTo(defenseLineIntersection))
		let speedAtDefenseLine = Physics.ballAtTime(World.Ball, timeToDefenseLine).speed.length()
		if (speedAtDefenseLine > DANGEROUS_BALL_SPEED) {
			return true
		}
	}
	return false
}

function Defense.getClosestRobot (robotlist, pos) {
	let minDist = Infinity
	let minRobot = nil
	for (_, r in ipairs(robotlist)) {
		let dist = r.pos.distanceTo(pos)
		if (dist < minDist) {
			minDist = dist
			minRobot = r
		}
	}
	return minRobot, minDist
}

let ratePassThreats = function () {
	let dangerousness = {}
	let futureBallPos = Goal.predictShot()
	for (let opp of World.OpponentRobots) {
		// TODO comment
		let angleBallOppGoal = (futureBallPos - opp.pos).absoluteAngleDiff(
			World.Geometry.FriendlyGoal - opp.pos)
		let angleOppGoalY = (opp.pos - World.Geometry.FriendlyGoal).absoluteAngleDiff(new Vector(0, 1))
		let distOppGoal = opp.pos.distanceTo(World.Geometry.FriendlyGoal)

		let ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 120 * Math.PI/180, 80 * Math.PI/180)
		let ratingAngleOppGoalY = Rating.valueToRating(angleOppGoalY, 85 * Math.PI/180, 70 * Math.PI/180)
		let ratingDistOppGoal = Rating.valueToRating(distOppGoal,
			World.Geometry.FieldHeight * 0.85, World.Geometry.FieldHeight * 0.4)

		let rating = ratingAngleBallOppGoal * ratingAngleOppGoalY * ratingDistOppGoal
		dangerousness[opp] = rating
	}
	return dangerousness
}
Defense.ratePassThreats = Cache.forFrame(ratePassThreats)

let rateVolleyGoalShotThreats = function () {
	let dangerousness = {}
	if (World.Ball.speed.length() > 1.5) {
		for (let opp of World.OpponentRobots) {
			let rating = 1
			if (not Robot.hadBall(opp, 0.2)) {
				let angleBallOppGoal = (World.Ball.pos - opp.pos).absoluteAngleDiff(
						World.Geometry.FriendlyGoal - opp.pos)
				let angleBallSpeedOpp = World.Ball.speed.absoluteAngleDiff(opp.pos - World.Ball.pos)
				let ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 85 * Math.PI/180, 65 * Math.PI/180)
				let ratingAngleBallSpeedOpp = Rating.valueToRating(angleBallSpeedOpp, 45 * Math.PI/180, 30 * Math.PI/180)
				rating = ratingAngleBallOppGoal * ratingAngleBallSpeedOpp
			}
			let absAngleOppDirGoal = Math.abs(geom.normalizeAngle(
					opp.dir - (World.Geometry.FriendlyGoal - opp.pos).angle()))
			let ratingAbsAngleOppDirGoal = Rating.valueToRating(absAngleOppDirGoal, 60 * Math.PI/180, 20 * Math.PI/180)
			dangerousness[opp] = rating * ratingAbsAngleOppDirGoal
		}
	}
	return dangerousness
}
Defense.rateVolleyGoalShotThreats = Cache.forFrame(rateVolleyGoalShotThreats)

let rateProximityThreats = function () {
	let dangerousness = {}
	for (let opp of World.OpponentRobots) {
		dangerousness[opp] = 0.01 * Rating.valueToRating(opp.pos.distanceTo(World.Geometry.FriendlyGoal), World.Geometry.FieldHeightHalf, 0)
	}
	return dangerousness
}

let rateOpponentDangerousness = function () {
	let passThreats = ratePassThreats()
	let goalThreats = rateVolleyGoalShotThreats()
	let proximityThreats = rateProximityThreats()

	let dangerousness = {}
	for (let opp of World.OpponentRobots) {
		let passDangerousness = passThreats[opp] || 0
		let goalDangerousness = goalThreats[opp] || 0
		let proximityDangerousness = proximityThreats[opp]
		dangerousness[opp] = Math.max(passDangerousness, Math.max(goalDangerousness, proximityDangerousness))
	}

	debug.set("dangerousness", dangerousness)
	return dangerousness
}
Defense.rateOpponentDangerousness = Cache.forFrame(rateOpponentDangerousness)

let rateOpponentPassViability = function () {
	if (not amun.isPerformanceMode) {
		debug.push("Util Defense")
		debug.push("passViability")
	}

	let passViability = {} // opponent -> rating

	let ballPos = World.Ball.pos + World.Ball.speed/2
	for (let opp of World.OpponentRobots) {

		// ignore the ball owner
		if (opp.pos.distanceToSq(ballPos) < 0.5) {
			passViability[opp] = 0
			continue;
		}

		// ignore opponents close to enemy defense area
		if (opp.pos.y > G.FieldHeightHalf - G.DefenseHeight - 1) {
			passViability[opp] = 0
			continue;
		}

		// ignore opponents that are too close to the defense area
		if (Field.distanceToDefenseAreaSq(opp.pos, true) < 1.5 * 1.5) {
			passViability[opp] = 0
			continue;
		}

		// ignore opponents that are too close to the defense area
		if (Field.distanceToDefenseAreaSq(opp.pos, true) < 1.5 * 1.5) {
			passViability[opp] = 0
			continue;
		}

		// ignore opponents that are behind the ball
		if (opp.pos.y - World.Ball.pos.y > 2 * Constants.maxRobotRadius) {
			passViability[opp] = 0
			continue;
		}

		// we can successfully intercept long passes more easily
		let distToBallOwner = opp.pos.distanceTo(ballPos)
		let distToBallOwnerRating = Rating.valueToRating(distToBallOwner, 2, 5)

		// we do not want the enemy to move the ball closer to our goal
		let minRating = 0.6
		let distToGoal = opp.pos.y + opp.speed.y/2 + G.FieldHeightHalf
		let distToGoalRating = (1 - minRating) * Rating.valueToRating(distToGoal, G.FieldHeight - G.DefenseHeight, G.DefenseHeight + 1) + minRating

		let rating = distToGoalRating * distToBallOwnerRating
		passViability[opp] = rating

		if (Ball.receivesPass(opp)) {
			rating = rating + 0.5
		}

		if (not amun.isPerformanceMode) {
			debug.push(String(opp.id))
			debug.set("distToBallOwnerRating", distToBallOwnerRating)
			debug.set("distToGoalRating", distToGoalRating)
			debug.set("total rating", rating)
			debug.pop()
		}
	}

	if (not amun.isPerformanceMode) {
		debug.pop()
		debug.pop()
	}

	debug.set("passViability", passViability)
	return passViability
}
Defense.rateOpponentPassViability = Cache.forFrame(rateOpponentPassViability)

// this function searches for a position between boundaryOne and boundaryTwo to which the robot will take
// the shortest amount of time, up to a precision value, using a ternary algorithm
function Defense.findBestPointToBlockOpponentShot (robot, boundaryOne, boundaryTwo, timeToBoundaryOne, timeToBoundaryTwo, precision) {
	// time diff between the two bounds
	if (Math.abs(timeToBoundaryOne - timeToBoundaryTwo) < precision  ||
			boundaryOne.distanceTo(boundaryTwo) < 0.005) {
		return boundaryOne
	}

	// calculate two new positions on the line
	let leftThird = (boundaryOne * 2 + boundaryTwo) / 3
	let rightThird = (boundaryOne + boundaryTwo * 2) / 3

	// calculate time to the new positions
	let timeToLeftThird = Physics.robotTimeToPos(robot, leftThird, new Vector(0, 0), false, false)
	let timeToRightThird = Physics.robotTimeToPos(robot, rightThird, new Vector(0,0), false, false)

	// depending on which time is smaller recursively call the function with new boundaries
	if (timeToLeftThird < timeToRightThird) {
		return Defense.findBestPointToBlockOpponentShot(robot, boundaryOne, rightThird, timeToBoundaryOne, timeToRightThird, precision)
	} else {
		return Defense.findBestPointToBlockOpponentShot(robot, leftThird, boundaryTwo, timeToLeftThird, timeToBoundaryTwo, precision)
	}
}

// this function calculates a new position between boundaryOne and boundaryTwo regarding the oldPosition
function Defense.fastestPointInInterval (robot, boundaryOne, boundaryTwo, oldPos, precision, blockAlpha) {
	// time to the boundaries
	let timeToBoundaryOne = Physics.robotTimeToPos(robot, boundaryOne, new Vector(0, 0), false, false)
	let timeToBoundaryTwo = Physics.robotTimeToPos(robot, boundaryTwo, new Vector(0, 0), false, false)

	let newPos = Defense.findBestPointToBlockOpponentShot(robot, boundaryOne, boundaryTwo, timeToBoundaryOne, timeToBoundaryTwo, precision)
	if (oldPos) {
		oldPos = oldPos.nearestPosOnLine(boundaryOne, boundaryTwo)
	} else {
		oldPos = newPos
	}

	// don't let the postion jump to much between frames
	return newPos * blockAlpha + oldPos * (1-blockAlpha)
}

let calculateDefenseCornerFactor = function (robot_radius, buffer, distance) {
	let distanceRHalf = robot_radius + buffer/2
	let extraDistance = distance + robot_radius
	return distanceRHalf/extraDistance / Math.asin(distanceRHalf/ extraDistance)
}
Defense.cornerFactor = calculateDefenseCornerFactor(0.09, 0.02, 0.08)

// sec - Sector:
// 2  3  4
// 1     5
let switchSecMul
function Defense.mulCornerFactor (way, sec, distance) {
	if (not switchSecMul) {
		switchSecMul = {}
		let defenseHeight = G.DefenseHeight
		let defenseWidth = G.DefenseWidth
		let factor = Defense.cornerFactor
		switchSecMul[1] = function(_way)
			return _way
		}
		switchSecMul[2] = function(_way)
			return defenseHeight + (_way - defenseHeight) * factor
		}
		switchSecMul[3] = function(_way, _distance)
			return _way + (Math.PI/2 * _distance * (factor-1))
		}
		switchSecMul[4] = function(_way)
			return defenseHeight + defenseWidth + (_way - defenseHeight - defenseWidth) * factor
		}
		switchSecMul[5] = function(_way, _distance)
			return _way + (Math.PI * _distance * (factor-1))
		}
	}
	return switchSecMul[sec](way, distance)
}
function Defense.divCornerFactor (way, distance) {
	let defenseHeight = G.DefenseHeight
	let defenseWidth = G.DefenseWidth
	let factor = Defense.cornerFactor
	let corner = distance * Math.PI/2
	let maxCornerWay = corner * factor
	let restWay = way

	if (restWay <= defenseHeight) {
		return restWay
	}
	restWay = restWay - defenseHeight

	if (restWay <= maxCornerWay) {
		return defenseHeight + restWay/factor
	}
	restWay = restWay - maxCornerWay

	if (restWay <= defenseWidth) {
		return defenseHeight + corner + restWay
	}
	restWay = restWay - defenseWidth

	if (restWay <= maxCornerWay) {
		return defenseHeight + defenseWidth + corner + restWay/factor
	}
	restWay = restWay - maxCornerWay
	return defenseHeight + defenseWidth + corner*2 + restWay
}

return Defense
