local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local DefUtil = require "util/defense"
local Duel = require "task/duel"
local InterceptPass = require "task/interceptpass"
local debug = require "../base/debug"


function HandleBall:_stop()
	self._taskDecision = nil
end

function HandleBall:_checkDefender()
	-- stay defender if the ball is currently being shot at our goal
	if DefUtil.dangerousBallTowardsDefense() then
		return true
	end
	return false
end

function HandleBall:_checkAttacker()
	local isAttacker = self._taskDecision == "attacker"
	
	-- don't if we take too long to get the ball
	local timeToBallLimit = isAttacker and 1.5 or 1.0
	if Physics.robotTimeToBall(self._robot, World.Ball, World.Geometry.OpponentGoal, 0) > timeToBallLimit then
		return false
	end

	-- don't if an opponent is at the ball rather quickly
	local oppTimeToBallLimit = isAttacker and 1.0 or 0.7
	local _,oppTime = Ball.firstRobotAtBall(World.OpponentRobots)
	if oppTime < oppTimeToBallLimit then
		return false
	end

	-- don't if an opponent is close to us
	local distToOppLimit = isAttacker and 0.5 or 0.7
	local _,closestOppDist = DefUtil.getClosestRobot(World.OpponentRobots, self._robot.pos)
	if closestOppDist < distToOppLimit then
		return false
	end

	return true
end

function HandleBall:_checkInterceptPass()
	local isInterceptPass = self._taskDecision == "interceptpass"

	-- don't if the ball is too slow
	local ballSpeedLimit = isInterceptPass and 1.5 or 2.0
	if World.Ball.speed:length() < ballSpeedLimit then
		return false
	end

	-- don't if the ball is between the robot and our goal
	local moveDest, moveTime = InterceptPass.calculateMoveDest(self._robot)
	local towardsGoal = World.Geometry.FriendlyGoal - moveDest
	local towardsBall = World.Ball.pos - moveDest
	local angleLimit = isInterceptPass and 90 * math.pi/180 or 105 * math.pi/180
	if towardsGoal:absoluteAngleDiff(towardsBall) < angleLimit then
		return false
	end

	-- don't if the time to intercept the pass is too high
	local interceptionTimeLimit = isInterceptPass and 1.5 or 1.0
	if moveTime > interceptionTimeLimit then
		return false
	end

	-- don't if there is no opponent pass receiver
	local opponentPassReceipients = {}
	for _,r in ipairs(World.OpponentRobots) do
		if Ball.receivesPass(r) then
			table.insert(opponentPassReceipients, r)
		end
	end
	if #opponentPassReceipients == 0 then
		return false
	end

	-- don't if we are positioned behind a dangerous pass receipient
	local distDiffLimit = isInterceptPass and 0 or 4 * self._robot.radius
	local volleyAngleLimit = isInterceptPass and 70 * math.pi/180 or 80 * math.pi/180
	local selfPosOnBallLine = self._robot.pos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
	local selfDistToBall = World.Ball.pos:distanceTo(selfPosOnBallLine)
	for _,r in ipairs(opponentPassReceipients) do
		local oppPosOnBallLine = r.pos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		local oppDistToBall = World.Ball.pos:distanceTo(oppPosOnBallLine)
		local volleyAngle = (World.Geometry.FriendlyGoal - oppPosOnBallLine):absoluteAngleDiff(World.Ball.pos - oppPosOnBallLine)
		if volleyAngle < volleyAngleLimit and selfDistToBall + distDiffLimit > oppDistToBall then
			return false
		end
	end

	return true
end

function HandleBall:_checkDuel()
	-- don't if we are not close to the ball
	local ballDistLimit = self._taskDecision == "duel" and 1.2 or 0.8
	if self._robot.pos:distanceTo(World.Ball.pos) > ballDistLimit then
		return false
	end

	return true
end

function HandleBall:check()
	if Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState()
			or Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) then
		return false
	end

	local mainAttacker = self._inbox.mainAttacker().trainer

	if self:_checkDefender() then
		self._taskDecision = "forcedefender"
	elseif self:_checkAttacker() then
		self._taskDecision = "attacker"
	elseif self:_checkInterceptPass() then
		self._taskDecision = "interceptpass"
	elseif self:_checkDuel() then
		self._taskDecision = "duel"
	else
		self._taskDecision = "defender"
	end

	debug.set("HandleBall", self._taskDecision)

	if not self._taskDecision == "forcedefender" then
		if mainAttacker == self._robot
				or self._taskDecision == "attacker"
				or self._taskDecision == "interceptpass"
				or self._taskDecision == "duel" then
			self:_applyForMainAttacker()
		end
	end

	return mainAttacker == self._robot
end

function HandleBall:_updateTask()
	if self._taskDecision == "attacker" then
		self._send.poolChangeRequest("trainer")
	end
	
	if self._taskDecision == "interceptpass" then
		return InterceptPass
	else
		return Duel
	end
end

return HandleBall