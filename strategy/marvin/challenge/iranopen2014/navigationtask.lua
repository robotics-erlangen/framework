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
	local leftRating = 0
	local rightRating = 0
	if self._clockwise then
		if self._state == "horizontal" and self._robot.pos.y <= 0 then
			self._moveDest = outerLowerLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			leftRating = 1
			if self._inbox.navChallengeLeft().trainer == self._robot then		
				self._moveDest = outerUpperLeftCorner
			end
			self:checkAndUpdateTarget()
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = outerUpperRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x > 0 then
			rightRating = 1
			if self._inbox.navChallengeRight().trainer == self._robot then
				self._moveDest = outerLowerRightCorner
			end
			self:checkAndUpdateTarget()
		else
			error("invalid state")
		end
	else
		if self._state == "horizontal" and self._robot.pos.y <= 0 then
			self._moveDest = innerLowerRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x > 0 then
			rightRating = 1
			if self._inbox.navChallengeRight().trainer == self._robot then
				self._moveDest = innerUpperRightCorner
			end
			self:checkAndUpdateTarget()
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = innerUpperLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			leftRating = 1
			if self._inbox.navChallengeLeft().trainer == self._robot then
				self._moveDest = innerLowerLeftCorner
			end
			self:checkAndUpdateTarget()
		else
			error("invalid state")
		end
	end
	self._send("trainer").specialRole({ navChallengeLeft = leftRating })
	self._send("trainer").specialRole({ navChallengeRight = rightRating })

	self._robot.path:setDefaultObstacles(self._robot, true, true, true)
	self._robot.path:addRobotObstacles(self._robot)

	local lineWidth = 2*self._robot.radius -- for obstacle lines
	
	-- middle area
	local middleDist = 1.05 -- bigger means smaller corridor
	local corners = { 
		Vector.create(-g.FieldWidthHalf+middleDist, -g.FieldHeightHalf+middleDist),
		Vector.create(-g.FieldWidthHalf+middleDist, g.FieldHeightHalf-middleDist),
		Vector.create(g.FieldWidthHalf-middleDist, g.FieldHeightHalf-middleDist),
		Vector.create(g.FieldWidthHalf-middleDist, -g.FieldHeightHalf+middleDist)
	}
	self._robot.path:addLine(corners[1].x + lineWidth/2, corners[1].y + lineWidth/2,
		corners[2].x + lineWidth/2, corners[2].y - lineWidth/2, lineWidth)
	self._robot.path:addLine(corners[1].x + lineWidth/2, corners[1].y + lineWidth/2,
		corners[4].x - lineWidth/2, corners[4].y + lineWidth/2, lineWidth)
	self._robot.path:addLine(corners[3].x - lineWidth/2, corners[3].y - lineWidth/2,
		corners[2].x + lineWidth/2, corners[2].y - lineWidth/2, 2*self._robot.radius)
	self._robot.path:addLine(corners[3].x - lineWidth/2, corners[3].y - lineWidth/2,
		corners[4].x - lineWidth/2, corners[4].y + lineWidth/2, 2*self._robot.radius)
	self._robot.path:addRect(corners[1].x, corners[1].y, corners[3].x, corners[3].y)
	
	vis.addPolygon("NavigationObstacle", corners, vis.colors.red, true)

	-- field boarders
	self._robot.path:addLine(-g.FieldWidthHalf-lineWidth/2, -g.FieldHeightHalf-lineWidth/2,
		-g.FieldWidthHalf-lineWidth/2, g.FieldHeightHalf+lineWidth/2, lineWidth)
	self._robot.path:addLine(g.FieldWidthHalf+lineWidth/2, -g.FieldHeightHalf-lineWidth/2,
		g.FieldWidthHalf+lineWidth/2, g.FieldHeightHalf+lineWidth/2, lineWidth)
	self._robot.path:addLine(-g.FieldWidthHalf-lineWidth/2, -g.FieldHeightHalf-lineWidth/2,
		g.FieldWidthHalf+lineWidth/2, -g.FieldHeightHalf-lineWidth/2, lineWidth)
	self._robot.path:addLine(-g.FieldWidthHalf-lineWidth/2, g.FieldHeightHalf+lineWidth/2,
		g.FieldWidthHalf+lineWidth/2, g.FieldHeightHalf+lineWidth/2, lineWidth)

	self._robot.trajectory:update(ToTarget, self._moveDest, (self._moveDest - self._robot.pos):angle(), 1)
end

return Navigation
