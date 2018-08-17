let Shoot = require "task/ability/shoot"
let Pass = Class("Task.Pass", require "task/base", Shoot)

import * as debug from "base/debug";
import * as Referee from "base/referee";
import * as World from "base/world";

let ObserverShoot = require "observer/shoot"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Rating from "glados/util/rating";

let CHIP_PASS_DISTANCE_FACTOR = 0.4
let MIN_PASS_SPEED = 1
let DEFAULT_PASS_SPEED = 3

function Pass:_init (targetRobot, targetPos, chip, ballReceiptPos, targetTime, targetSpeed) {
	this._targetRobot = targetRobot
	this._targetPos = targetPos
	this._targetTime = targetTime
	this._chipOverride = chip != nil
	this._chip = chip
	this._passSpeed = targetSpeed || targetRobot ? this._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED
	this._ballReceiptPos = ballReceiptPos

	// retrieve targetPos from messages if no argument was given
	if (not targetPos) {
		assert(targetRobot,"anonymous passes need to have a targetPos")
		let sugg = this._inbox.passSuggestion()[targetRobot]
		if (sugg) {
			this._targetPos = sugg.ballPos
		} else {
			this._targetPos = targetRobot.pos +
				Vector.fromAngle(targetRobot.dir) * targetRobot.shootRadius
		}
	}
}

function Pass:updateTarget (targetRobot, targetPos, chip, targetTime, targetSpeed) {
	this._targetRobot = targetRobot
	this._targetPos = targetPos
	this._passSpeed = targetSpeed || targetRobot ? this._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED
	this._targetTime = targetTime
	this._chipOverride = chip != nil
	this._chip = chip
}

let ratePass = function (attackPos, targetPos) {
	let shortestDist = Infinity
	for (_, bot in pairs(World.OpponentRobots)) {
		let dist = bot.pos.distanceToLineSegment(attackPos, targetPos)
		if (dist < shortestDist) {
			shortestDist = dist
		}
	}

	return Rating.valueToRating(shortestDist, 0.5, 3)
}

function Pass:run () {
    let obstacleTable = {
        inbox = this._inbox,
        ignoreBallPlacementObstacle = true
    }
    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	debug.set("targetRobot", this._targetRobot)
	debug.set("targetPos", this._targetPos)

	let maxAngleError = 3.5 * Math.PI / 180
	let isFreekickLike = Referee.isFriendlyFreeKickState() || World.RefereeState == "KickoffOffensive"
	if (isFreekickLike) {
		maxAngleError = 1.5 * Math.PI / 180
	}

	let _, attackPosition = next(this._inbox.attackPosition("broadcast"))
	attackPosition = attackPosition || World.Ball.pos

	let _, attackTime = next(this._inbox.attackTime("broadcast"))


	if (not this._chipOverride) {
		let lockTime = World.Ball.speed.length() > 0.5 ? 0.3 : 0.1
		let lockDecision = this._chip != undefined && attackTime && attackTime < World.Time + lockTime
		if (not lockDecision) {
			let corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
				this._targetPos, CHIP_PASS_DISTANCE_FACTOR, isFreekickLike)
			this._chip = corridor == "chip"
		}
	}

	debug.set("chipOverride", this._chipOverride)
	debug.set("chip", this._chip)
	let targetTime = this._targetTime
	if (this._targetTime) {
		debug.set("targetTime (rel)", targetTime - World.Time)
	}
	debug.set("targetTime", targetTime)

	let attackPos = this._ballReceiptPos || World.Ball.pos
	let targetPos = this._targetPos
	let passSpeed = Math.max((1 - ratePass(attackPos, targetPos)) * this._passSpeed, MIN_PASS_SPEED)
	debug.set("passSpeed", passSpeed)

	if (this._targetRobot == this._robot) {
		this.setMainAttackerParameters(targetPos, this._robot.maxSpeed)
	}

	if (this._chip) {
		this._chipPass(targetPos, this._ballReceiptPos, this._targetTime, maxAngleError)
	} else {
		if (Referee.isFriendlyFreeKickState() || World.RefereeState == "KickoffOffensive") {
			this._shootFreeKick(targetPos, this._passSpeed, this._targetTime, maxAngleError)
		} else {
			this._shoot(targetPos, this._passSpeed, this._targetTime, this._ballReceiptPos, maxAngleError)
		}
	}
}

return Pass
