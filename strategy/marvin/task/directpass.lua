-- load abilities
local CatchBall = require "task/ability/catchball"
local Shoot = require "task/ability/shoot"

local DirectPass = (require "../base/class").newTask("Task.DirectPass", require "task/base",
		CatchBall, Shoot)

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local debug = require "../base/debug"
local vis = require "../base/vis"

function DirectPass:_init(targetRobot, linearShoot, passSpeed)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
	self._passSpeed = passSpeed
	self._targetPos = nil
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

function DirectPass:run()
	-- shoot ball into robot dribbler
	self._targetPos = self._targetRobot.pos + Vector.fromAngle(self._targetRobot.dir) * self._targetRobot.shootRadius

	local passSpeed = self._passSpeed or self._targetRobot.constants.passSpeed
	self:_shoot(self._targetPos, passSpeed, self._linearShoot)
	self._send.passSender(self._targetRobot, "direct")

	debug.set("target", self._targetRobot)
	vis.addCircle("t/directpass: DirectPass", self._targetPos, 0.2, vis.colors.orangeHalf, true)
	vis.addPath("t/directpass: DirectPass", {World.Ball.pos, self._targetPos +
				(World.Ball.pos - self._targetPos):setLength(0.2)}, vis.colors.orange)
end

return DirectPass
