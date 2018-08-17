let InterceptPass = Class("Task.InterceptPass", require "task/base")

import * as Cache from "base/cache";
import * as Field from "base/field";
import * as World from "base/world";
import * as Ball from "glados/tobserver/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function InterceptPass:_init () {
}


let evaluateInterceptPos = function (robot, pos) {
	let OPP_EXTRA_TIME = 0.05

	// checks if the pos is behind our robot
	if (pos.y < robot.pos.y + 2 * robot.radius) {
		return -Infinity, Infinity
	}

	// checks if the pos is in the allowed field
	if (not Field.isInAllowedField(pos, -2 * robot.radius)) {
		return -Infinity, Infinity
	}

	let ownTime = Physics.robotTimeToPos(robot, pos, (pos - robot.pos).setLength(robot.maxSpeed))
	let bestOppTime = Infinity

	// search the closest opponent
	for (_, oppRobot in ipairs(World.OpponentRobots)) {
		if (oppRobot.pos.distanceTo(pos) < 3 * robot.pos.distanceTo(pos)) {
			let oppTime = Physics.robotTimeToPos(oppRobot, pos, (pos - oppRobot.pos).setLength(robot.maxSpeed))
			if (oppTime < ownTime + OPP_EXTRA_TIME) {
				return -Infinity, ownTime, bestOppTime
			}

			bestOppTime = Math.min(bestOppTime, oppTime)

		}
	}

	return bestOppTime - ownTime, ownTime, bestOppTime

}


// lastPositions[robot][1] - Vector pos
// lastPositions[robot][2] - number time (of pos)
let lastPositions = {}
let calculateInterceptPos = function (robot) {
	let BALL_EXTRA_TIME = 0.05
	let HYST_TIME = 0.1

	// make sure the last position is reasonable and valid
	if (lastPositions[robot] && World.Ball.speed.lengthSq() > 0.5 * 0.5) {
		let pos, dist = lastPositions[robot][1].orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		if (dist > 0.2 || World.Time - lastPositions[robot][2] > 0.5  ||
				World.Ball.speed:dot(lastPositions[robot][1] - World.Ball.pos) < -0.1) {
			lastPositions[robot] = nil
		} else {
			lastPositions[robot] = {pos, World.Time}
		}
	}

	// evaluate a few positions on the line
	let minTime = Robot.minTimeToBall(robot) + BALL_EXTRA_TIME
	let ballOutTime = Physics.ballOutTime(World.Ball, 0)
	let predictedBallOriginPos,_,_,passReceiver = Goal.predictShot()
	if (not passReceiver) {
		error("InterceptPass is running with no pass to intercept")
	}
	let minTimeToOpp = Physics.ballTravelTime(World.Ball, predictedBallOriginPos.distanceTo(World.Ball.pos))
	let maxTime = Math.min(ballOutTime, minTimeToOpp)

	let bestPos
	let bestRating = -Infinity
	let bestRatingOppTime = Infinity
	let posTime
	for (i = -1, 10) {
		let useTime
		let futureBallPos
		let rating = 0

		// reevaluate the previous result
		if (i == -1) {
			rating = rating + (lastPositions[robot] ? HYST_TIME : 0)
			if (lastPositions[robot]) {
				futureBallPos = lastPositions[robot][1]
			} else {
				i = i + 1
			}
		}

		useTime = minTime + i * (maxTime - minTime) / 10
		futureBallPos = futureBallPos || Physics.ballAtTime(World.Ball, useTime).pos

		let evaluation, ownTime, bestOppTime = evaluateInterceptPos(robot, futureBallPos)

		if (evaluation >= 0) {
			rating = rating + evaluation //TODO consider endspeed together with the current time advantage
			if (rating > bestRating) {
				bestRating = rating
				bestPos = futureBallPos
				posTime = ownTime
				bestRatingOppTime = bestOppTime
			}
		}
	}

	if (bestPos) {
		lastPositions[robot] = {bestPos, World.Time}
	} else {
		lastPositions[robot] = nil
	}

	return bestPos, posTime, bestRatingOppTime, bestRating
}


InterceptPass.calculateInterceptPos = Cache.forFrame(calculateInterceptPos)

let obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreOpponentRobots = true,
}


function InterceptPass:run () {
	let moveDest, time, oppTime = InterceptPass.calculateInterceptPos(this._robot)

	if (moveDest == undefined) {
		let dribblerPos = this._robot.pos + Vector.fromAngle(this._robot.dir).scaleLength(
				this._robot.shootRadius + World.Ball.radius)
		moveDest = dribblerPos.nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
		time = Physics.robotTimeToPos(this._robot, moveDest, moveDest.copy().setLength(this._robot.maxSpeed * 0.5))
		let firstEnemy = Ball.firstRobotAtBall(World.OpponentRobots)
		if (not firstEnemy) {
			oppTime = Infinity
		} else {
			let nearestPosOnLine = firstEnemy.pos.nearestPosOnLine(
						World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
			oppTime = Physics.checkedBallTravelTime(World.Ball, nearestPosOnLine)
		}
	}

	let ballTime = Physics.ballTravelTime(World.Ball, World.Ball.pos.distanceTo(moveDest))

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	let dir = (-World.Ball.speed).angle()
	let endSpeed = Physics.robotMinEndspeed(this._robot, moveDest, ballTime)

	if (oppTime - time > 0.3 && time < 0.8) {
		this.setMainAttackerParameters(World.Ball.pos, endSpeed.length())
		this._agent._activeBehavior:_applyForMainAttacker()
	}

	this._robot.trajectory.update(ToTarget, moveDest, dir, undefined, endSpeed)
}

return InterceptPass
