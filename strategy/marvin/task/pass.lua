local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"

local ObserverShoot = require "observer/shoot"

local CHIP_PASS_DISTANCE_FACTOR = 0.4

function Pass:_init(targetRobot, targetPos, chip, passSpeed)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._chip = chip
	self._passSpeed = passSpeed or self._targetRobot.constants.passSpeed

	-- retrieve targetPos from messages if no argument was given
	if not targetPos then
		local sugg = self._inbox.passSuggestion()[targetRobot]
		if sugg then
			self._targetPos = sugg.ballPos
		else
			self._targetPos = targetRobot.pos +
				Vector.fromAngle(targetRobot.dir) * targetRobot.shootRadius
		end
	end
end

function Pass:updateTarget(targetRobot, targetPos)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
end

function Pass:run()
	debug.set("targetRobot", self._targetRobot)
	debug.set("targetPos", self._targetPos)

	local maxAngleError = 3 * math.pi / 180
	if Referee.isFriendlyFreeKickState() or World.RefereeState == "KickoffOffensive" then
		maxAngleError = 1 * math.pi / 180
	end

	local _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	attackPosition = attackPosition or World.Ball.pos


	local chip = self._chip
	if self._chip == nil then
		local corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
			self._targetPos, CHIP_PASS_DISTANCE_FACTOR)
		chip = corridor == "chip"
	end

	local targetPos = self._targetPos
	if chip then
		targetPos = attackPosition + (targetPos - attackPosition) * CHIP_PASS_DISTANCE_FACTOR
	end

	self:_shoot(targetPos, self._passSpeed, not chip, maxAngleError, false)
end

return Pass
