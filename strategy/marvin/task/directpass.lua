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
	self._targetRobot = assert(targetRobot, "no pass receiver given")
	self._passSpeed = passSpeed or self._targetRobot.constants.passSpeed
	self._targetPos = nil
end

function DirectPass:_canShoot()
	-- get estimated pos of impact = where the ball will go
	local estimatedPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.pos:distanceTo(self._targetPos))
	local distanceToTarget = estimatedPos:distanceTo(self._targetPos)
	-- if robot is going to hit the dribbler, all good
	return distanceToTarget <= self._targetRobot.dribblerWidth / 2 + Settings.passPrecision
end

function DirectPass:run()
	-- shoot ball into robot dribbler
	self._targetPos = self._targetRobot.pos + Vector.fromAngle(self._targetRobot.dir) * self._targetRobot.shootRadius
	local notOverMiddle = self._targetPos.y * World.Ball.pos.y >= 0
	local linearShoot = Robot.wayToRobotFree(self._targetRobot, self._robot) and notOverMiddle
	self:_shoot(self._targetPos, self._passSpeed, linearShoot)

	self._send.passSender(self._targetRobot, "direct")

	debug.set("target", self._targetRobot)
	debug.set("chip", not linearShoot)
	vis.addCircle("t/directpass: DirectPass", self._targetPos, 0.2, vis.colors.orangeHalf, true)
	vis.addPath("t/directpass: DirectPass", {World.Ball.pos, self._targetPos +
				(World.Ball.pos - self._targetPos):setLength(0.2)}, vis.colors.orange)
end

return DirectPass
