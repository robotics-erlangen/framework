local Base = require "agent/base/behavior"
local PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

--local Goal = require "observer/goal"
local Robot = require "observer/robot"
local MoveToStaticBall = require "task/movetostaticball"
--local ShootPenalty = require "task/shootpenalty"
local StopAttack = require "task/stopattack"
local ShootGoal = require "task/shootgoal"

local Dribble = require "task/dribble"


local DISTANCE_TO_DEFENSE_AREA = 0.40 -- the furthest we'll go before we shoot
--local SECTOR


function PenaltyShootout:_stop()
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
end

function PenaltyShootout:_start()
	self._penaltyStartTime = World.Time
end

function PenaltyShootout:check()
	return true
end

function PenaltyShootout:_checkPenaltyOngoing()
	if self._PenaltyStartTime and World.Time - self._penaltyStartTime < 10 and Referee.lastStateChangeTime == self._penaltyStartTime then
		return true
	end
	return true
end

function PenaltyShootout:_updateDribbling()
	if not self._contactPoint and Robot.hadBall(self._robot, 0) then
		self._contactPoint = self._robot.pos
	elseif self._contactPoint and not Robot.hadBall(self._robot, 0) then
		self._contactPoint = nil
	end
end

function PenaltyShootout:_updateShootGoal()
	if self._shootGoalFlag then
		return
	end
	if World.time - self._penaltyStartTime > 8 then
		self._shootGoalFlag = true
	end
	-- local sector = Goal.getLargestFreeSector(World.Ball.pos, World.Robots, true)
	--local width = math.abs(sector[1] - sector[2])
end

function PenaltyShootout:_updateTask()
	self:_updateDribbling()
	if self._contactPoint and self._contactPoint:distanceTo(self._robot.pos) > 1 then
		return StopAttack
	elseif self._shootGoalFlag then
		return ShootGoal
	end
	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	else
		local annoyingKeeper = World.OpponentKeeper.pos.y < G.FieldHeightHalf - 0.3
		if not annoyingKeeper and World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
			return ShootGoal
		elseif World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
			self._shootGoalFlag = true
			return ShootGoal
		else
			return Dribble, {Vector(0, G.FieldHeightHalf - G.DefenseRadius - 0.2)}
		end
	end
end

return PenaltyShootout
