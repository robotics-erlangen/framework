local MrlTestCorner = Class("Group.Move.MrlTestCorner", require "groups/moves/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local MrlTestCornerTask = require "groups/moves/mrltestcornertask"
local Pass = require "task/pass"
local StopAttack = require "task/stopattack"
local G = World.Geometry


MrlTestCorner.N_ROBOTS = 5

function MrlTestCorner.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 --and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function MrlTestCorner:_init()
	local ballSide = (World.Ball.pos.x > 0) and -1 or 1
	local goalDist = G.DefenseRadius+0.4
	self._distractorPositions = {
		Vector(0.3, G.OpponentGoal.y - goalDist),
		Vector(0.0, G.OpponentGoal.y - goalDist),
		Vector(-0.3, G.OpponentGoal.y - goalDist)
	}

	self._activeRobotInitPos = Vector(ballSide*G.FieldWidthHalf/1.4, G.OpponentGoal.y-0.5)
	self._activeRobotShootPos = Vector(-ballSide*G.FieldWidthHalf/2, G.OpponentGoal.y-2.5)
end

function MrlTestCorner:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function MrlTestCorner:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
		taskAssignments[self._robots[2]] = { class = MrlTestCornerTask, params = { self._activeRobotInitPos }}
	elseif Referee.isFriendlyFreeKickState() then
		taskAssignments[self._robots[1]] = { class = Pass, params = { self._robots[2] } }
		taskAssignments[self._robots[2]] = { class = MrlTestCornerTask, params = { self._activeRobotShootPos, self._robots[1] }, restart = true}
	end

	taskAssignments[self._robots[3]] = { class = MrlTestCornerTask, params = { self._distractorPositions[1] }}
	taskAssignments[self._robots[4]] = { class = MrlTestCornerTask, params = { self._distractorPositions[2] }}
	taskAssignments[self._robots[5]] = { class = MrlTestCornerTask, params = { self._distractorPositions[3] }}

	return taskAssignments
end

return MrlTestCorner
