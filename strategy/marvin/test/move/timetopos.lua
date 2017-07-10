local TimeToPos = Class("Test.Move.TimeToPos", require "group/move/base")

local plot = require "../base/plot"
local vis = require "../base/vis"
local World = require "../base/world"

local Physics = require "observer/physics"
local MoveToPos = require "task/movetopos"

TimeToPos.MIN_ROBOTS = 1
TimeToPos.MAX_ROBOTS = 1

function TimeToPos.canStart()
	return true
end

function TimeToPos:_init()
	self._state = 1

	self._positions = {
		-- Vector(1, -2), Vector(-3, -2), Vector(1, -2)
		Vector(1, -2), Vector(-3, -2), Vector(1, 3)
		-- Vector(0.2, -2), Vector(-3, -2), Vector(-0.4, -2)
		-- Vector(1, -2), Vector(-2, -2), Vector(2, -2),
		-- Vector(1, -2), Vector(-2, -2), Vector(-1, -1.7),
		-- Vector(0.1, -2), Vector(-1, -2), Vector(-0.07, -1.7)
	}

	self._endSpeedLength = 0

	self._startTime = nil
	self._estimation2 = nil
	self._brakeTime = nil
	self._curveTime = nil
	self._brakePos = nil
	self._curvePos = nil
end

function TimeToPos:_canContinue()
	return true
end

function TimeToPos:_updateTasks()
	local taskAssignments = {}
	local plotVal = 0
	local pos = self._robots[1].pos
	local state = self._state
	if self._state == 1 and pos:distanceTo(self._positions[1]) < 0.005 then
		state = 2
	elseif self._state == 2 and pos.x < 0 then
		state = 3
		self._startTime = World.Time
		self._estimation2, self._brakeTime, self._curveTime = Physics.robotTimeToPos(self._robots[1], self._positions[3], Vector(0, self._endSpeedLength))
		plotVal = 0.1
		log("Estimation 2: " .. tostring(self._estimation2))
	elseif self._state == 3 and pos:distanceTo(self._positions[3]) < 0.005 and self._robots[1].speed:length() <= self._endSpeedLength + 0.1 then
		local measuredTime = World.Time - self._startTime
		log("Measurement: " .. tostring(measuredTime))
		log("Error 2: " .. tostring(self._estimation2 - measuredTime))
		state = 1
		self._brakeTime = nil
		self._curveTime = nil
		self._brakePos = nil
		self._curvePos = nil
	end

	plot.addPlot("RTTP", plotVal)
	plot.addPlot("RobotSpeed", self._robots[1].speed:length())

	if not self._brakePos and self._brakeTime and World.Time > self._startTime + self._brakeTime then
		self._brakePos = self._robots[1].pos
	end
	if self._brakePos then
		vis.addCircle("rttp", self._brakePos, 0.04, vis.colors.whiteHalf, true)
	end

	if not self._curvePos and self._curveTime and World.Time > self._startTime + self._brakeTime + self._curveTime then
		self._curvePos = self._robots[1].pos
	end
	if self._curvePos then
		vis.addCircle("rttp", self._curvePos, 0.04, vis.colors.whiteHalf, true)
	end

	local restart = self._state == state
	self._state = state

	local endSpeedLength = state == 3 and self._endSpeedLength or 0

	taskAssignments[self._robots[1]] = { class = MoveToPos,
		params = { self._positions[self._state], nil, nil, endSpeedLength }, restart = restart}
	return taskAssignments
end

return TimeToPos