local PassInTheRun = (require "../base/class").new("Task.PassInTheRun", require "task/shoot")

local World = require "../base/world"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Rating = require "util/rating"
local Robot = require "observer/robot"
local vis = require "../base/vis"

PassInTheRun.priority = 4

function PassInTheRun:_init(targetRobot, shootPos)
	self._targetRobot = targetRobot
	self._shootPos = shootPos
	self._succProbability = 0
end

local successProbability = 0
function PassInTheRun:_successProbability(t)
	if self._shootPos then
		local angleDiff = math.abs(self._robot.dir - (self._shootPos - self._robot.pos):angle())
		local diffRatio = (2*math.pi - angleDiff) / (2*math.pi)
		local weightedRatio = diffRatio * diffRatio
		if weightedRatio > successProbability then
			successProbability = weightedRatio
		end
	end
	return successProbability
end

function PassInTheRun:_run(priorityMessages, notifications)
	local passSpeed = self._targetRobot.constants.passSpeed
	self:_shoot(self._shootPos, passSpeed, true, Settings.shootProbabilityThreshold, true)
	
	return { passTarget = self._targetRobot, shootPos = self._shootPos }
end

function PassInTheRun:_rate()
	return Rating.timeToRating(Robot.minTimeToBall(self._robot, World.Ball))
end

function PassInTheRun.factory(position, positionTarget)
	local f = function (robots)
		return PassInTheRun.create(robots[position], robots[positionTarget])
	end
	return f
end

function PassInTheRun.test(id)
	if id > 0 then
		return nil
	end
	return PassInTheRun.factory(1, 2, true), 2
end

return PassInTheRun
