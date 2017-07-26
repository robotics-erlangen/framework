local Base = require "agent/base/behavior"
local PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

local Goal = require "observer/goal"
local Robot = require "observer/robot"
local MoveToStaticBall = require "task/movetostaticball"
local ShootPenalty = require "task/shootpenalty"
local StopAttack = require "task/stopattack"
local ShootGoal = require "task/shootgoal"

local Dribble = require "task/dribble"


local DISTANCE_TO_DEFENSE_AREA = 0.40 -- the furthest we'll go before we shoot
local MAX_DIST_PER_DEGREE = 0.05


function PenaltyShootout:_stop()
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
end

function PenaltyShootout:_start()
	self._penaltyStartTime = World.Time
end

function PenaltyShootout:check()
	local mainAttacker = self._inbox.mainAttacker().trainer == self._robot
	local isPenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	local isShootout = World.GameStage == "PenaltyShootout"
	log(tostring(mainAttacker)..", "..tostring(isPenalty)..", "..tostring(isShootout)..", "..tostring(self:_checkPenaltyOngoing()))
	return false and mainAttacker and isShootout and (isPenalty or self:_checkPenaltyOngoing())
end

function PenaltyShootout:_checkPenaltyOngoing()
	return self._penaltyStartTime and World.Time - self._penaltyStartTime < 15 and Referee.lastStateChangeTime == self._penaltyStartTime
end

function PenaltyShootout:_updateDribbling()
	if not self._contactPoint and Robot.hadBall(self._robot, 0) then
		self._contactPoint = self._robot.pos
	elseif self._contactPoint and not Robot.hadBall(self._robot, 0) then
		self._contactPoint = nil
	end
end

function PenaltyShootout:_updateShootGoal()
	local sector = Goal.largestFreeSector(World.Ball.pos, World.Robots, true)
	local width = sector and math.abs(sector[1] - sector[2]) or 0
	if self._shootGoalFlag
			or (self._penltyStartTime and World.Time - self._penaltyStartTime > 8)
			or G.FieldHeightHalf - World.Ball.pos.y > width * MAX_DIST_PER_DEGREE
			or World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
		self._shootGoalFlag = true
	end
end

function PenaltyShootout:_updateTask()
	self:_updateDribbling()
	self:_updateShootGoal()
	local annoyingKeeper = World.OpponentKeeper and World.OpponentKeeper.pos.y < G.FieldHeightHalf - 0.3 or false
	if self._contactPoint and self._contactPoint:distanceTo(self._robot.pos) > 1 then
		return StopAttack
	elseif self._shootGoalFlag then
		return ShootGoal
	end
	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	elseif self._shootGoalFlag then
		return ShootGoal
	elseif self._contactPoint and self._contactPoint:distanceTo(self._robot.pos) > 1 then
		return StopAttack
	elseif not annoyingKeeper and World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
		return ShootPenalty
	else
		return Dribble, {Vector(0, G.FieldHeightHalf - G.DefenseRadius - 0.2)}
	end
end

return PenaltyShootout
