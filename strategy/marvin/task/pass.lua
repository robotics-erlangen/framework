local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"

local ObserverShoot = require "observer/shoot"

local CHIP_PASS_DISTANCE_FACTOR = 0.5
local MIN_PASS_SPEED = 3

function Pass:_init(targetRobot, targetPos, chip, passSpeed, ballReceiptPos)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._chipOverride = chip ~= nil
	self._chip = chip
	self._passSpeed = passSpeed or targetRobot and self._targetRobot.constants.passSpeed or MIN_PASS_SPEED
	self._ballReceiptPos = ballReceiptPos

	-- retrieve targetPos from messages if no argument was given
	if not targetPos then
		assert(targetRobot,"anonymous passes need to have a targetPos")
		local sugg = self._inbox.passSuggestion()[targetRobot]
		if sugg then
			self._targetPos = sugg.ballPos
		else
			self._targetPos = targetRobot.pos +
				Vector.fromAngle(targetRobot.dir) * targetRobot.shootRadius
		end
	end
end

function Pass:updateTarget(targetRobot, targetPos, passSpeed)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._passSpeed = passSpeed or targetRobot and self._targetRobot.constants.passSpeed or MIN_PASS_SPEED
end

function Pass:run()
	debug.set("targetRobot", self._targetRobot)
	debug.set("targetPos", self._targetPos)

	local maxAngleError = 3.5 * math.pi / 180
	if Referee.isFriendlyFreeKickState() or World.RefereeState == "KickoffOffensive" then
		maxAngleError = 1.5 * math.pi / 180
	end

	local _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	attackPosition = attackPosition or World.Ball.pos

	local _, attackTime = next(self._inbox.attackTime("broadcast"))


	if not self._chipOverride then
		local lockDecision = self._chip ~= nil and attackTime and attackTime < 0.3
		if not lockDecision then
			local corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
				self._targetPos, CHIP_PASS_DISTANCE_FACTOR)
			self._chip = corridor == "chip"
		end
	end

	debug.set("chipOverride", self._chipOverride)
	debug.set("chip", self._chip)

	local targetPos = self._targetPos
	if self._chip then
		self:_chipPass(targetPos, self._ballReceiptPos, maxAngleError)
	else
		self:_shoot(targetPos, self._passSpeed, self._ballReceiptPos, maxAngleError)
	end
end

return Pass
