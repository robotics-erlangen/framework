local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"

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

	self:_shoot(self._targetPos, self._passSpeed, not self._chip, maxAngleError, false)
end

return Pass
