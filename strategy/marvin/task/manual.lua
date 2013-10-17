local Manual = (require "../base/class").new("Task.Manual", require "task/catchball")

local Constants = require "../base/constants"
local World = require "../base/world"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Direct = require "trajectory/direct"

Manual.priority = 1

function Manual:_init()
end

function Manual:run()
	local input = self._robot.userControl

	if self._inbox.mainAttacker().trainer == self._robot then
		local t = Robot.minTimeToBall(self._robot, World.Ball)
		local futureBall = Ball.atTime(t, World.Ball)
		local speedAngleDiff = input.speed:absoluteAngleDiff(futureBall.pos - self._robot.pos)
		local magic = speedAngleDiff * input.speed:length()
		local viewAngleDiff = math.abs(self._robot.dir - (World.Ball.pos - self._robot.pos):angle())
		if Ball.friendlyBallOwner() ~= self._robot
			and ((self._cbactive
				and magic < 1 -- if the robot is about to catch the ball, or something like that
				and t < 0.5 -- if the ball can be catched quickly
				and viewAngleDiff < math.pi/2) or -- if the robot looks towards the ball
			(not self._cbactive
				and magic < 0.5
				and t < 0.3
				and viewAngleDiff < math.pi/1.5)) then
			self._cbactive = true
			self:_catchBall(World.Ball.pos*2 - self._robot.pos, Settings.shootDriveSpeed, Constants.positionError)
		else
			self._cbactive = false
			self._robot.trajectory:update(Direct, input.speed, nil, input.omega)
		end
	else
		self._robot.trajectory:update(Direct, input.speed, nil, input.omega)
	end
	

end

return Manual
