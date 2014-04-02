local Navigation = (require "../base/class").new("Task.NavigationChallenge", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local debug = require "../base/debug"
local vis = require "../base/vis"

Navigation.priority = 5 -- no meaning

local g = World.Geometry
local targetSwitchDist = 0.4
local outerGoalOutDist = 0.3
local innerGoalOutDist = 0.7
local outerBoarderDist = 0.3
local innerBoarderDist = 0.3
local outerLowerLeftCorner = Vector.create(-g.FieldWidthHalf + outerBoarderDist, -g.FieldHeightHalf + outerGoalOutDist)
local outerUpperLeftCorner = Vector.create(-g.FieldWidthHalf + outerBoarderDist, g.FieldHeightHalf - outerGoalOutDist)
local outerUpperRightCorner = Vector.create(g.FieldWidthHalf - outerBoarderDist, g.FieldHeightHalf - outerGoalOutDist)
local outerLowerRightCorner = Vector.create(g.FieldWidthHalf - outerBoarderDist, -g.FieldHeightHalf + outerGoalOutDist)
local innerLowerRightCorner = Vector.create(g.FieldWidthHalf - 1 + innerBoarderDist, -g.FieldHeightHalf + innerGoalOutDist)
local innerUpperRightCorner = Vector.create(g.FieldWidthHalf - 1 + innerBoarderDist, g.FieldHeightHalf - innerGoalOutDist)
local innerUpperLeftCorner = Vector.create(-g.FieldWidthHalf + 1 - innerBoarderDist, g.FieldHeightHalf - innerGoalOutDist)
local innerLowerLeftCorner = Vector.create(-g.FieldWidthHalf + 1 - innerBoarderDist, -g.FieldHeightHalf + innerGoalOutDist)

function Navigation:_init()
	self._clockwise = true
	if self._robot ~= World.FriendlyRobots[1] then
		self._clockwise = false
	end
	self._state = "horizontal"
	self._moveDest = outerLowerLeftCorner
end

function Navigation:checkAndUpdateTarget()
	if self._robot.pos:distanceTo(self._moveDest) < targetSwitchDist then
		self._state = (self._state == "vertical") and "horizontal" or "vertical"
	end
end

function Navigation:run()
	debug.set("clockwise", self._clockwise)
	if self._clockwise then
		if self._state == "horizontal" and self._robot.pos.y <= 0 then
			self._moveDest = outerLowerLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			self._moveDest = outerUpperLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = outerUpperRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x > 0 then
			self._moveDest = outerLowerRightCorner
			self:checkAndUpdateTarget()
		else
			error("invalid state")
		end
	else
		if self._state == "horizontal" and self._robot.pos.y <= 0 then
			self._moveDest = innerLowerRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x > 0 then
			self._moveDest = innerUpperRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = innerUpperLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			self._moveDest = innerLowerLeftCorner
			self:checkAndUpdateTarget()
		else
			error("invalid state")
		end
	end

	self._robot.path:setDefaultObstacles(self._robot, true, true) -- FIXME: Forbids Defense Area!
	self._robot.path:addRobotObstacles(self._robot)
	local middleObstacle = { -g.FieldWidthHalf+1, -g.FieldHeightHalf+1, g.FieldWidthHalf-1, g.FieldHeightHalf-1 }
	self._robot.path:addRect(unpack(middleObstacle))
	self._robot.trajectory:update(ToTarget, self._moveDest, (self._moveDest - self._robot.pos):angle())
	
	local polygon = {
		Vector.create(middleObstacle[1], middleObstacle[2]),
		Vector.create(middleObstacle[1], middleObstacle[4]),
		Vector.create(middleObstacle[3], middleObstacle[4]),
		Vector.create(middleObstacle[3], middleObstacle[2])
	}
	vis.addPolygon("NavigationObstacle", polygon, vis.colors.red, true)
end

return Navigation
