local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Robot = require "observer/robot"
local Physics = require "observer/physics"
local DefUtil = require "util/defense"
local Duel = require "task/duel"
local InterceptPass = require "task/interceptpass"
local debug = require "../base/debug"


function HandleBall:_stop()
	self._timeAdvance = -math.huge
	self._mainAttackerApplicationSent = false
end

function HandleBall:check()
	if Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState()
			or Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) then
		return false
	end

	local mainAttacker = self._inbox.mainAttacker().trainer
	local role = self._inbox.roleAssignment().trainer
	local closestOppAtBall = DefUtil.getClosestRobot(World.OpponentRobots, World.Ball.pos)
	local forceDuel = role and role.name == "ManMark" and role.params == closestOppAtBall and
		mainAttacker and Physics.robotTimeToBall(mainAttacker, World.Ball, closestOppAtBall.pos, 0) >
		Physics.robotTimeToBall(self._robot, World.Ball, closestOppAtBall.pos, 0)
	debug.set("force duel", forceDuel)

	local selfTime = Robot.minTimeToBall(self._robot)
	local _, opponentTime = Robot.fastestOpponentAtBall()
	self._timeAdvance = opponentTime - selfTime
	debug.set("timeAdvance (HandleBall)", self._timeAdvance)

	if mainAttacker == self._robot
			or (self._mainAttackerApplicationSent and self._timeAdvance > 0)
			or (not self._mainAttackerApplicationSent and self._timeAdvance > 0.2)
			or forceDuel then
		self:_applyForMainAttacker()
		self._mainAttackerApplicationSent = true
	else
		self._mainAttackerApplicationSent = false
	end

	return mainAttacker == self._robot
end

function HandleBall:_updateTask()
	if self._timeAdvance > 0.5 then
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
		self._forceKeepingInPool = false
	end

	if self._timeAdvance > 0 and World.Ball.speed:length() > 1.5
			and not DefUtil.dangerousBallTowardsDefense() then
		return InterceptPass
	else
		return Duel
	end
end

return HandleBall
