local ReceivePass = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local debug = require "../base/debug"
local CatchBall = require "task/ability/catchball"

local FAST_BALL = 0.7
local SAFETY_TIME = 0.2
local SAFETY_TIME_HYSTERESIS = 0.1
local BLOCK_ANGLE = 65 / 180 * math.pi
local BLOCK_HYSTERESIS = 5 / 180 * math.pi

ReceivePass.depends = { CatchBall }

function ReceivePass:init()
	self._receivePassHysteresis = false
	self._receivePassPerpendicularHysteresis = false
end

function ReceivePass:_receivePass(targetPos)
	if World.Ball.speed:length() < FAST_BALL then
		return self:_receivePassFallback(targetPos)
	end

	-- assume robot looks at ball
	local faceBall = (-World.Ball.speed):angle()
	local perpPos = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))

	local ballPos = perpPos + Vector.fromAngle(faceBall):scaleLength(self._robot.shootRadius + World.Ball.radius)
	local ballDist = ballPos:distanceTo(World.Ball.pos)

	local moveTime = Robot.timeToPos1D(self._robot, perpPos, Vector.create(0,0))
	local ballTime = Ball.ballRollTime(World.Ball.speed:length(), ballDist)

	local waitTime = ballTime - moveTime

	debug.set("wait time", waitTime)
	if waitTime > SAFETY_TIME
			or (self._receivePassHysteresis and waitTime > SAFETY_TIME - SAFETY_TIME_HYSTERESIS) then
		-- block ball by moving in its way
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
		self._robot.trajectory:update(ToTarget, perpPos, faceBall)
		self._robot:setDribblerSpeed(0.2)
		self._receivePassHysteresis = true
		self._send.moveDest("all", perpPos)
		-- send the position where the is catched
		self._send.attackPosition("all", ballPos)
	else
		return self:_receivePassFallback(targetPos)
	end
end

function ReceivePass:_receivePassFallback(targetPos)
	self._receivePassHysteresis = false

	-- stop pass if angle is too sharp
	if World.Ball.speed:length() > FAST_BALL then
		local angleToBall = World.Ball.speed:absoluteAngleDiff(self._robot.pos - targetPos)
		if angleToBall > BLOCK_ANGLE then
			self._receivePassPerpendicularHysteresis = true
		elseif angleToBall < BLOCK_ANGLE - BLOCK_HYSTERESIS then
			self._receivePassPerpendicularHysteresis = false
		end

		-- face the ball
		if self._receivePassPerpendicularHysteresis then
			targetPos = World.Ball.pos - World.Ball.speed
		end
	end

	-- keep no extra distance
	self:_catchBall(targetPos, 0)
end

return ReceivePass
