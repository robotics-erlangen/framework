local Base = require "agent/base/behavior"
local PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

local Goal = require "observer/goal"
local Robot = require "observer/robot"
local MoveToStaticBall = require "task/attacker/movetostaticball"
local StopAttack = require "task/attacker/stopattack"
local ShootGoal = require "task/attacker/shootgoal"

local Dribble = require "task/attacker/dribble"

local vis = require "../base/vis"
local debug = require "../base/debug"


local DISTANCE_TO_DEFENSE_AREA = 0.6 -- the furthest we'll go before we shoot
local MIN_RELATIVE_SECTOR_SIZE = 1/3
local DRIBBLING_DISTANCE = 0.075 -- Ball and Robot must be at least this far apart to reset dribbling


function PenaltyShootout:_stop()
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
end

function PenaltyShootout:check()
	local mainAttacker = self._inbox.mainAttacker().trainer == self._robot
	local isPenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	local isShootout = World.GameStage == "PenaltyShootout"
	-- log("")
	-- log("check")
	-- log("mainAttacker: "..tostring(mainAttacker))
	-- log("isPenalty: "..tostring(isPenalty))
	-- log("isShootout: "..tostring(isShootout))
	-- log("onGoing: "..tostring(self:_checkPenaltyOngoing()))
	return mainAttacker and isShootout and (isPenalty or self:_checkPenaltyOngoing())
end

function PenaltyShootout:_checkPenaltyOngoing()
	return self._penaltyStartTime and World.Time - self._penaltyStartTime < 15 and not Referee.isStopState()
end

function PenaltyShootout:_updateDribbling()
	-- log("update")
	if not self._contactPoint and Robot.hadBall(self._robot, 0) then
		-- log("1")
		self._contactPoint = self._robot.pos
	elseif self._contactPoint and World.Ball.pos:distanceTo(self._robot.pos) > DRIBBLING_DISTANCE + self._robot.radius then
		-- log("2")
		self._contactPoint = nil
	end
end

function PenaltyShootout:_updateShootGoal()
	local sector = Goal.largestFreeSector(World.Ball.pos, {World.OpponentKeeper}, true)
	local width = sector and math.abs(sector[1] - sector[2]) or 0

	debug.push("Shootgoal Criterias")
	debug.push("Time Criteria")
	debug.set("penaltyStartTime", self._penaltyStartTime)
	if self._penaltyStartTime then
		debug.set("timeSinceStart", World.Time - self._penaltyStartTime)
		debug.set("criteriaMet", World.Time -self._penaltyStartTime > 8)
	else
		debug.set("time", "not set yet")
		debug.set("criteriaMet", false)
	end
	debug.pop()
	debug.push("Position Criteria")
	debug.set("ballPosY", World.Ball.pos.y)
	debug.set("DistanceToGoalLine", G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA)
	debug.set("CriticalMark", G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA)
	debug.set("CriteriaMet", World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA)
	debug.pop()
	debug.push("Angle Criteria")
	debug.set("width", width*180)
	debug.set("minRelativeSectorSize", MIN_RELATIVE_SECTOR_SIZE)
	debug.set("maxAngleForPosition(in deg)", 180 * 2 * math.tan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y)))
	debug.set("CriteriaMet", width < 2 * math.tan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y)) * MIN_RELATIVE_SECTOR_SIZE)
	debug.pop()
	debug.pop()


	-- if (self._penltyStartTime and World.Time - self._penaltyStartTime > 8) then
	-- 	log("2")
	-- elseif World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
	-- 	log("3")
	-- elseif width < 2 * math.tan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y)) * MIN_RELATIVE_SECTOR_SIZE then
	-- 	log("4")
	-- 	log("width = "..tostring(width * 180))
	-- 	log("sector = "..tostring(sector))
	-- 	log("threshold = "..tostring(2 * math.tan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y)) * MIN_RELATIVE_SECTOR_SIZE) * 180)
	-- end

	if self._penaltyStartTime then
		if self._shootGoalFlag
				or (self._penaltyStartTime and World.Time - self._penaltyStartTime > 8)
				or World.Ball.pos.y > G.FieldHeightHalf - G.DefenseRadius - DISTANCE_TO_DEFENSE_AREA then
			self._shootGoalFlag = true
		end
		if width < 2 * math.atan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y)) * MIN_RELATIVE_SECTOR_SIZE then
			self._shootGoalFlag = true
			self._forceDesperate = true
		end
	end
end

function PenaltyShootout:_updateTask()
	self:_updateDribbling()
	self:_updateShootGoal()
	debug.set("ShootGoalFlag", self._shootGoalFlag)
	--log(self._shootGoalFlag)
	if self._contactPoint then
		vis.addCircle("1test", self._contactPoint, 0.05, vis.colors.green, true)
	end

	if World.RefereeState == "PenaltyOffensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end

	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	elseif self._shootGoalFlag then
		return ShootGoal, {nil, self._forceDesperate}
	elseif self._contactPoint and self._contactPoint:distanceTo(World.Ball.pos) > 1 then
		--log("distance: "..self._contactPoint:distanceTo(self._robot.pos))
		return StopAttack
	else
		return Dribble, {Vector(0, G.FieldHeightHalf - G.DefenseRadius - 0.2)}
	end
end

return PenaltyShootout
