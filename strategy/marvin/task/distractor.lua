local Distractor = (require "../base/class").new("Task.Distractor", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"

Distractor.priority = 3

local distractionX = {0.8, 1.0, 1.2}
local distractionY = {2.0, 2.2, 2.4}

function Distractor:_init()
end

function Distractor:run()
	local indices = {}
	for _, index in pairs(self._inbox.distractedIndex()) do
		indices[index] = true
	end
	local targetIndex = 1
	while indices[targetIndex] do
		targetIndex = targetIndex + 1
	end
	if targetIndex > #distractionX then
		error("too many distractors / too few distraction positions")
	end
	
	self._index = targetIndex
	self._targetPos = Vector.create((World.Ball.pos.x > 0 and -1 or 1) * distractionX[self._index], distractionY[self._index])

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._preferredDir = (World.Geometry.OpponentGoal - self._targetPos):angle()
	self._robot.trajectory:update(ToTarget, self._targetPos, self._preferredDir)
	
	self._send("all").distractedIndex(self._index)
end

return Distractor
