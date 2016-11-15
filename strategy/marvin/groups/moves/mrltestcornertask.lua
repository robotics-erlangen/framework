local SuggestPass = require "task/ability/suggestpass"
local MrlTestCornerTask = Class("Group.Move.MrlCorner.MrlTestCornerTask", require "task/base", SuggestPass)

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Physics = require "observer/physics"
local G = World.Geometry

function MrlTestCornerTask:_init(initPos, ballOwner)
	self._moveDest = initPos
	self._ballOwner = ballOwner
end

function MrlTestCornerTask:run()
	if self._ballOwner then
		local travelTime = Physics.robotTimeToPos(self._robot, self._moveDest, Vector(0,0), false, false)
		self._send.passSuggestion(self._ballOwner,
			{ rating = 1, pos = self._moveDest, time = travelTime+World.Time })
	end
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot.trajectory:update(ToTarget, self._moveDest , (World.Ball.pos - self._robot.pos):angle())
end

return MrlTestCornerTask
