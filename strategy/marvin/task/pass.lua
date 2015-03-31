local CatchBall = require "task/ability/catchball"
local ReceivePass = require "task/ability/receivepass"
local Shoot = require "task/ability/shoot"
local Volley = require "task/ability/volley"
local Pass = Class("Task.Pass", require "task/base",
	CatchBall, Shoot, Volley, ReceivePass)

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
		self._passSpeed = 0.2 -- Settings.shootDriveSpeed
		self._shootPos = shootPos
	else
		self._inTheRun = false
		self._passSpeed = self._targetRobot.constants.passSpeed * 0.65
		self._shootPos = nil
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

	self:_shoot(self._shootPos, self._passSpeed, self._linearShoot, 3 * math.pi/180)
	self._send.passPos(self._targetRobot, self._shootPos)

	debug.set("targetRobot", self._targetRobot.id)
	debug.set("in the run", self._inTheRun)
	debug.set("chip", not self._linearShoot)
	vis.addCircle("t/pass: ShootPos", self._shootPos, 0.1, vis.colors.blue, true)
end

return Pass
