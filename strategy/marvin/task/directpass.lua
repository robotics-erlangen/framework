local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"

DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot, passSpeed)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
	self._passSpeed = passSpeed
end

function DirectPass:_canShoot()
	-- get estimated pos of impact = where the ball will go 
	local estimatedPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.pos:distanceTo(self._targetPos))
	-- get distance to where it is supposed to go
	local distanceToTarget = estimatedPos:distanceTo(self._targetPos)

	-- if robot is going to hit the dribbler, all good 
	if distanceToTarget > self._targetRobot.dribblerWidth / 2 + Settings.passPrecision then
		return false
	end 

	return Robot.wayToRobotFree(self._targetRobot, self._robot, not self._linearShoot)
end

function DirectPass:_run(priorityMessages, notifications)
	local msg = notifications[self._targetRobot]

	self._targetPos = msg and msg.task.targetPos or self._targetRobot.pos
	self._targetDir = msg and msg.task.targetDir or self._targetRobot.dir

	-- shoot ball into robot dribbler
	self._targetPos = self._targetPos + Vector.fromAngle(self._targetDir) * self._targetRobot.shootRadius
	-- TODO calc shoot target

	local passSpeed = self._passSpeed or self._targetRobot.constants.passSpeed
	self:_shoot(self._targetPos, passSpeed, self._linearShoot)
	
	return { passTarget = self._targetRobot }
end

function DirectPass:_rate()
	return Rating.timeToRating(Robot.minTimeToBall(self._robot, World.Ball))
end

function DirectPass.factory(position, positionTarget, linearShoot)
	local f = function (robots)
		return DirectPass.create(robots[position], robots[positionTarget], linearShoot)
	end
	return f
end

function DirectPass.test(id)
	if id > 0 then
		return nil
	end
	return DirectPass.factory(1, 2, true), 2
end

return DirectPass
