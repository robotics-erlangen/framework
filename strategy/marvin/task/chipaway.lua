local ChipAway = (require "../base/class").new("Task.ChipAway", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"


ChipAway.priority = 6

function ChipAway:_init()
	self._chipTarget = nil
end

function ChipAway:_successProbability(t)
	return 1
end

function ChipAway:_run(priorityMessages, notifications)
	-- try to hit an assistant	
	if not self._chipTarget then
		local bestRating = -1
		for robot, msg in pairs(notifications) do
			if msg.task.assistantRating and msg.task.assistantRating > bestRating then
				self._chipTarget = robot
				bestRating = msg.task.assistantRating
			end
		end
	end
	
	local chipPos = self._chipTarget and self._chipTarget.pos or World.Geometry.OpponentGoal
	self:_shoot(chipPos, math.huge, false, 0)

	return {passTarget = self._chipTarget}
end

function ChipAway:_rate()
	return 1
end

function ChipAway.factory(position)
	local f = function (robots)
		return ChipAway.create(robots[position])
	end
	return f
end

function ChipAway.test(id)
	if id > 0 then
		return nil
	end
	return ChipAway.factory(1), 1
end

return ChipAway
