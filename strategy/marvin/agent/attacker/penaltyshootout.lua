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
local Pass = require "task/attacker/penaltyshootout"
local Chip = require "task/attacker/penaltychip"
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
	self._ball = {pos = World.Ball.pos, speed = World.Ball.speed, radius = World.Ball.radius, time = World.Time}
	self._dribblePos = nil
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
	if World.OpponentKeeper and World.OpponentKeeper.pos then
		self._futureKeeper = {pos = World.OpponentKeeper.pos, radius = World.OpponentKeeper.radius}
	end
	local lastContact = self._contactPoint
	local addDistance = lastContact and math.max(0, lastContact:distanceTo(World.Ball.pos) - 0.5)*3 or 0.2
		self._futureKeeper.pos = self._futureKeeper.pos + self._lastKeeper.speed * 0.4
	if self._state == "pass" then
		self._futureKeeper.pos = self._futureKeeper.pos + (self._robot.pos - self._futureKeeper.pos):setLength(self._robot.speed:length()/3 + addDistance/4)
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
		if self._shootGoalFlag or criteriaTime or criteriaTime or criteriaAngle then
			self._shootGoalFlag = true
		end
	else
		debug.push("Time Criteria (8s)")
		debug.set("time", "not set yet")
		debug.pop()
	end
	debug.pop()
end

--- Calculates the effective distance between ball and dribbler
-- find an ellipsis with the left and right dribbler edge points as focal points
-- dist is the length of the semi-minor axis
-- @param robot robot - the robot to calculate
-- @param ballPos vector - position of the ball
local function ellipticDistance(robot, ballPos)
	local dribblerPos = robot.pos + Vector.fromAngle(robot.dir):scaleLength(robot.shootRadius)
	local dribblerWidthHalf = Vector.fromAngle(robot.dir - math.pi/2):scaleLength(robot.dribblerWidth/2)
	local leftDribblerEdge = dribblerPos + dribblerWidthHalf
	local rightDribblerEdge = dribblerPos - dribblerWidthHalf
	return 0.5*math.sqrt((leftDribblerEdge:distanceTo(ballPos) + rightDribblerEdge:distanceTo(ballPos))^2 - robot.dribblerWidth*robot.dribblerWidth)
end
function PenaltyShootout:_updateBall()
	if self._ball == nil then
		self._ball = {pos = World.Ball.pos, speed = World.Ball.speed, radius = World.Ball.radius, time = World.Time}
	end
	local minDistance = self._robot.radius + self._ball.radius - 0.01
	local ballPos = self._ball.pos
	local robotPos = self._robot.pos
	local t_now = World.Time
	if World.Ball:isPositionValid() then
		if robotPos:distanceToSq(World.Ball.pos) < minDistance * minDistance then
			if ellipticDistance(self._robot, self._ball.pos) < self._ball.radius + 0.01 then
				local dribblerPos = robotPos + Vector.fromAngle(self._robot.dir):scaleLength(self._robot.shootRadius)
				local a = 0.9
				ballPos = ballPos * a + dribblerPos * (1-a)
			end
			local alpha = 0.8
			local relSpeed = self._ball.speed - self._robot.speed
			local reflect = relSpeed + (ballPos - robotPos) * (ballPos - robotPos):dot(relSpeed)/robotPos:distanceToSq(ballPos) * -2
			self._ball.speed = self._robot.speed * alpha + reflect * (1-alpha)
			self._ball.pos = self._ball.speed * (t_now - self._ball.time) + ballPos
			self._ball.time = t_now
		else
			self._ball.pos = World.Ball.pos
			self._ball.speed = World.Ball.speed
			self._ball.time = t_now
		end
	else
		self._ball.pos = (t_now - self._ball.Time)*self._ball.speed + ballPos
		self._ball.time = t_now
	end
	vis.addCircle("a/a/penalty: ball",self._ball.pos, 0.05, vis.colors.orchid, true)
end

function PenaltyShootout:_updateTask()
	if World.OpponentKeeper and World.OpponentKeeper.pos then
		self._lastKeeper = World.OpponentKeeper
	end
	self:_updateBall()
	self:_updateDribbling()
	self:_updateShootGoal()
	debug.set("ShootGoalFlag", self._shootGoalFlag)
	local keeperPos = self._lastKeeper.pos
	local lastContact = self._contactPoint
	local robotPos = self._robot.pos
	local freeway = self._state == "pass" and 0.1 or 0
	local distanceToContact
	if lastContact then
		vis.addCircle("1test", lastContact, 1, vis.colors.green, false)
		distanceToContact = lastContact:distanceTo(self._ball.pos)
	else
		distanceToContact = 0
	end

	if World.RefereeState == "PenaltyOffensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end
	local chipMode = Chip.check(self._ball, self._robot)
	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {math.pi / 2, 0.1}
	elseif chipMode then
		return Chip, {self._ball, chipMode}
	elseif self._shootGoalFlag then
		return ShootGoal--, nil, true
	elseif distanceToContact > 1 + 0.3 then
		return ShootGoal
	elseif not lastContact or robotPos:distanceTo(self._ball.pos) > self._robot.radius + World.Ball.radius + freeway then
		return MoveToBall, {0.01}
	elseif distanceToContact > 1 - 0.05 then
		return StopAttack
	elseif distanceToContact > 1 - 0.3 then
		self._state = "pass"
		return Pass, {self._ball}
	elseif distanceToContact > 1 - 0.35 then
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
		if self._dribblePos == nil then
			self._dribblePos = dribblePoint
		else
			self._dribblePos.x = dribblePoint.x
			self._dribblePos.y = dribblePoint.y
		end
		return Dribble, {self._dribblePos}--, true
		-- return Dribble, {dribblePoint}--, true
	end
end

return PenaltyShootout
