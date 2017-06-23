local Overchip = Class("Group.Move.Overchip", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local Freekick = require "agent/attacker/freekick"
local MoveToStaticBall = require "task/movetostaticball"
local OverchipReceiver = require "task/overchipreceiver"
local Shootgoal = require "task/shootgoal"
local Striker = require "task/striker"

-- "runway" refers to the way on which we have to accelerate to receive the rolling ball
local MIN_RUNWAY_LENGTH = 1.3 -- how much room we need (measured horizontally)
local DISTANCE_TO_DEFENSE_AREA = 1.5 -- how far our runway should go, running into the defenders won't help
local MAX_CHIP_DISTANCE = 2 -- how far we can (reliably) chip

Overchip.MIN_ROBOTS = 2
Overchip.MAX_ROBOTS = 2

function Overchip.canStart()
	return Referee.isFriendlyFreeKickState()
			and G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA) - World.Ball.pos.y > MIN_RUNWAY_LENGTH -- how much room we need
			and World.Time - Referee.lastStateChangeTime() < 2 -- move should start if freekick state is already running for some time
			and not Overchip._runwayObstructed()
end

function Overchip:_init()

end

function Overchip:_canContinue()
	if not Referee.isFriendlyFreeKickState() or World.Time - Referee.lastStateChangeTime() > 6 then
		return false
	end

	for sender, msg in pairs(self._inbox.passSuggestion()) do
		if sender == self._robots[2] then

			-- if we can't get the ball before reaching the defense area
			if Field.isInOpponentDefenseArea(msg.ballPos, 0) then
				return false
			end
			if self._runwayObstructed() then
				return false
			end
			break
		end
	end

	return true
end

function Overchip._runwayObstructed()
	-- if there are robots in the way that we can't overchip
	local goalVector = G.OpponentGoal - World.Ball.pos
	local criticalStart = World.Ball.pos + goalVector:copy():setLength(MAX_CHIP_DISTANCE)
	local distToGoal = G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA
	local criticalEnd = World.Ball.pos + goalVector:copy():setLength(goalVector:length() - distToGoal)
	vis.addCircle("g/m/overchip: critical area", criticalStart, 0.05, vis.colors.red, true)
	vis.addCircle("g/m/overchip: critical area", criticalEnd, 0.05, vis.colors.red, true)
	vis.addPath("g/m/overchip: critical area", {criticalStart, criticalEnd}, vis.colors.red)
	for _, opp in pairs(World.OpponentRobots) do
		if opp.pos:distanceToLineSegment(criticalStart, criticalEnd) < 0.3 then
			return true
		end
	end
	return false
end

function Overchip:_updateTasks()
	local taskAssignments = {}
	local robotRadius = self._robots[1].radius
	local ballPos = World.Ball.pos
	local goal = G.OpponentGoal

	local closeToBall = self._robots[1].pos:distanceTo(World.Ball.pos) < robotRadius + 0.1
	local closeToPosition = self._robots[2].pos:orthogonalDistance(ballPos, goal) < robotRadius

	if closeToBall and closeToPosition then
		taskAssignments[self._robots[1]] = { behavior = Freekick}
		taskAssignments[self._robots[2]] = { class = OverchipReceiver, params = {}}
	elseif World.Time - Referee.lastStateChangeTime() > 9 then
		taskAssignments[self._robots[1]] = { class = Shootgoal, params = {}}
		taskAssignments[self._robots[2]] = { class = Striker, params = {}}
	else
		taskAssignments[self._robots[1]] = { class = MoveToStaticBall, params = {}}
		taskAssignments[self._robots[2]] = { class = OverchipReceiver, params = {}}
	end

	return taskAssignments
end
return Overchip
