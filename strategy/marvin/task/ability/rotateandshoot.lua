local RotateAndShoot = {}

local Direct = require "trajectory/direct"
local World = require "../base/world"

local toBallMovementF = 2.0 -- [m/s]
local toBallMovementS = 2.2 -- [m/s]
local rotationSpeed = 0.5 * (2*math.pi) -- [rad/s]
local shootActivationAngle = 8 * math.pi/180 -- [rad]
local forwardActivationAngle = 30 * math.pi/180 -- [rad]

function RotateAndShoot:_rotateAndShoot(destAngle)
	-- 1 when rotating ccw, -1 when rotating cw
	local invert = self._robot.dir < destAngle and 1 or -1
	local toBall = (World.Ball.pos - self._robot.pos):normalize()
	local move = toBall:copy():perpendicular() * (toBallMovementS * invert)
	if math.abs(self._robot.dir - destAngle) < forwardActivationAngle then
		move = move + toBall * toBallMovementF
	end


	local rotate = rotationSpeed * invert
	self._robot.trajectory:update(Direct, move, nil, rotate)

	if math.abs(self._robot.dir - destAngle) < shootActivationAngle then
		self._robot:shoot(math.huge, 1)
	end

	self._robot:setDribblerSpeed(1)
end

return RotateAndShoot