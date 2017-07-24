local Dribble = Class("Tesst.Move.Dribble", require "group/move/base")

local DribbleTask = require "task/dribble"
local World = require "../base/world"

local G = World.Geometry

Dribble.MIN_ROBOTS = 1
Dribble.MAX_ROBOTS = 1

-- the armada has 4 steps to form stairs, depending on ball distance
local POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.56, G.FieldWidthHalf * -0.225),
}

function Dribble.canStart()
	return true
end

function Dribble:_init()
	self._state=1
	self._time = World.Time
end

function Dribble:_canContinue()
	return true
end

function Dribble:_updateTasks()
	local state_changed = false
	local delay = false
	local class = DribbleTask
	if World.Time - self._time < 3 then
		delay = true
	--	class = MoveToPos
	end
	if not delay and self._state == 5 then
		self._state = 1
		state_changed = true
	end
	if self._robots[1].pos:distanceTo(POSITIONS_ORIG[self._state]) < 0.01 and not delay then
		if self._state == 4 then
			self._state = 5
			self._time = World.Time
			delay = true
			state_changed = true
		else
			state_changed = true
			self._state = self._state + 1
		end
	end
	local taskAssignments = {}
	taskAssignments[self._robots[1]] = { class = class, params = {POSITIONS_ORIG[self._state]}, restart = state_changed }
	return taskAssignments, self._robots[1]
end

return Dribble
