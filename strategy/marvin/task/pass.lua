local CatchBall = require "task/ability/catchball"
local ReceivePass = require "task/ability/receivepass"
local Shoot = require "task/ability/shoot"
local Pass = (require "../base/class").newTask("Task.Pass", require "task/base",
	CatchBall, Shoot, ReceivePass)

local World = require "../base/world"
local Robot = require "observer/robot"
local vis = require "../base/vis"
local geom = require "../base/geom"
local debug = require "../base/debug"

function Pass:_init(targetRobot, shootPos, linearShoot)
	self._targetRobot = assert(targetRobot, "targetRobot is missing")
	self._linearShoot = linearShoot
	if shootPos then
		self._inTheRun = true
		self._passSpeed = Settings.shootDriveSpeed
		self._shootPos = shootPos
	else
		self._inTheRun = false
		self._passSpeed = self._targetRobot.constants.passSpeed
		self._shootPos = nil
	end
end

function Pass:_canShoot()
	if self._inTheRun then
		local angleDiff = geom.getAngleDiff(self._robot.dir, (self._shootPos - self._robot.pos):angle())
		return math.abs(angleDiff) < 6 / 180 * math.pi
	else -- direct pass
		local currentPointOfImpact = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.pos:distanceTo(self._shootPos))
		local distanceToTarget = currentPointOfImpact:distanceTo(self._shootPos)
		-- if robot is going to hit the dribbler, all good
		return distanceToTarget <= self._targetRobot.dribblerWidth / 2 + Settings.passPrecision
	end
end

function Pass:run()
	if self._inTheRun then
		local newSuggestion = self._inbox.passSuggestion()[self._targetRobot]
		if newSuggestion and newSuggestion.pos and
				newSuggestion.pos:distanceTo(self._shootPos) < 0.5 then
			self._shootPos = newSuggestion.pos
		end
	else  -- direct pass
		-- shoot ball into robot dribbler
		self._shootPos = self._targetRobot.pos + Vector.fromAngle(self._targetRobot.dir) * self._targetRobot.shootRadius
	end

	local linearShoot
	if self._linearShoot ~= nil then
		linearShoot = self._linearShoot
	else
		local overMiddle = self._shootPos.y * World.Ball.pos.y < 0
		linearShoot = Robot.wayToPosFree(self._shootPos, self._robot, self._targetRobot) or overMiddle
	end
	self:_shoot(self._shootPos, self._passSpeed, linearShoot)
	self._send.passPos(self._targetRobot, self._shootPos)

	debug.set("targetRobot", self._targetRobot.id)
	debug.set("in the run", self._inTheRun)
	debug.set("chip", not linearShoot)
	vis.addCircle("t/pass: ShootPos", self._shootPos, 0.1, vis.colors.blue, true)
end

return Pass
