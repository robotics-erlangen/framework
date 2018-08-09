local SuggestPass = require "task/ability/suggestpass"
local Victory = Class("Task.Victory", require "task/base", SuggestPass)

local geom = require "../base/geom"
local ToTarget = require "trajectory/totarget"
local PathHelper = require "trajectory/pathhelper"

local NUM_OF_REVOLUTIONS = 3
local ANGULAR_SPEED_FACTOR = 0.8 // the higher it is, the longer it takes

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreGoals = true,
	ignoreDefenseArea = true
}

function Victory:_init(center, startingAngle, angle, radius)
	assert(center and angle, "Missing Parameters for Victory-Task")
	self._center = center
	self._centerAngle = startingAngle
	self._radius = radius

	self._state = "double circle"
	self._outerAngle = angle
	self._ticks = 1
	self._increment = true
end

function Victory:run()
	self._centerAngle = self._centerAngle + math.pi / (480*ANGULAR_SPEED_FACTOR)
	self._outerAngle = self._outerAngle + math.pi / (180 + self._ticks*180)*ANGULAR_SPEED_FACTOR
	local pos
	if self._state == "double circle" then
		local origin = Vector.fromAngle(self._centerAngle):setLength(self._radius / 2)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = math.abs(self._centerAngle) < NUM_OF_REVOLUTIONS * 2 * math.pi and "double circle" or "spiral prepare"
		if self._state == "spiral prepare" then
			self._ticks = 1
			self._increment = false
		end
	elseif self._state == "spiral prepare" then
		local origin = Vector.fromAngle(self._centerAngle):setLength((self._radius / 2) * self._ticks)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = self._ticks > 0 and "spiral prepare" or "spiral"
	elseif self._state == "spiral" then
		pos = self._center + Vector.fromAngle(self._outerAngle):setLength(self._radius - self._ticks * self._radius * 3/4)
		self._state = self._centerAngle > 2 * NUM_OF_REVOLUTIONS * 2 * math.pi and "double circle prepare" or "spiral"
		if self._state == "double circle prepare" then
			self._centerAngle = geom.normalizeAnglePositive(self._centerAngle)
			self._ticks = 0
			self._increment = true
		end
	elseif self._state == "double circle prepare" then
		local origin = Vector.fromAngle(self._centerAngle):setLength((self._radius / 2) * self._ticks)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = self._ticks > 1 and "double circle" or "double circle prepare"
	end

	if self._increment then
		self._ticks = self._ticks + 0.002
		self._increment = self._ticks < 1
	else
		self._ticks = self._ticks - 0.002
		self._increment = self._ticks < 0
	end
	self._robot.path:clearObstacles()
	local endSpeed = Vector(0, 0)
	local dir = (pos - self._robot.pos):angle()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir, 1, endSpeed)
end

return Victory
