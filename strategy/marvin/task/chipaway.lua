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

function ChipAway:_canShoot()
	return true
end

function ChipAway:_run()
	-- try to hit an assistant	
	if not self._chipTarget then
		local bestRating = -1
		for robot, rating in pairs(self._inbox.assistantRating()) do
			if Robot.wayToRobotFree(robot, self._robot, true) and rating > bestRating then
				self._chipTarget = robot
				bestRating = rating
			end
		end
	end
	
	local chipPos = self._chipTarget and self._chipTarget.pos or World.Geometry.OpponentGoal
	self._robot:setDribblerSpeed(1)
	self:_shoot(chipPos, math.huge, false)

	if self._chipTarget then
		self._send(self._chipTarget).passSender("direct")
	end
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
