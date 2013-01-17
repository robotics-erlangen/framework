local CatchBall = (require "../base/class").new("Task.CatchBall", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"

-- the robot may drive with up to maxEndSpeed or ballSpeed when it catches the ball, depending on which of both is higher
function CatchBall:_catchBall(targetPos, maxEndSpeed)
	if self._catchTime then
		self._catchTime = math.max(0, self._catchTime - World.TimeDiff)
	else
		self._catchTime = self._robot.pos:distanceTo(World.Ball.pos) / self._robot.maxSpeed -- TODO: better estimation
	end
	
	local predictedBall = Ball.atTime(self._catchTime)
	local moveDest = predictedBall.pos + (predictedBall.pos - targetPos):setLength(self._robot.radius + World.Ball.radius)
	local viewDir = (targetPos - predictedBall.pos):angle()
	
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius, "predicted ball")
	self._robot.path:addRobotObstacles(self._robot)
	
	local dest, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir)
	self._catchTime = time
	-- TODO better obstacles from wopr movetoball
	-- TODO Wegpunkt für Roboter nachführen, damit wenn auf den Roboter geschossen wird, der nicht abhaut
end

return CatchBall
