local KickOff = Class("Group.Move.KickOff", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local Freekick = require "agent/attacker/freekick"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local Striker = require "task/striker"
local MovesHelper = require "util/moveshelper"

KickOff.N_ROBOTS = 3

function KickOff.canStart()
	return World.RefereeState == "KickoffOffensivePrepare"
end

function KickOff:_init()
	self._assistantPos = {
		Vector(-G.FieldWidthHalf * 0.7, -0.7),
		Vector(G.FieldWidthHalf * 0.7, -0.7),
	}
	self._passDest = {
		Vector(-G.FieldWidthHalf * 0.9, -0.2),
		Vector(G.FieldWidthHalf * 0.9, -0.2),
	}

	local positions = { Vector(0, 0) }
	for _,pos in ipairs(self._assistantPos) do
		table.insert(positions, pos)
	end
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
end

function KickOff:_canContinue()
	return World.RefereeState == "KickoffOffensivePrepare"
			or World.RefereeState == "KickoffOffensive"
end

function KickOff:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "KickoffOffensivePrepare" then
		taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }
		taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._assistantPos[1] } }
		taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._assistantPos[2] } }
	else
		taskAssignments[self._robots[self._assignments[1]]] = { behavior = Freekick }
		taskAssignments[self._robots[self._assignments[2]]] = { class = Striker, params = { self._assistantPos[1], self._passDest[1] } }
		taskAssignments[self._robots[self._assignments[3]]] = { class = Striker, params = { self._assistantPos[2], self._passDest[2] } }
	end

	return taskAssignments
end

return KickOff