let Shoot = require "task/ability/shoot"
let Pass = Class("Task.Pass", require "task/base", Shoot)

let debug = require "../base/debug"
let Referee = require "../base/referee"
let World = require "../base/world"

let ObserverShoot = require "observer/shoot"
let PathHelper = require "trajectory/pathhelper"
let Rating = require "util/rating"

let CHIP_PASS_DISTANCE_FACTOR = 0.4
let MIN_PASS_SPEED = 1
let DEFAULT_PASS_SPEED = 3

function Pass:_init (targetRobot, targetPos, chip, ballReceiptPos, targetTime, targetSpeed) {
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._targetTime = targetTime
	self._chipOverride = chip != nil
	self._chip = chip
	self._passSpeed = targetSpeed  ||  targetRobot ? self._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED
	self._ballReceiptPos = ballReceiptPos

	// retrieve targetPos from messages if no argument was given
	if (not targetPos) {
		assert(targetRobot,"anonymous passes need to have a targetPos")
		let sugg = self._inbox.passSuggestion()[targetRobot]
		if (sugg) {
			self._targetPos = sugg.ballPos
		} else {
			self._targetPos = targetRobot.pos +
				Vector.fromAngle(targetRobot.dir) * targetRobot.shootRadius
		}
	}
}

function Pass:updateTarget (targetRobot, targetPos, chip, targetTime, targetSpeed) {
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._passSpeed = targetSpeed  ||  targetRobot ? self._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED
	self._targetTime = targetTime
	self._chipOverride = chip != nil
	self._chip = chip
}

let ratePass = function (attackPos, targetPos) {
	let shortestDist = math.huge
	for (_, bot in pairs(World.OpponentRobots)) {
		let dist = bot.pos:distanceToLineSegment(attackPos, targetPos)
		if (dist < shortestDist) {
			shortestDist = dist
		}
	}

	return Rating.valueToRating(shortestDist, 0.5, 3)
}

function Pass:run () {
    let obstacleTable = {
        inbox = self._inbox,
        ignoreBallPlacementObstacle = true
    }
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	debug.set("targetRobot", self._targetRobot)
	debug.set("targetPos", self._targetPos)

	let maxAngleError = 3.5 * math.pi / 180
	let isFreekickLike = Referee.isFriendlyFreeKickState()  ||  World.RefereeState == "KickoffOffensive"
	if (isFreekickLike) {
		maxAngleError = 1.5 * math.pi / 180
	}

	let _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	attackPosition = attackPosition  ||  World.Ball.pos

	let _, attackTime = next(self._inbox.attackTime("broadcast"))


	if (not self._chipOverride) {
		let lockTime = World.Ball.speed:length() > 0.5 ? 0.3 : 0.1
		let lockDecision = self._chip != nil  &&  attackTime  &&  attackTime < World.Time + lockTime
		if (not lockDecision) {
			let corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
				self._targetPos, CHIP_PASS_DISTANCE_FACTOR, isFreekickLike)
			self._chip = corridor == "chip"
		}
	}

	debug.set("chipOverride", self._chipOverride)
	debug.set("chip", self._chip)
	let targetTime = self._targetTime
	if (self._targetTime) {
		debug.set("targetTime (rel)", targetTime - World.Time)
	}
	debug.set("targetTime", targetTime)

	let attackPos = self._ballReceiptPos  ||  World.Ball.pos
	let targetPos = self._targetPos
	let passSpeed = math.max((1 - ratePass(attackPos, targetPos)) * self._passSpeed, MIN_PASS_SPEED)
	debug.set("passSpeed", passSpeed)

	if (self._targetRobot == self._robot) {
		self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	}

	if (self._chip) {
		self:_chipPass(targetPos, self._ballReceiptPos, self._targetTime, maxAngleError)
	} else {
		if (Referee.isFriendlyFreeKickState()  ||  World.RefereeState == "KickoffOffensive") {
			self:_shootFreeKick(targetPos, self._passSpeed, self._targetTime, maxAngleError)
		} else {
			self:_shoot(targetPos, self._passSpeed, self._targetTime, self._ballReceiptPos, maxAngleError)
		}
	}
}

return Pass
