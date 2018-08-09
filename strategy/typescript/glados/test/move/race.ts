local Race = Class("Test.Move.Race", require "group/move/base")

local World = require "../base/world"
local MoveToPos = require "task/shared/movetopos"

Race.MIN_ROBOTS = 1
Race.MAX_ROBOTS = 1

local Y_END = -(-World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5)
local Y_START = -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5
local TOLERANCE = 0.02

function Race.canStart()
	return true
end

function Race:_init()
	self._atStart = true
end

function Race:_canContinue()
	return true
end

function Race:_updateTasks()
	local taskAssignments = {}

	local restart = false
	if self._atStart then
		local finished = true
		for _,r in ipairs(self._robots) do
			if r.pos.y + TOLERANCE < Y_END then
				finished = false
				break
			end
		end
		if finished then
			self._atStart = false
			restart = true
		end
	else
		local finished = true
		for _,r in ipairs(self._robots) do
			if r.pos.y - TOLERANCE > Y_START then
				finished = false
				break
			end
		end
		if finished then
			self._atStart = true
			restart = true
		end
	end

	for i = 1, #self._robots do
		taskAssignments[self._robots[i*/ = { class = MoveToPos,
			params = { Vector(-0.5 * (#self._robots + 1) + i + 2, self._atStart and Y_END or Y_START) }, restart = restart}
		end
	return taskAssignments
end

return Race
