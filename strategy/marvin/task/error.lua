local Error = Class("Task.Error", require "task/base")
local World = require "../base/world"
local Direct = require "trajectory/direct"
local ToTarget = require "trajectory/totarget"
local PathHelper = require "trajectory/pathhelper"
local G = World.Geometry

-- [robotId] => (firstLocationId, secoundLocationId)
local EXCHANGE_TARGET = {{firstPosI = 0, secPosI = 17},
						{firstPosI = 1, secPosI = 16},
						{firstPosI = 2, secPosI = 15},
						{firstPosI = 3, secPosI = 14},
						{firstPosI = 4, secPosI = 13},
						{firstPosI = 5, secPosI = 12},
						{firstPosI = 6, secPosI = 23},
						{firstPosI = 7, secPosI = 22},
						{firstPosI = 8, secPosI = 21},
						{firstPosI = 9, secPosI = 20},
						{firstPosI = 10,secPosI = 19},
						{firstPosI = 11,secPosI = 18}}
local X0 = -1
local B = 0.33
local L = 0.25

function Error:_init()
	self._id = EXCHANGE_TARGET[self._robot.id+1].firstPosI
	self._goToTopBlock = false
	self._startRotate = nil
end

function Error:run()
	amun.setRobotExchangeSymbol(self._robot.generation, self._robot.id,true)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {ignorePass = true})

	local y0
	if self._goToTopBlock then
		y0 = G.FieldWidthHalf - 1
	else
		y0 = -G.FieldWidthHalf
	end
	-- check Ball
	if self._goToTopBlock and
			G.FieldWidthHalf-1.5 < World.Ball.pos.x  and World.Ball.pos.x < G.FieldWidthHalf+0.5 and
			-1.5< World.Ball.pos.y and World.Ball.pos.y < 1.5  then
		y0 = G.FieldWidthHalf * (-1)
		self._goToTopBlock = false
	elseif not self._goToTopBlock and
			-G.FieldWidthHalf+1.5 > World.Ball.pos.x and World.Ball.pos.x > -G.FieldWidthHalf-0.5 and
			-1.5 < World.Ball.pos.y and World.Ball.pos.y < 1.5  then
		y0 = G.FieldWidthHalf - 1
		self._goToTopBlock = true
	end
	local xi = X0 + B * math.fmod(self._id, 6) + B/2
	local yi = y0 + L * math.floor(self._id/6) + L/2
	local toPos = Vector(yi,xi)
	for _, r in ipairs(World.Robots) do
		if self._robot ~= r and r.pos:distanceTo(toPos) < self._robot.radius then
			self._id = (self._id == EXCHANGE_TARGET[self._robot.id+1].firstPosI) and
				EXCHANGE_TARGET[self._robot.id+1].secPosI or EXCHANGE_TARGET[self._robot.id+1].firstPosI
			xi = X0 + B * math.fmod(self._id, 6) + B/2
			yi = y0 + L * math.floor(self._id/6) + L/2
			toPos = Vector(yi,xi)
		end
	end
	if self._robot.pos:distanceTo(toPos) > 0.05 then
		self._robot.trajectory:update(ToTarget,toPos, 0)
	elseif self._startRotate == nil then
		self._startRotate = World.Time
	elseif self._startRotate and World.Time - self._startRotate < 1 then
		self._robot.trajectory:update(Direct, Vector(0, 0), nil, 2*math.pi)
	end
end

return Error
