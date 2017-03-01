local Base = require "agent/base/behavior"
local FreeKick = Class("Agent.Attacker.FreeKick", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local G = World.Geometry

local MoveToStaticBall = require "task/movetostaticball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Attack = require "util/attack"
local ShootGoalUtil = require "util/shootgoal"


function FreeKick:_stop()
	self._startTime = 0
	self._state = "prepare"
	self._dirty = false
	self._pass = nil
	self._waitStartTime = nil
end

function FreeKick:start()
	self._startTime = World.Time
end

function FreeKick:check()
	-- we have to be main attacker
	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	if Referee.isFriendlyFreeKickState() then
		self._forceKeepingInPool = true
		return true
	end

	-- stay active for one additional frame to avoid flickering to a different task
	-- rely on being killed by applyForMainAttacker
	if Robot.ownStandardShooter() == self._robot then
		return true
	end

	return false
end


function FreeKick:_updateTask()
	local prevState = self._state

	local distanceToBall = 0.15
	local nearBall = self._robot.pos:distanceTo(World.Ball.pos)
		< distanceToBall + self._robot.radius + World.Ball.radius + 0.02

	local _; _, _, self._dirty = ShootGoalUtil.updateTarget(self._robot, nil, self._dirty)
	local shootgoalPossible = not self._dirty and
		(World.RefereeState == "DirectOffensive" or World.RefereeState == "KickoffOffensive")

	-- prepare -> shootgoal
	-- prepare -> wait
	if self._state == "prepare" and nearBall then
		if shootgoalPossible then
			self._state = "shootgoal"
		else
			self._state = "wait"
			self._waitStartTime = World.Time
		end
	end

	-- wait -> shootgoal
	-- wait -> pass_prepare
	local MIN_PASS_WAIT_TIME = 2.5
	local MAX_TIMEFRAME = 8
	local timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME
	if self._state == "wait" then
		if shootgoalPossible then
			self._state = "shootgoal"
			self._pass = nil
		elseif timeRunningOut and Referee.isFriendlyFreeKickState() then
			self._state = "shootgoal"
		elseif World.Time - self._waitStartTime > MIN_PASS_WAIT_TIME then
			self._pass = Attack.choosePassFromSuggestions(self._robot,
				self._inbox.passSuggestion(), nil, false)
			if self._pass then
				self._state = "pass_prepare"
			end
		end
	end

	-- pass_prepare -> pass
	if self._state == "pass_prepare" then
		local shootPos = self._pass.ballPos + (G.OpponentGoal - self._pass.ballPos):setLength(
			self._pass.target.shootRadius + World.Ball.radius)
		local ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, self._pass.target)
		local robotTime = Robot.minShootTime(self._robot, shootPos)
		if World.Time + robotTime + ballTime >= self._pass.time then
			self._state = "pass"
		end
	end

	if self._pass then
		self._send.passInfo("all", self._pass)
	end

	-- visualize decision
	local visTarget
	if self._pass then
		visTarget = self._pass.ballPos
	elseif self._state == "shootgoal" then
		visTarget = World.Geometry.OpponentGoal
	end
	if visTarget then
		Attack.visualizeAttack(self._robot.pos, visTarget)
	end



	debug.set("state", self._state)
	local stateChanged = prevState == self._state

	if self._pass then
		debug.push("pass", self._pass.target.id)
		debug.set("ballPos", self._pass.ballPos)
		debug.set("time (rel)", self._pass.time - World.Time)
		debug.set("time (abs)", self._pass.time)
		debug.pop()
	else
		debug.set("pass", nil)
	end

	if self._state == "prepare" then
		return MoveToStaticBall, { math.pi / 2, distanceToBall }, stateChanged
	elseif self._state == "shootgoal" then
		return ShootGoal
	elseif self._state == "wait" or self._state == "pass_prepare" then
		return MoveToStaticBall, { - math.pi / 2 }, stateChanged
	elseif self._state == "pass" then
		return Pass, { self._pass.target, self._pass.ballPos }
	end
end

return FreeKick
