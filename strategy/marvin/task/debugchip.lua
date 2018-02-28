local Shoot = require "task/ability/shoot"
local DebugChip = Class("Task.DebugChip", require "task/base", Shoot)

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"


function DebugChip:_init(pos, distance)
	assert(distance, "How long should I chip?")
	self._timer = 200
	self._pos = pos
	self._distance = distance
	self._wasShot = false
	self._obstacleTable = {
	ignoreBall = true,
	ignoreGoals = true,
	ignoreDefenseArea = true,
	ignoreOpponentDefenseArea = true,
	}
end

function DebugChip:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, self._obstacleTable)

	if Ball.isShot() then
		self._wasShot = true
	end

	local target = self._robot.pos + World.Ball.pos:copy():setLength(self._distance) * -1
	if self._wasShot or self._timer > 0 then--self._robot.pos:distanceTo(self._pos) > 0.15 then
		self._robot.trajectory:update(ToTarget, self._pos, math.pi/2, nil, Vector(0,0))
		self._timer = self._timer - 1
	else
		self:_chipToPos(target, nil, nil)
	end

end

return DebugChip
