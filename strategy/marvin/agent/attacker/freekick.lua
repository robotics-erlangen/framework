local Base = require "agent/base/behavior"
local FreeKick = Class("Agent.Attacker.FreeKick", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"

local MoveToStaticBall = require "task/movetostaticball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Attack = require "util/attack"
local ShootGoalUtil = require "util/shootgoal"


function FreeKick:_stop()
	self._startTime = 0
	self._state = "prepare"
	self._dirty = false
	self._passList = nil
	self._pass = nil
	self._waitStartTime = nil
	self._redeciding = false
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

	local _; _, _, self._dirty = ShootGoalUtil.updateTarget(self._robot, nil, self._dirty, World.Ball.pos)
	local shootgoalPossible = not self._dirty and
		(World.RefereeState == "DirectOffensive" or World.RefereeState == "KickoffOffensive")

	-- prepare -> wait
	if self._state == "prepare" and nearBall then
		self._state = "wait"
		self._waitStartTime = World.Time
	end

	-- wait -> shootgoal
	-- wait -> pass_prepare
	local MIN_WAIT_TIME = 1.5
	local MAX_TIMEFRAME = 8
	local timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME
	if self._state == "wait" then
		if shootgoalPossible then
			self._state = "shootgoal"
			self._passList = nil
		elseif timeRunningOut and Referee.isFriendlyFreeKickState() then
			self._state = "shootgoal"
		elseif World.Time - self._waitStartTime > MIN_WAIT_TIME then
			self._passList = Attack.sortPassesFromSuggestions(self._robot, self._inbox.passSuggestion(), nil, false)
			if self._passList then
				local _; _, self._pass = next(self._passList)
				if self._pass then
					self._state = "pass_prepare"
					-- make sure that timing is not an issue for the strikers
					self._pass.time = self._pass.time + 1.5
				end
			end
		end
	end

	--check for anonymous pass
	local restartTask = self._redeciding
	if self._state == "pass_prepare" or self._state == "pass" then
		if not self._pass.target then
			-- try to find the target
			-- look for a suggestion that matches our pass
			local passes = Attack.sortPassesFromSuggestions(self._robot, self._inbox.passSuggestion(), nil, false, 0)
			if passes then
				for _,pass in ipairs(passes) do
					if pass.target and pass.ballPos:distanceTo(self._pass.ballPos) < 0.1 then
						self._pass.target = pass.target
						if self._state == "pass" then
							restartTask = true
						end
					end
				end
			end
		end
	end

	if (self._state == "pass_prepare" or self._state == "pass" and self._pass.time - World.Time > 0.5) and not timeRunningOut then
		local suggestion = self._inbox.passSuggestion()[self._pass.target]
		if suggestion and suggestion.ballPos:distanceTo(self._pass.ballPos) < 0.01 then
			local bufferTime = 0.1
			if suggestion.time - self._pass.time > bufferTime * 0.5 then
				self._pass.time = suggestion.time + bufferTime
				restartTask = true
			end
		end
	end

	if self._state == "pass" and timeRunningOut then
		self._state = "wait"
	end

	-- pass_prepare -> pass
	if self._state == "pass_prepare" then
		local shootPos = self._pass.ballPos
		local ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, self._pass.target, nil, self._robot)
		local extraTime = math.abs(self._robot.dir - (shootPos - self._robot.pos):angle()) / math.pi * 1.3 + 0.2
		local robotTime = Robot.minShootTime(self._robot, shootPos) + extraTime
		if World.Time + robotTime + ballTime >= self._pass.time then
			self._state = "pass"
		end

		-- redecide if beneficial
		local enoughTime = World.Time - Referee.lastStateChangeTime() <= 5
		if enoughTime then
			local hysteresis = 0.05
			local newPass = Attack.choosePassFromSuggestions(self._robot, self._inbox.passSuggestion(),
					self._pass.ballPos, false, hysteresis)
			if newPass and newPass.ballPos:distanceTo(self._pass.ballPos) > 0.2 then
				self._state = "wait" -- wait state will deal with setting up a new pass
			end
		end
	end

	if self._passList and self._state == "pass" then
		self._send.passInfo("all", {self._pass})
	elseif self._passList then
		self._send.passInfo("all", self._passList)
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
		debug.push("pass", self._pass.target and self._pass.target.id or "anonymous")
		debug.set("ballPos", self._pass.ballPos)
		debug.set("time (rel)", self._pass.time - World.Time)
		debug.set("time (abs)", self._pass.time)
		debug.pop()
	else
		debug.set("pass", nil)
	end

	local PASS_TIMEFRAME = 4
	if self._state == "prepare" then
		self._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { math.pi / 2, distanceToBall }, stateChanged
	elseif self._state == "shootgoal" then
		return ShootGoal
	elseif self._state == "wait" or self._state == "pass_prepare" then
		self._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { math.pi / 2 }, stateChanged
	elseif self._state == "pass" then
		return Pass, { self._pass.target, self._pass.ballPos, self._pass.chip, World.Ball.pos, self._pass.time }, restartTask
	end
end

return FreeKick
