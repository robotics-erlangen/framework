local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"

local ObserverShoot = require "observer/shoot"
local PathHelper = require "trajectory/pathhelper"
local Rating = require "util/rating"

local CHIP_PASS_DISTANCE_FACTOR = 0.5
local MIN_PASS_SPEED = 1
local DEFAULT_PASS_SPEED = 3

function Pass:_init(targetRobot, targetPos, chip, ballReceiptPos, targetTime, targetSpeed)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._targetTime = targetTime
	self._chipOverride = chip ~= nil
	self._chip = chip
	self._passSpeed = targetSpeed or targetRobot and self._targetRobot.constants.passSpeed or DEFAULT_PASS_SPEED
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

function Pass:updateTarget(targetRobot, targetPos, chip, targetTime, targetSpeed)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._passSpeed = targetSpeed or targetRobot and self._targetRobot.constants.passSpeed or DEFAULT_PASS_SPEED
	self._targetTime = targetTime
	self._chipOverride = chip ~= nil
	self._chip = chip
end

local function ratePass(attackPos, targetPos)
	local shortestDist = math.huge
	for _, bot in pairs(World.OpponentRobots) do
		local dist = bot.pos:distanceToLineSegment(attackPos, targetPos)
		if dist < shortestDist then
			shortestDist = dist
		end
	end

	return Rating.valueToRating(shortestDist, 0.5, 3)
end

function Pass:run()
    local obstacleTable = {
        inbox = self._inbox,
        ignoreBallPlacementObstacle = true
    }
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
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
		local lockTime = World.Ball.speed:length() > 0.5 and 0.3 or 0.1
		local lockDecision = self._chip ~= nil and attackTime and attackTime < World.Time + lockTime
		if not lockDecision then
			local corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
				self._targetPos, CHIP_PASS_DISTANCE_FACTOR)
			self._chip = corridor == "chip"
		end
	end

	debug.set("chipOverride", self._chipOverride)
	debug.set("chip", self._chip)
	debug.set("targetTime", self._targetTime)

	local attackPos = self._ballReceiptPos or World.Ball.pos
	local targetPos = self._targetPos
	local passSpeed = math.max((1 - ratePass(attackPos, targetPos)) * self._passSpeed, MIN_PASS_SPEED)
	debug.set("passSpeed", passSpeed)

	if self._targetRobot == self._robot then
		self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	end

	if self._chip then
		self:_chipPass(targetPos, self._ballReceiptPos, self._targetTime, maxAngleError)
	else
		if Referee.isFriendlyFreeKickState() or World.RefereeState == "KickoffOffensive" then
			self:_shootFreeKick(targetPos, self._passSpeed, self._targetTime, maxAngleError)
		else
			self:_shoot(targetPos, self._passSpeed, self._targetTime, self._ballReceiptPos, maxAngleError)
		end
	end
end

return Pass
