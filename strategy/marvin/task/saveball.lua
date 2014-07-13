local Shoot = require "task/ability/shoot"
local SaveBall = (require "../base/class").newTask("Task.SaveBall", require "task/base", Shoot)

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Field = require "util/field"
local ToTarget = require "trajectory/totarget"

local chipImpactDistFromBoarder = 0.1
local leftMiddlePoint = Vector.create(-World.Geometry.FieldWidthHalf, 0)
local rightMiddlePoint = -leftMiddlePoint
local touchLineDir = Vector.create(0, 1)

function SaveBall:run()
	local ballPos = World.Ball.pos
	local ownGoal = World.Geometry.FriendlyGoal
	local moveDest = Ball.toBall(self._robot, World.Ball)
	moveDest = moveDest + (self._robot.pos - moveDest):setLength(World.Ball.radius)
	if ballPos:distanceTo(ownGoal) < self._robot.pos:distanceTo(ownGoal) then
		-- get between ball and goal
		local ballDist = self._robot.radius + Settings.positionPadding
		moveDest = ballPos + (ownGoal - ballPos):setLength(ballDist)
		moveDest = Field.limitToAllowedField(moveDest, self._robot.radius, true)
	end

	local viewDir = (World.Ball.pos - self._robot.pos):angle()
	if viewDir > 0 and viewDir < math.pi then
		local robotDir = ballPos - self._robot.pos
		local touchLineIntersection, lambda = geom.intersectLineLine(ballPos, robotDir, leftMiddlePoint, touchLineDir)
		if lambda and lambda < 0 then -- behind me
			touchLineIntersection, lambda = geom.intersectLineLine(ballPos, robotDir, rightMiddlePoint, touchLineDir)
			if lambda and lambda < 0 then -- behind me
				touchLineIntersection = nil
			end
		end
		local middleLineIntersection = geom.intersectLineLine(ballPos, robotDir, leftMiddlePoint, leftMiddlePoint-rightMiddlePoint)
		local chipPos = middleLineIntersection
		if chipPos and touchLineIntersection then
			if self._robot.pos:distanceTo(touchLineIntersection) < self._robot.pos:distanceTo(chipPos) then
				chipPos = touchLineIntersection
			end
		else
			chipPos = touchLineIntersection
		end
		if not chipPos then
			log("Warning: Probably a calculation mistake of chipPos in SaveBall task")
			chipPos = World.Geometry.OpponentGoal
		end
		vis.addCircle("t/saveball/chipPos", chipPos, 0.1, vis.colors.blue, true)
		local chipDist = World.Ball.pos:distanceTo(chipPos)  - chipImpactDistFromBoarder
		self._robot:chip(chipDist)
	end

	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)

	local endSpeed = Vector.fromAngle(viewDir) * 0.5
	self._robot.trajectory:update(ToTarget, moveDest, viewDir, nil, endSpeed)
end

return SaveBall
