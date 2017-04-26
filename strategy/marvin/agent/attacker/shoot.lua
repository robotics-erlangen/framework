local Base = require "agent/base/behavior"
local Shoot = Class("Agent.Attacker.Shoot", Base)

local debug = require "../base/debug"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"

local Attack = require "util/attack"
local ShootGoalUtil = require "util/shootgoal"


function Shoot:_stop()
	self._nextDecisionTime = World.Time
	self._decision = { task = "none" }

	self._prevPassPos = nil

	self._attackPosition = nil
	self._prevAttackPosition = nil

	self._activeFrames = 0
end

function Shoot:check()
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_shootGoalPossible()
	local sg_target, _, sg_dirty = ShootGoalUtil.updateTarget(self._robot, nil, false, self._attackPosition)

	if sg_dirty then
		return false
	end

	if World.Ball.speed:length() > 1.2 then
		return ObserverShoot.volleyPossible(self._robot, sg_target)
	end

	return true
end

function Shoot:_decide()
	-- perform clean goal shots if possible
	if self:_shootGoalPossible() then
		return {
			task = "shootgoal",
			pos = World.Geometry.OpponentGoal,
			quality = "clean"
		}
	end

	local pass = Attack.choosePassFromSuggestions(self._robot,
		self._inbox.passSuggestion(), self._prevPassPos, true)
	if pass then
		return {
			task = "pass",
			target = pass.target,
			pos = pass.ballPos,
			time = pass.time,
			quality = "clean"
		}
	end

	-- fallback to shoot goal
	return {
		task = "shootgoal",
		pos = World.Geometry.OpponentGoal,
		quality = "fallback"
	}
end

function Shoot:_redeciding()
	-- always redecide if no decision has been made yet
	if self._activeFrames < 2 or self._decision.task == "none" then
		debug.set("redeciding", "TRUE (initial)")
		return true
	end

	-- never redecide if the ball is imminent
	local dribblerPos = self._robot.pos + (World.Ball.pos - self._robot.pos):setLength(
		World.Ball.radius + self._robot.shootRadius)
	if Ball.receivesPass(self._robot) and Physics.checkedBallRollTime(World.Ball, dribblerPos) < 0.5 then
		debug.set("redeciding", "FALSE (imminent)")
		return false
	end

	-- never redecide if the ball is being shot (but isShot did not trigger yet)
	if Robot.hadBall(self._robot, 0.25) then
		debug.set("redeciding", "FALSE (hadBall)")
		return false
	end

	-- redecide if the ball is still accelerating due to the tracking
	if Ball.isAccelerating() then
		debug.set("redeciding", "TRUE (accelerating)")
		return true
	end

	-- redecide if the attackPosition changed a lot
	if self._attackPosition and self._prevAttackPosition
			and self._attackPosition:distanceTo(self._prevAttackPosition) > 0.3 then
		debug.set("redeciding", "TRUE (attackPosition)")
		return true
	end

	-- redecide if the last decision was the fallback one
	if self._decision.quality == "fallback" then
		debug.set("redeciding", "TRUE (fallback)")
		return true
	end

	-- redecide if after a certain time
	if World.Time >= self._nextDecisionTime then
		debug.set("redeciding", "TRUE (nextDecisionTime)")
		return true
	end

	debug.set("redeciding", "FALSE (default)")
	return false
end

function Shoot:_updateTask()
	self._forceKeepingInPool = true
	self._activeFrames = self._activeFrames + 1

	-- update attack position
	self._prevAttackPosition = self._attackPosition
	local _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	self._attackPosition = attackPosition

	-- redecide if necessary
	local redeciding = self:_redeciding()
	if redeciding then
		self._decision = self:_decide()
		self._nextDecisionTime = World.Time + 1.5
	end

	-- visualize decision
	if self._decision.pos then
		Attack.visualizeAttack(self._robot.pos, self._decision.pos)
	end

	-- write decision to debug tree
	debug.set("decision", self._decision.task)
	for k, v in pairs(self._decision) do
		if k ~= "task" then
			debug.set("decision/" .. tostring(k), tostring(v))
		end
	end

	-- return shoot goal if the decision sais so
	if self._decision.task == "shootgoal" then
		return ShootGoal
	end

	-- time the pass
	if self._decision.task == "pass" then
		local suggestedTime = self._decision.time
		local target = self._decision.target
		local ballPos = self._decision.pos

		-- update target if the decision changed
		-- creating a new task instance would mess up catchBall
		if self._task and Class.instanceOf(self._task, Pass)
				and self._decision.pos ~= self._prevPassPos then
			self._task:updateTarget(self._decision.target, self._decision.pos)
		end
		self._prevPassPos = self._decision.pos

		local minShootTime = Robot.minShootTime(self._robot, ballPos)
		local shootPos = Physics.ballAtTime(World.Ball, minShootTime).pos
		local ballTravelTime = ObserverShoot.ballPassTime(shootPos, ballPos, target)
		local passReceiveTime = math.max(suggestedTime, minShootTime + ballTravelTime + World.Time)

		self._send.passInfo("all", { target = target,
			ballPos = ballPos, time = passReceiveTime })

		return Pass, { target, ballPos }
	end

	-- error: invalid decision
end

return Shoot
