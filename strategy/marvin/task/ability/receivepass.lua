local ReceivePass = {}

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local debug = require "../base/debug"
local CatchBall = require "task/ability/catchball"

ReceivePass.depends = { CatchBall }

function ReceivePass:_receivePass()
	local perpPos = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	local moveTime = Robot.sidewardsTime(self._robot, World.Ball)
	local ballTime = Ball.ballRollTime(World.Ball.speed:length(), (perpPos-World.Ball.pos):length())
	local safety = 0.2
	local perpenticularSuccesfull = (moveTime and ballTime) and moveTime + safety < ballTime or false

	-- block ball by moving in its way
	if World.Ball.speed:length() > Settings.fastBall and perpenticularSuccesfull then
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
		local faceBall = (World.Ball.pos-self._robot.pos):angle()
		self._robot.trajectory:update(ToTarget, perpPos, faceBall)
		self._send.moveDest("all", perpPos)

		-- send the position where the is catched
		self._send.attackPosition("all", perpPos +
				Vector.fromAngle(faceBall) * (self._robot.shootRadius + World.Ball.radius))

		self._robot:setDribblerSpeed(0.2)
	else
		self:_catchBall(World.Ball.pos)
	end
end

return ReceivePass
