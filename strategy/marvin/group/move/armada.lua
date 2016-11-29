local Armada = Class("Group.Move.Armada", require "group/move/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local FreeKick = require "agent/attacker/freekick"
local Circuit = require "task/circuit"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local G = World.Geometry


Armada.N_ROBOTS = 5

-- the armada has 4 steps to form stairs, depending on ball distance
local POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
}

local MAX_RANDOM_POSITION_OFFSET = 0.3

function Armada.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 --and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

local function getRandomOffsetVector()
	local result = Vector(0,0)
	result.x = (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
	result.y = (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
	return result
end

function Armada:_init()
	self._circleCenter = Vector(0,0) + getRandomOffsetVector()
	self._positions = {}
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
	if Referee.isStopState() then
		self._positions = {}
	elseif Referee.isFriendlyFreeKickState() and #self._positions == 0 then
		for i = 1, 4 do
			local pos = POSITIONS_ORIG[i]:copy()
			if World.Ball.pos.x > 0 then
				pos.x = -pos.x
			end
			table.insert(self._positions, pos)
		end
	end

	local taskAssignments = {}
	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0 } }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.5 } }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.0 } }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.5 } }
	else
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = { } }
		taskAssignments[self._robots[2]] = { class = MoveToPos,
			params = { self._positions[1] + getRandomOffsetVector() , nil, true } }
		taskAssignments[self._robots[3]] = { class = MoveToPos,
			params = { self._positions[2] + getRandomOffsetVector() , nil, true } }
		taskAssignments[self._robots[4]] = { class = MoveToPos,
			params = { self._positions[3] + getRandomOffsetVector() , nil, true } }
		taskAssignments[self._robots[5]] = { class = MoveToPos,
			params = { self._positions[4] + getRandomOffsetVector() , nil, true } }
	end
	return taskAssignments
end

return Armada
