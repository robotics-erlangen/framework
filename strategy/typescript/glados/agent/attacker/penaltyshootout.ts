local Base = require "agent/base/behavior"
local PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

local Goal = require "observer/goal"
local Robot = require "observer/robot"
local MoveToStaticBall = require "task/attacker/movetostaticball"
local ShootGoal = require "task/attacker/shootgoal"
local StopAttack = require "task/attacker/stopattack"
local MoveToBall = require "task/attacker/movetoball"
local Dribble = require "task/attacker/dribble"
local Pass = require "task/shared/pass"
local Field = require "../base/field"

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
	self._baseDribblePos = Vector(0, G.FieldHeightHalf)
	self._addPos = Vector(0, 0)
	self._state = nil
	self._futureKeeper = {pos = World.Geometry.OpponentGoal, speed = Vector(0,0.1), radius = 0.09}
	self._lastKeeper = {pos = World.Geometry.OpponentGoal, speed = Vector(0,0.1), radius = 0.09}
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
	elseif self._contactPoint and World.Ball.pos:distanceTo(self._robot.pos) > DRIBBLING_DISTANCE + self._robot.radius + World.Ball.radius then
		-- log("2")
		self._contactPoint = nil
		self._changeContact = true
	else
		self._changeContact = false
	end
end

function PenaltyShootout:_updateShootGoal()
	if World.OpponentKeeper and World.OpponentKeeper.pos then
		self._futureKeeper = {pos = World.OpponentKeeper.pos, radius = World.OpponentKeeper.radius}
	end
	local lastContact = self._contactPoint
	local addDistance = lastContact and math.max(0, lastContact:distanceTo(World.Ball.pos) - 0.5)*3 or 0.2
		self._futureKeeper.pos = self._futureKeeper.pos + self._lastKeeper.speed * 0.4
	if self._state == "pass" then
		self._futureKeeper.pos = self._futureKeeper.pos + (self._robot.pos - self._futureKeeper.pos):setLength(self._robot.speed:length()/3)
	end

	debug.push("Shootgoal Criterias")
	if self._penaltyStartTime then
		local timeSinceStart = World.Time - self._penaltyStartTime
		local criteriaTime = timeSinceStart > 8
		debug.push("Time Criteria (8s)", criteriaTime)
		debug.set("timeSinceStart", timeSinceStart)
		debug.pop()

		local ballPosY = World.Ball.pos.y
		local distanceToGoalLine = (World.RULEVERSION == "2017" and G.DefenseRadius or G.DefenseHeight) + DISTANCE_TO_DEFENSE_AREA
		local criticalMark = G.FieldHeightHalf - distanceToGoalLine
		local criteriaPos = ballPosY + addDistance > criticalMark
		debug.push("Position Criteria", criteriaPos)
		debug.set("ballPosY", ballPosY)
		debug.set("addDistance", addDistance)
		debug.set("DistanceToGoalLine", distanceToGoalLine)
		debug.set("CriticalMark", criticalMark)
		debug.pop()
		vis.addCircle("a/a/penaltyshootout: futureKeeper", self._futureKeeper.pos, 0.1, vis.colors.green, false)

		local sector = Goal.largestFreeSector(World.Ball.pos, {self._futureKeeper}, true)
		local width = sector and math.abs(sector[1] - sector[2]) or 0
		local angle = 2 * math.atan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y))
		local criteriaAngle = width < angle * MIN_RELATIVE_SECTOR_SIZE
		debug.push("Angle Criteria", criteriaAngle)
		debug.set("width", width*180/math.pi)
		debug.set("minRelativeSectorSize", MIN_RELATIVE_SECTOR_SIZE)
		debug.set("maxAngleForPosition(in deg)", 180/math.pi * angle)
		debug.pop()
		if self._shootGoalFlag or criteriaTime or criteriaPos or criteriaAngle then
			self._shootGoalFlag = true
		end
	else
		debug.push("Time Criteria (8s)")
		debug.set("time", "not set yet")
		debug.pop()
	end
	debug.pop()
end

function PenaltyShootout:_updateTask()
	local lastContact = self._contactPoint
	local robotPos = self._robot.pos
	local freeway = self._state == "pass" and 0.1 or 0
	local keeperPos
	if World.OpponentKeeper and World.OpponentKeeper.pos then
		self._lastKeeper = World.OpponentKeeper
	end
	keeperPos = self._lastKeeper.pos

	self:_updateDribbling()
	self:_updateShootGoal()
	debug.set("ShootGoalFlag", self._shootGoalFlag)
	--log(self._shootGoalFlag)
	if lastContact then
		vis.addCircle("1test", lastContact, 1, vis.colors.green, false)
	end

	if World.RefereeState == "PenaltyOffensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end

	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	elseif self._shootGoalFlag then
		return ShootGoal--, nil, true
	elseif lastContact and lastContact:distanceTo(World.Ball.pos) > 1 + 0.3 then
		return ShootGoal
	elseif not lastContact or robotPos:distanceTo(World.Ball.pos) > self._robot.radius + World.Ball.radius + freeway then
		return MoveToBall, {0.01}
	elseif lastContact and lastContact:distanceTo(World.Ball.pos) > 1 - 0.05 then
		return StopAttack
	elseif lastContact and lastContact:distanceTo(World.Ball.pos) > 1 - 0.3 then
		--log("distance: "..lastContact:distanceTo(robotPos))
		local shootlength = (0.1 + self._robot.speed:length())
		if self._lastKeeper.speed.y > 0.5 and self._robot.pos.y > 2 then
			return Pass, {nil, World.Ball.pos + Vector(0.4, 0.5), false, nil, nil, shootlength*0.6}
		else
			local shootpos = Vector(0, shootlength/3 + 0.2) * 0.6 + World.Ball.speed/3 * 0.4
			self._state = "pass"
			return Pass, {nil, World.Ball.pos + shootpos, false, nil, nil, shootlength}, true
		end
	elseif lastContact and lastContact:distanceTo(World.Ball.pos) > 1 - 0.35 then
		return MoveToBall, {0.00}
	else
		self._state = "dribble"
		-- self._robot:setDribblerSpeed(0.5)
		-- return MoveToBall, {-0.1}, self._changeContact
		local rate = 0.02 * robotPos:distanceTo(keeperPos)
		-- if lastContact:distanceTo(World.Ball.pos) < 1 - 0.2 then
			if keeperPos.x < 0 then
				self._addPos.x = (self._addPos.x + rate) / (1+math.abs(robotPos.x - keeperPos.x))
			else
				self._addPos.x = (self._addPos.x - rate) / (1+math.abs(robotPos.x - keeperPos.x))
			end
		-- else
		-- 	self._addPos.x = 0
		-- end
		local dribblePoint = self._baseDribblePos + self._addPos
		local intersection = Field.intersectRayDefenseArea(dribblePoint, robotPos - dribblePoint, 0.2, false)
		if intersection then
			dribblePoint = intersection
		end
		return Dribble, {dribblePoint}, true
	end
end

return PenaltyShootout
