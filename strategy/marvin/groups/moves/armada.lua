local Armada = Class("Group.Move.Armada", require "groups/moves/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local MoveToPos = require "task/movetopos"
local MoveToStaticBall = require "task/movetostaticball"
local StopAttack = require "task/stopattack"
local ArmadaTask = require "groups/moves/armadatask"
local G = World.Geometry

Armada.N_ROBOTS = 5

function Armada.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 --and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function Armada:_init()
end

function Armada:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2 
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function Armada:_updateTasks()
	local taskAssignments = {}
	taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	taskAssignments[self._robots[2]] = { class = ArmadaTask, params = { 1 } }
	taskAssignments[self._robots[3]] = { class = ArmadaTask, params = { 2 } }
	taskAssignments[self._robots[4]] = { class = ArmadaTask, params = { 3 } }
	taskAssignments[self._robots[5]] = { class = ArmadaTask, params = { 4 } }
	return taskAssignments
end

return Armada