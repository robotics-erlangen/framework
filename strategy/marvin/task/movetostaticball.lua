local MoveToStaticBall = Class("Task.MoveToStaticBall", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function MoveToStaticBall:_init(rotation, distanceToBall)
	self._rotation = rotation or math.pi/2
	self._distanceToBall = distanceToBall or 0.03
end

function MoveToStaticBall:run()
	local absDistToBall = self._distanceToBall + self._robot.radius + World.Ball.radius
	local pos = World.Ball.pos - Vector.fromAngle(self._rotation) * absDistToBall

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot.path:addCircle(World.Ball.pos.x, World.Ball.pos.y,
		self._distanceToBall + World.Ball.radius, "StaticBall")

	self._robot.trajectory:update(ToTarget, pos, self._rotation)

	-- send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
end

return MoveToStaticBall
