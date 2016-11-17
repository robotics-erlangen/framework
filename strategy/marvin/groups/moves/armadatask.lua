local SuggestPass = require "task/ability/suggestpass"
local ArmadaTask = Class("Group.Move.Armada.ArmadaTask", require "task/base", SuggestPass)

local debug = require "../base/debug"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local G = World.Geometry

function ArmadaTask:_init(posIndex, circleCenter, target)
	self._posIndex = posIndex
	self._moveDest = nil
	self._circleCenter = circleCenter
	self._target = target
end

function ArmadaTask:_pointOnCircle()
	local angle = (World.Time % 1000) % (math.pi*2)
	local individualAngle = angle + (math.pi/2)*self._posIndex
	local pos = self._circleCenter + Vector.fromAngle(individualAngle)*0.5
	return pos
end

function ArmadaTask:run()
	debug.set("posIndex" , self._posIndex)
	if World.RefereeState == "Stop" then
		self._moveDest = self:_pointOnCircle()
	else -- Direct or Indirect Freekick
		self._moveDest = self._target
		self:_suggestPass(self._moveDest)
	end
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot.trajectory:update(ToTarget, self._moveDest , (World.Ball.pos - self._robot.pos):angle())
end

return ArmadaTask
