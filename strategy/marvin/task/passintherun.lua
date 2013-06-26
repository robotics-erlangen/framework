local PassInTheRun = (require "../base/class").new("Task.PassInTheRun", require "task/shoot")

local World = require "../base/world"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Rating = require "util/rating"
local Robot = require "observer/robot"
local vis = require "../base/vis"
local geom = require "../base/geom"

PassInTheRun.priority = 4

function PassInTheRun:_init(targetRobot, shootPos, passSpeed)
	assert(shootPos, "shoot pos is missing")
	self._targetRobot = targetRobot
	self._shootPos = shootPos
	self._passSpeed = passSpeed or self._robot.constants.passSpeed/2
	self._isShooting = false
end

function PassInTheRun:_canShoot()
	local angleDiff = geom.getAngleDiff(self._robot.dir, (self._shootPos - self._robot.pos):angle())
	return math.abs(angleDiff) < 6 / 180 * math.pi
end

function PassInTheRun:_run(priorityMessages, notifications)
	local passInTheRunSpeed = self._passSpeed
	local linear = Shoot.evaluatePassCorridor(self._robot, 0, self._shootPos) > 0.2
	local isShooting = self:_shoot(self._shootPos, passInTheRunSpeed, linear)
	self._isShooting = self._isShooting or isShooting
	
	local msg = { shootPos = self._shootPos }
	if self._isShooting then
		msg.passTarget = self._targetRobot
	end
	return msg
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
