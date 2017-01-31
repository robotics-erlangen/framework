local LongMarch = Class("Group.Move.LongMarch", require "group/move/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local Circuit = require "task/circuit"
local Pass = require "task/pass"
local Ball = require "observer/ball"
local G = World.Geometry

LongMarch.NAME = "Longmarch"
LongMarch.N_ROBOTS = 5

local POSITIONS = {
	Vector((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius  , G.FieldHeightHalf-G.DefenseRadius),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf-G.DefenseRadius),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf/3),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/4 + G.DefenseRadius)  , G.FieldHeightHalf/3)
}


function LongMarch.canStart()
	return  World.Ball.pos.y < -G.FieldHeightHalf/4
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4
		and World.RefereeState == "Stop"
end

function LongMarch:_init()
	self._state = "prepare"
end

function LongMarch:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	if World.Ball.pos.y < -G.FieldHeightHalf/4 + 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4 - 0.2
		and World.RefereeState == "Stop" then
		return true
	end
	if World.RefereeState == "Game" and Ball.opponentBallOwner() == nil then
		return true
	end
end

function LongMarch:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { Vector(0, G.FieldHeightHalf/2), math.pi } }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { Vector(0, G.FieldHeightHalf/2), math.pi * 2 } }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { Vector(0, -G.FieldHeightHalf/2), math.pi  } }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { Vector(0, -G.FieldHeightHalf/2), math.pi *2 } }
	else--if self._state == "pass1" then
		taskAssignments[self._robots[1]] = { class = Pass, params = { self._robots[2] } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { POSITIONS[1], nil, true} }
		taskAssignments[self._robots[3]] = { class = MoveToPos, params = { POSITIONS[2], nil, true} }
		taskAssignments[self._robots[4]] = { class = MoveToPos, params = { POSITIONS[3], nil, true} }
		taskAssignments[self._robots[5]] = { class = MoveToPos, params = { POSITIONS[4], nil, true} }
	--elseif self._state == "pass2" then
	--elseif self._state == "goal" then
	end

	if World.RefereeState == "Game" then
		self._state = "pass1"
	end



	return taskAssignments
end

return LongMarch
