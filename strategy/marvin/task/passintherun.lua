local PassInTheRun = (require "../base/class").new("Task.PassInTheRun", require "task/shoot")

local World = require "../base/world"
local Settings = require "settings"
local Shoot = require "observer/shoot"
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

function PassInTheRun:run()
	local passInTheRunSpeed = self._passSpeed
	local isShooting = self:_shoot(self._shootPos, passInTheRunSpeed, true)
	self._isShooting = self._isShooting or isShooting
	
	self._send(self._targetRobot).passSender("in the run")
	self._send(self._targetRobot).passPos(self._shootPos)
end

return PassInTheRun
