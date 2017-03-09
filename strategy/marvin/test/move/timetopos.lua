local TimeToPos = Class("Test.Move.TimeToPos", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local Physics = require "observer/physics"
local MoveToPos = require "task/movetopos"

TimeToPos.N_ROBOTS = 1

function TimeToPos.canStart()
	return true
end

function TimeToPos:_init()
	self._state = 1

	self._positions = {
		Vector(G.FieldWidthQuarter, -G.FieldHeightQuarter),
		Vector(-G.FieldWidthHalf, -G.FieldHeightQuarter),
		-- Vector(-G.FieldWidthHalf, -G.FieldHeightQuarter),
		Vector(0, G.FieldHeightQuarter),
	}

	self._estimation = nil
	self._startTime = nil
end

function TimeToPos:_canContinue()
	return true
end

function TimeToPos:_updateTasks()
	local taskAssignments = {}

	local pos = self._robots[1].pos
	local state = self._state
	if self._state == 1 and pos:distanceTo(self._positions[1]) < 0.01 then
		state = 2
	elseif self._state == 2 and pos.x < 0 then
		state = 3
		self._startTime = World.Time
		self._estimation = Physics.robotTimeToPos(self._robots[1], self._positions[3], Vector(0, 0), true)
		log("Estimation: " .. tostring(self._estimation))
	elseif self._state == 3 and pos:distanceTo(self._positions[3]) < 0.01 then
		local measuredTime = World.Time - self._startTime
		log("Measurement: " .. tostring(measuredTime))
		log("Error: " .. tostring(self._estimation - measuredTime))
		state = 1
	end

	local restart = self._state == state
	self._state = state

	taskAssignments[self._robots[1]] = { class = MoveToPos,
		params = { self._positions[self._state] }, restart = restart}
	return taskAssignments
end

return TimeToPos