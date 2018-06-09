local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Robot = require "observer/robot"
local Physics = require "observer/physics"
local DefUtil = require "util/defense"
local Duel = require "task/shared/duel"
local InterceptPass = require "task/defender/interceptpass"
local debug = require "../base/debug"

local G = World.Geometry


function HandleBall:_stop()
	self._taskDecision = nil
	self._forceDefenderFrameCounter = 0
end

function HandleBall:_checkDefender()
	-- stay defender if the ball is currently being shot at our goal
	if not DefUtil.dangerousBallTowardsDefense() and not Ball.isAccelerating() then
		self._forceDefenderFrameCounter = self._forceDefenderFrameCounter + 1
	else
		self._forceDefenderFrameCounter = 0
	end

	if self._forceDefenderFrameCounter < 5 then
		local assignment = self._inbox.roleAssignment().trainer
		if assignment and assignment.name == "CenterBack" then
			return true
		end
	end

	return false
end

function HandleBall:_checkAttacker()
	local isAttacker = self._taskDecision == "attacker"

	-- don't if we take too long to get the ball
	local timeDiff = isAttacker and 0.5 or 1.0
	local distanceFactor = isAttacker and 1 or 1.5
	local distanceOffset = isAttacker and 3 * self._robot.radius or 5* self._robot.radius
	local firstOpp, firstOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if firstOppTime < Robot.minTimeToBall(self._robot) + timeDiff then
		-- do if we are pretty close to our acceptPos
		local acceptPos = Physics.ballAtTime(World.Ball, Robot.minTimeToBall(self._robot)).pos
		local enemyPos = Physics.ballAtTime(World.Ball, firstOppTime).pos
		if self._robot.pos:distanceTo(acceptPos) * distanceFactor + distanceOffset > firstOpp.pos:distanceTo(enemyPos) then
			return false
		end
		if World.Ball.pos:distanceTo(acceptPos) + distanceOffset > World.Ball.pos:distanceTo(enemyPos) and not Ball.isSlowBall() then
			return false
		end
	end

	-- true if we are in opponentFieldHalf
	if self._robot.pos.y > G.FieldHeightHalf * 0.1  then
		return true
	end

	-- don't if an opponent is close to us
	local distToOppLimit = isAttacker and 0.3 or 0.5
	local _,closestOppDist = DefUtil.getClosestRobot(World.OpponentRobots, self._robot.pos)
	if closestOppDist < distToOppLimit then
		return false
	end

	-- don't if an opponent receives a pass
	for _,r in ipairs(World.OpponentRobots) do
		if Ball.receivesPass(r) and (r.pos:distanceTo(World.Ball.pos) < 1.0 or r.pos:distanceTo(self._robot.pos) < 1.0)then
			return false
		end
	end

	return true
end

function HandleBall:_checkInterceptPass()

	local isInterceptPass = self._taskDecision == "interceptpass"

	--TODO: don't if we want to intercept our own pass


	-- don't if the ball is too slow
	local ballSpeedLimit = isInterceptPass and 1.5 or 2.0
	if World.Ball.speed:length() < ballSpeedLimit then
		return false
	end

	-- don't intercept chip kicks
	if Ball.isFlyingOrBouncing() then
		return false
	end

	local moveDest, moveTime = InterceptPass.calculateInterceptPos(self._robot)
	if not moveDest then
		return false
	end

	-- don't if the time to intercept the pass is too high
	local interceptionTimeLimit = isInterceptPass and 1.5 or 1.0
	if moveTime > interceptionTimeLimit then
		return false
	end

	vis.addCircle("InterceptPassPos", moveDest, 0.05, vis.colors.cyan, true)
	vis.addPath("InterceptPassPos", {self._robot.pos, moveDest}, vis.colors.cyan)
	debug.set("moveTime", moveTime)

	-- don't intercept if there is no pass receiver
	local _, _, _, receivers = Goal.predictShot()
	if not receivers or #receivers == 0 then
		return false
	end

	-- don't intercept if it might have been kicked by our goalie
	local defenseIntersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector(1, 0),
				World.Ball.pos, -World.Ball.speed)
	local defenseWidthHalf = Field.defenseBaselineIntersectionDistance() + 0.2
	if defenseIntersection and math.abs(defenseIntersection.x) < defenseWidthHalf then
		return false
	end

	return true
end

function HandleBall:_checkDuel()
	-- don't if we are not close to the ball
	local ballDistLimit = self._taskDecision == "duel" and 1.2 or 0.8
	if self._robot.pos:distanceTo(World.Ball.pos) > ballDistLimit then
		return false
	end

	-- don't if the ball is moving horizontally (e.g. for a pass)
	if math.abs(World.Ball.speed.x) > 2 then
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
	elseif self:_checkInterceptPass() then
		self._taskDecision = "interceptpass"
	elseif self:_checkAttacker() then
		self._taskDecision = "attacker"
	elseif self:_checkDuel() then
		self._taskDecision = "duel"
	else
		self._taskDecision = "defender"
	end

	debug.set("HandleBall", self._taskDecision)

	if self._taskDecision ~= "forcedefender" then
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
	local selfDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	if selfDefenseDist < DefUtil.centerBackDistanceToDefenseArea() + self._robot.radius + 0.03 then
		local groupApplication = { name = "centerback", payload = self._robot }
		self._send.groupApplication("trainer", groupApplication)
	end

	if self._taskDecision == "attacker" or self._taskDecision == "interceptpass" then
		self._send.poolChangeRequest("trainer", "attacker")
	end

	if self._taskDecision == "interceptpass" then
		return InterceptPass
	else
		return Duel
	end
end

return HandleBall
