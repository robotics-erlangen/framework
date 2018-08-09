local CatchBall = require "task/ability/catchball"
local SuggestPass = require "task/ability/suggestpass"
local Dribble = Class("Task.Dribble", require "task/base", SuggestPass, CatchBall)

local World = require "../base/world"
local Physics = require "observer/physics"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

// Warning: This task has some very strict precoditions.
// 1. It will only work if you have the ball in the dribbler at the start
// 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}):absoluteAngleDiff(viewDir) is pretty small

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true
}
function Dribble:_init(pos, suggestPass, endSpeedLength)
	self._pos = pos
	self._dir = (pos - self._robot.pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength or 0
end

function Dribble:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(0.7)

	local time
	if World.Ball.pos:distanceTo(self._robot.pos) > self._robot.radius + World.Ball.radius + 0.05 then
		local catchTime = self:_catchBall(self._pos, 0)
		time = catchTime + Physics.robotTimeToPos(self._robot, self._pos, Vector(0, 0))
	else
		local endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
		local _; _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, 1.0, endSpeed, nil, true)
	end


	if self._suggestPassFlag then
		self:_suggestPass(self._pos, nil, time)
	end
end

return Dribble
