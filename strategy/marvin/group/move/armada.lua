local Armada = Class("Group.Move.Armada", require "group/move/base")

local Circuit = require "task/circuit"
local Field = require "../base/field"
local FreeKick = require "agent/attacker/freekick"
local geom = require "../base/geom"
local MovesHelper = require "util/moveshelper"
local MoveToPos = require "task/movetopos"
local Referee = require "../base/referee"
local StopAttack = require "task/stopattack"
local World = require "../base/world"

local G = World.Geometry

Armada.N_ROBOTS = 5

-- the armada has 4 steps to form stairs, depending on ball distance
local POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
}

local MAX_RANDOM_POSITION_OFFSET = 0.8

local function getRandomOffsetVector()
	local result = Vector(0,0)
	result.x = (math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5)
	result.y = (math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5)
	return result
end

-- biased random for setting the position backwards
local function randomExtension(min)
	return math.round(min + MAX_RANDOM_POSITION_OFFSET * math.pow(math.random(), 2), 1)
end

function Armada.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function Armada:_init()
	self._circleCenter = Vector(0,0) + getRandomOffsetVector()
	self._positions = {}
	self._maxShootingAngle = 60 / 180 * math.pi
	self._assignment = {}
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
	-- draw circles where robots cannot shoot a volley
	local center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, self._maxShootingAngle)
	local circle = center1.y < center2.y and center1 or center2
	if World.RefereeState == "Stop" then
		self._positions = {}
		self._assignment = {}
	elseif Referee.isFriendlyFreeKickState() and #self._positions == 0 then
		-- calculate position
		for i = 1, 4 do
			local pos = POSITIONS_ORIG[i]:copy()
			if World.Ball.pos.x > 0 then
				pos.x = -pos.x
			end
			pos = pos + getRandomOffsetVector()
			-- shift positions to make volley possible
			if pos:distanceTo(circle) <= radius then
				local posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
				local intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, pos - posToShiftFrom, circle, radius)
				pos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom):setLength(randomExtension(intersectionWithCircle:distanceTo(posToShiftFrom) + 0.1))
			end
			table.insert(self._positions, Field.limitToAllowedField(pos, 0.3))
		end

		-- assign robots to positions
		self._assignment = MovesHelper.assignRobots(self._robots, self._positions, 1)
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
		taskAssignments[self._robots[self._assignment[2]]]
				= { class = MoveToPos, params = { self._positions[1], nil, true } }
		taskAssignments[self._robots[self._assignment[3]]]
				= { class = MoveToPos, params = { self._positions[2], nil, true } }
		taskAssignments[self._robots[self._assignment[4]]]
				= { class = MoveToPos, params = { self._positions[3], nil, true } }
		taskAssignments[self._robots[self._assignment[5]]]
				= { class = MoveToPos, params = { self._positions[4], nil, true } }
	end
	return taskAssignments, self._robots[1]
end

return Armada
