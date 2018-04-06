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
local Shoot = require "task/ability/shoot"
local MoveToBall = require "task/attacker/movetoball"
local geom = require "../base/geom"
local Dribble = require "task/attacker/dribble"
local Pass = require "task/shared/pass"

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
	self._changeContact = false
	self._baseDribblePos = Vector(0, G.FieldHeightHalf - G.DefenseHeight - 0.2)
	self._addPos = Vector(0, 0)
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
		self._changeContact = true
	elseif self._contactPoint and World.Ball.pos:distanceTo(self._robot.pos) > DRIBBLING_DISTANCE + self._robot.radius then
		-- log("2")
		self._contactPoint = nil
		self._changeContact = true
	else
		self._changeContact = false
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
	local lastContact = self._contactPoint
	self:_updateDribbling()
	self:_updateShootGoal()
	debug.set("ShootGoalFlag", self._shootGoalFlag)
	--log(self._shootGoalFlag)
	if self._contactPoint then
		vis.addCircle("1test", self._contactPoint, 1, vis.colors.green, false)
	end

	if World.RefereeState == "PenaltyOffensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end

	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	elseif self._shootGoalFlag then
		return ShootGoal, {nil, self._forceDesperate}
	elseif not self._contactPoint or self._robot.pos:distanceTo(World.Ball.pos) > self._robot.radius + World.Ball.radius then --math.abs(geom.getAngleDiff(self._robot.dir, (World.Ball.pos - self._robot.pos):angle())) > 30 * math.pi/180 then
		return MoveToBall, {0.01}
	elseif self._contactPoint and self._contactPoint:distanceTo(World.Ball.pos) > 1 - 0.2 then
		--log("distance: "..self._contactPoint:distanceTo(self._robot.pos))
		local shootlength = (0.1 + self._robot.speed:length())
		return Pass, {nil, World.Ball.pos + Vector(0, shootlength/3 + 0.2), false, nil, nil, shootlength}, true
	elseif self._contactPoint and self._contactPoint:distanceTo(World.Ball.pos) > 1 + 0.3 then
		return ShootGoal
	else
		-- self._robot:setDribblerSpeed(0.5)
		-- return MoveToBall, {-0.1}, self._changeContact
		local keeperPos = World.OpponentKeeper.pos
		local rate = 0.02 * self._robot.pos:distanceTo(keeperPos)
		-- if self._contactPoint:distanceTo(World.Ball.pos) < 1 - 0.2 then
			if keeperPos.x < 0 then
				self._addPos.x = (self._addPos.x + rate) / (1+math.abs(self._robot.pos.x - keeperPos.x))
			else
				self._addPos.x = (self._addPos.x - rate) / (1+math.abs(self._robot.pos.x - keeperPos.x))
			end
		-- else
		-- 	self._addPos.x = 0
		-- end
		return Dribble, {self._baseDribblePos + self._addPos}, true
	end
end

return PenaltyShootout
