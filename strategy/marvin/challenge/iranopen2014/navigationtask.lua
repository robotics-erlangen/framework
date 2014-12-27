local Navigation = Class("Task.NavigationChallenge", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local debug = require "../base/debug"
local vis = require "../base/vis"

Navigation.priority = 5 -- no meaning

local g = World.Geometry
local targetSwitchDist = 0.4
local outerGoalOutDist = 0.3
local innerGoalOutDist = 0.6
local outerBoarderDist = 0.3
local innerBoarderDist = 0.5
local outerLowerLeftCorner = Vector(-g.FieldWidthHalf + outerBoarderDist, -g.FieldHeightHalf + outerGoalOutDist)
local outerUpperLeftCorner = Vector(-g.FieldWidthHalf + outerBoarderDist, g.FieldHeightHalf - outerGoalOutDist)
local outerUpperRightCorner = Vector(g.FieldWidthHalf - outerBoarderDist, g.FieldHeightHalf - outerGoalOutDist)
local outerLowerRightCorner = Vector(g.FieldWidthHalf - outerBoarderDist, -g.FieldHeightHalf + outerGoalOutDist)
local innerLowerRightCorner = Vector(g.FieldWidthHalf - 1 + innerBoarderDist, -g.FieldHeightHalf + innerGoalOutDist)
local innerUpperRightCorner = Vector(g.FieldWidthHalf - 1 + innerBoarderDist, g.FieldHeightHalf - innerGoalOutDist)
local innerUpperLeftCorner = Vector(-g.FieldWidthHalf + 1 - innerBoarderDist, g.FieldHeightHalf - innerGoalOutDist)
local innerLowerLeftCorner = Vector(-g.FieldWidthHalf + 1 - innerBoarderDist, -g.FieldHeightHalf + innerGoalOutDist)

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
	debug.set("state", self._state)
	debug.set("moveDest", self._moveDest)
	local leftRating = 0
	local rightRating = 0
	if self._clockwise then
		if self._state == "horizontal" and self._robot.pos.y <= 0 then
			self._moveDest = outerLowerLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			leftRating = 1
			if self._inbox.navChallengeLeft().trainer == self._robot then
				self._moveDest = innerUpperLeftCorner
				self:checkAndUpdateTarget()
			end
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = innerUpperRightCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x > 0 then
			rightRating = 1
			if self._inbox.navChallengeRight().trainer == self._robot then
				self._moveDest = outerLowerRightCorner
				self:checkAndUpdateTarget()
			end
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
				self._moveDest = outerUpperRightCorner
				self:checkAndUpdateTarget()
			end
		elseif self._state == "horizontal" and self._robot.pos.y > 0 then
			self._moveDest = outerUpperLeftCorner
			self:checkAndUpdateTarget()
		elseif self._state == "vertical" and self._robot.pos.x <= 0 then
			leftRating = 1
			if self._inbox.navChallengeLeft().trainer == self._robot then
				self._moveDest = innerLowerLeftCorner
				self:checkAndUpdateTarget()
			end
		else
			error("invalid state")
		end
	end
	self._send("trainer").exclusiveRole({ navChallengeLeft = leftRating })
	self._send("trainer").exclusiveRole({ navChallengeRight = rightRating })

	self._robot.path:setDefaultObstacles(self._robot, true, true, true)
	self._robot.path:addRobotObstacles(self._robot)

	for t = -0.1, 0.31, 0.2 do
		for _,r in pairs(World.OpponentRobots) do
			local fpos = r.pos + r.speed * t
			self._robot.path:addCircle(fpos.x, fpos.y, 0.12)
			vis.addCircle("NavigationRobots", fpos, 0.12, vis.fromRGBA(127, 191, 255, 32), true)
		end
	end


	local lineWidth = 2*self._robot.radius -- for obstacle lines

	-- middle area
	local createRectObstacle = function(middleDistx, middleDisty, lineWidth)
		middleDistx = middleDistx - lineWidth
		middleDisty = middleDisty - lineWidth
		local corners = {
			Vector(-g.FieldWidthHalf+middleDistx, -g.FieldHeightHalf+middleDisty),
			Vector(-g.FieldWidthHalf+middleDistx, g.FieldHeightHalf-middleDisty),
			Vector(g.FieldWidthHalf-middleDistx, g.FieldHeightHalf-middleDisty),
			Vector(g.FieldWidthHalf-middleDistx, -g.FieldHeightHalf+middleDisty)
		}
		--self._robot.path:addRect(corners[1].x, corners[1].y, corners[3].x, corners[3].y)
		self._robot.path:addLine(corners[1].x,  corners[1].y, corners[2].x, corners[2].y, lineWidth)
		self._robot.path:addLine(corners[2].x,  corners[2].y, corners[3].x, corners[3].y, lineWidth)
		self._robot.path:addLine(corners[3].x,  corners[3].y, corners[4].x, corners[4].y, lineWidth)
		self._robot.path:addLine(corners[4].x,  corners[4].y, corners[1].x, corners[1].y, lineWidth)

		local viscorners = {
			Vector(-g.FieldWidthHalf+middleDistx-lineWidth, -g.FieldHeightHalf+middleDisty-lineWidth),
			Vector(-g.FieldWidthHalf+middleDistx-lineWidth, g.FieldHeightHalf-middleDisty+lineWidth),
			Vector(g.FieldWidthHalf-middleDistx+lineWidth, g.FieldHeightHalf-middleDisty+lineWidth),
			Vector(g.FieldWidthHalf-middleDistx+lineWidth, -g.FieldHeightHalf+middleDisty-lineWidth)
		}
		vis.addPolygon("NavigationObstacle", viscorners, vis.fromRGBA(255, 0, 0, 48), true)
	end

	createRectObstacle(0.55, 1.85, 0.1)
	createRectObstacle(1.05, 1.05, 0.1)

	local corridor = {
		Vector(-g.FieldWidthHalf+1, -g.FieldHeightHalf+1),
		Vector(-g.FieldWidthHalf+1, g.FieldHeightHalf-1),
		Vector(g.FieldWidthHalf-1, g.FieldHeightHalf-1),
		Vector(g.FieldWidthHalf-1, -g.FieldHeightHalf+1)
	}
	vis.addPolygon("NavigationObstacle", corridor, vis.colors.black, false)

	-- field borders
	self._robot.path:setBoundary( -g.FieldWidthHalf, -g.FieldHeightHalf,
			g.FieldWidthHalf, g.FieldHeightHalf)

	self._robot.trajectory:update(ToTarget, self._moveDest, (self._moveDest - self._robot.pos):angle(), 1)
end

return Navigation
