local BallCycle = Class("Group.Move.BallCycle", require "group/move/base")

local Circuit = require "task/circuit"
local Field = require "../base/field"
local FreeKick = require "agent/attacker/freekick"
local geom = require "../base/geom"
local MoveToPos = require "task/movetopos"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local G = World.Geometry

BallCycle.N_ROBOTS = 5

local MAX_RANDOM_POSITION_OFFSET = 0.8

function BallCycle.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop" and Field.distanceToFieldBorder(World.Ball.pos) >= 0.6
end

-- biased random for setting the position backwards
local function randomExtension(min)
	return math.round(min + MAX_RANDOM_POSITION_OFFSET * math.pow(math.random(), 5), 1)
end

-- calculates good recieving possions for our attackers
local function getRandomPosition(positions)
	local extraDistForRobotToShoot = 0.08
	-- calculate circle for volley passes
	local center1, center2, radius = geom.inscribedAngle(World.Ball.pos, G.OpponentGoal,  (5 * math.pi) / 18)
	local circle = center1.y < center2.y and center1 or center2
	local angle = World.Ball.pos.x < 0 and math.pi / 4 or  - math.pi / 4
	-- position close to current ball pos
	local firstPointNearBall = circle + ((World.Ball.pos - circle):rotate(angle)):setLength(randomExtension(radius + extraDistForRobotToShoot))
	-- position close to opponent defence area with some distance
	local intersections = Field.intersectCircleDefenseArea(circle, radius, 0.75, true)
	local lastPointNearOppDefenseArea = nil
	for i = 1, 4 do
		if lastPointNearOppDefenseArea == nil then
			lastPointNearOppDefenseArea = intersections[i]
		elseif intersections[i] and intersections[i]:distanceTo(World.Ball.pos) > lastPointNearOppDefenseArea:distanceTo(World.Ball.pos) then
			lastPointNearOppDefenseArea = intersections[i]
		end
	end
	-- extend the found position backwards
	lastPointNearOppDefenseArea = circle + (lastPointNearOppDefenseArea - circle):setLength(randomExtension(radius + extraDistForRobotToShoot))
	-- angleDiff between the found positions
	local angleDiff = ((firstPointNearBall - circle)):angleDiff((lastPointNearOppDefenseArea - circle)) / (BallCycle.N_ROBOTS - 2)
	-- make sure all positions are inside the field
	firstPointNearBall = Field.limitToAllowedField(firstPointNearBall, 0.3)
	lastPointNearOppDefenseArea = Field.limitToAllowedField(lastPointNearOppDefenseArea, 0.3)
	table.insert(positions, firstPointNearBall)
	table.insert(positions, lastPointNearOppDefenseArea)
	-- find positions for the other robots
	for i = 1, (BallCycle.N_ROBOTS - 3) do
		local pos = circle + ((firstPointNearBall- circle):rotate(i * angleDiff)):setLength(randomExtension(radius + extraDistForRobotToShoot))
		table.insert(positions, Field.limitToAllowedField(pos, 0.3))
	end
	return 
	 
end

function BallCycle:_init()
	self._circleCenter = World.Ball.pos
	self._circleRadius = 0.6
	self._currentRefereeState = World.RefereeState
	self._positions = {}
end

function BallCycle:_canContinue()
	if Referee.isFriendlyFreeKickState() and Field.distanceToFieldBorder(World.Ball.pos) >= self._circleRadius then
		return true
	end
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop" and Field.distanceToFieldBorder(World.Ball.pos) >= self._circleRadius
end

function BallCycle:_updateTasks()
	local reload = false
	if (self._currentRefereeState ~= World.RefereeState) or World.Ball.pos:distanceTo(self._circleCenter) > 0.05 then
		self._circleCenter = World.Ball.pos
		self._currentRefereeState = World.RefereeState
		reload = true
	end
	-- draw circles where robots cannot shoot a volley
	local center1, center2, radius = geom.inscribedAngle(World.Ball.pos, G.OpponentGoal, math.pi/3)
	vis.addCircle("move/ballCycle", center1, radius, vis.colors.redHalf, true)
	vis.addCircle("move/ballCycle", center2, radius, vis.colors.redHalf, true)

	if Referee.isStopState() then
		self._positions = {}
	elseif Referee.isFriendlyFreeKickState() and #self._positions == 0 then
		getRandomPosition(self._positions)
	end
	
	local posForRobotBeforeShooting = World.Ball.pos + (World.Ball.pos - G.OpponentGoal):setLength(0.14)

	local taskAssignments = {}
	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.4, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.8, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.2, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.6, self._circleRadius }, restart = reload }
	elseif Referee.isFriendlyFreeKickState() and self._robots[1].pos:distanceTo(posForRobotBeforeShooting) > 0.20 then
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { posForRobotBeforeShooting , nil, true } }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.5, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.0, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.5, self._circleRadius }, restart = reload }
	elseif Referee.isFriendlyFreeKickState()  then
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = { } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positions[1] , nil, true } }
		taskAssignments[self._robots[3]] = { class = MoveToPos, params = { self._positions[2] , nil, true } }
		taskAssignments[self._robots[4]] = { class = MoveToPos, params = { self._positions[3] , nil, true } }
		taskAssignments[self._robots[5]] = { class = MoveToPos, params = { self._positions[4] , nil, true } }
	end
	return taskAssignments
end

return BallCycle
