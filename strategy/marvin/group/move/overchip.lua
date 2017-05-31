local Overchip = Class("Group.Move.Overchip", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local Freekick = require "agent/attacker/freekick"
local MoveToStaticBall = require "task/movetostaticball"
local OverchipReceiver = require "task/overchipReceiver"
local Shootgoal = require "task/shootgoal"
local Striker = require "task/striker"
local Field = require "../base/field"
local Referee = require "../base/referee"


-- "runway" refers to the way on which we have to accelerate to receive the rolling ball
local MIN_RUNWAY_LENGTH = 1.8 -- how much room we need
local DISTANCE_TO_DEFENSE_AREA = 1 -- How far our runway should go, running into the defenders won't help

Overchip.N_ROBOTS = 2

function Overchip.canStart()
	return Referee.isFriendlyFreeKickState() 
			and G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA) - World.Ball.pos.y > MIN_RUNWAY_LENGTH -- how much room we need
			and World.Time - Referee.lastStateChangeTime() < 2 -- move should start if freekick state is already running for some time
end

function Overchip:_init()

end

function Overchip:_canContinue()
	if not Referee.isFriendlyFreeKickState() then
		return false
	end

	-- if we can't get the ball before reaching the defense area
	for sender, msg in pairs(self._inbox.passSuggestion()) do
		if sender == self._robots[2] then
			if Field.isInOpponentDefenseArea(msg.ballPos, 0) then
				return false
			end
			break
		end
	end
	return true
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
