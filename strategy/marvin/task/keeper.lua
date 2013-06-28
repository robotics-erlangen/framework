local Keeper = (require "../base/class").new("Task.Keeper", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local geom = require "../base/geom"
local Settings = require "settings"
local vis = require "../base/vis"
local Field = require "util/field"

Keeper.priority = 6

function Keeper:_init()
	self._defendCorner = false
end

--moves keeper do defending possition
function Keeper:_run(priorityMessages, notifications)
	local atkPos, atkDir, isShot = Goal.predictShot()
	atkDir = atkDir:copy():setLength(30)
	local normalLine = false
	local goalLinePos = Vector.create(0, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
	local goalLineDir = Vector.create(1, 0)
	local side = math.sign(World.Ball.pos.x)
	if geom.checkTriangleOrientation(goalLinePos, goalLinePos + Vector.create(side, math.abs(side) / 2), World.Ball.pos) == -side then
		self._defendCorner = true
	elseif geom.checkTriangleOrientation(goalLinePos, goalLinePos + Vector.create(side, math.abs(side) / 2 + 0.2), World.Ball.pos) == side then
		self._defendCorner = false
	end
	if atkPos.x < -World.Geometry.GoalWidth / 2 and self._defendCorner then
		goalLinePos = Vector.create(-World.Geometry.GoalWidth / 2, World.Geometry.FriendlyGoal.y)
		goalLineDir = (World.Ball.pos - Vector.create(0, World.Geometry.FriendlyGoal.y)):perpendicular()
	elseif atkPos.x > World.Geometry.GoalWidth / 2 and self._defendCorner then
		goalLinePos = Vector.create(World.Geometry.GoalWidth / 2, World.Geometry.FriendlyGoal.y)
		goalLineDir = (Vector.create(0, World.Geometry.FriendlyGoal.y) - World.Ball.pos):perpendicular()
	else
		normalLine = true
	end
	local intersectPos = geom.intersectLineLine(atkPos, atkDir, goalLinePos, goalLineDir)
	
	-- ensure there's an intersect pos
	if atkDir.x > 0 then
		intersectPos = intersectPos or Vector.create(World.Geometry.GoalWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
	else
		intersectPos = intersectPos or Vector.create(-World.Geometry.GoalWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
	end
	
	--visualization Tool
	vis.addPath("KeeperShotPrediction",{atkPos,atkPos+atkDir})
	vis.addPath("KeeperGoalLineIntersect",{intersectPos,atkPos})
	vis.addPath("KeeperGoalLine",{goalLinePos,goalLinePos + goalLineDir})
	
	--add obstacles if outside keeper area
	if not Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		self._robot.path:addRobotObstacles(self._robot, false, false)
	end
	-- ignore goal walls if ball is shot
	self._robot.path:setDefaultObstacles(self._robot, true, isShot)
	
	local moveTo
	--defending possition if ball is allready shot: shortest way to stop the ball
	if isShot and atkDir.y < 0 and math.abs(intersectPos.x) < World.Geometry.GoalWidth / 2 then
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir):copy()
		moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--defending possition to block possible Goal shots: moves along a straight line in front of the goal: distance to goal: Settings.keeperGoalDistance
	elseif atkDir.y < 0 then
		moveTo = intersectPos
	--standard position if no Goal-Shot is expected
	elseif (atkDir.y >= 0) and isShot then
		moveTo = self._robot.pos
	else
		moveTo = goalLinePos
	end
	if not normalLine then
		local dist = goalLinePos:distanceTo(moveTo)
		local otherGoalEdge = Vector.create(-goalLinePos.x, goalLinePos.y)
		local otherLineEnd = (otherGoalEdge:orthogonalProjection(goalLinePos, goalLinePos + goalLineDir)) - goalLineDir:copy():setLength(self._robot.radius)
		if dist < self._robot.radius and not (atkDir.y >= 0) then
			moveTo = moveTo + goalLineDir:copy():setLength(self._robot.radius - dist)
		elseif otherLineEnd.y < moveTo.y or atkDir.y >= 0 then
			moveTo = otherLineEnd
		end
	end

	local southBound = -World.Geometry.GoalWidth / 2
	local northBound = World.Geometry.GoalWidth / 2
	if normalLine then
		local intersectLineP1 = Vector.create(-World.Geometry.FieldWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
		local intersectLineP2 = Vector.create(World.Geometry.FieldWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
		local goalEdgeSouth = Vector.create(-World.Geometry.GoalWidth / 2, World.Geometry.FriendlyGoal.y)
		local goalEdgeNorth = Vector.create(World.Geometry.GoalWidth / 2, World.Geometry.FriendlyGoal.y)
		local intersectSouth = geom.intersectLinesByPoints(intersectLineP1, intersectLineP2, goalEdgeSouth, World.Ball.pos)
		local intersectNorth = geom.intersectLinesByPoints(intersectLineP1, intersectLineP2, goalEdgeNorth, World.Ball.pos)
		local angleSouth = (World.Ball.pos - goalEdgeSouth):angle()
		local angleNorth = math.pi-(World.Ball.pos - goalEdgeNorth):angle()
		if angleSouth < math.pi / 2 then
			southBound = (intersectSouth.x + (self._robot.radius / math.sin(angleSouth))) - 0.05
		end
		if angleNorth < math.pi / 2 then
			northBound = (intersectNorth.x - (self._robot.radius / math.sin(angleNorth))) + 0.05
		end
	end
	moveTo.x = math.bound(southBound, moveTo.x, northBound) --don't move out of the goal
	
	--keeper don't have to go out so far if penality
	if World.RefereeState == "PenaltyDefensive" or World.RefereeState == "PenaltyDefensivePrepare" and not isShot then
		moveTo.x = math.bound((-World.Geometry.GoalWidth / 2) + self._robot.radius + (World.Ball.radius), moveTo.x, (World.Geometry.GoalWidth / 2) - self._robot.radius - (World.Ball.radius))
	end
	--bound at goal edges
	moveTo.y = math.bound(World.Geometry.FriendlyGoal.y + self._robot.radius, moveTo.y, 0)
	if normalLine and (moveTo.x < -World.Geometry.GoalWidth / 2 + Settings.keeperGoalDistance or moveTo.x > World.Geometry.GoalWidth / 2 - Settings.keeperGoalDistance) then
		moveTo.y = moveTo.y - (math.abs(moveTo.x) - (World.Geometry.GoalWidth / 2 - Settings.keeperGoalDistance))
	end
	
	local faceBall = World.Ball.pos-moveTo
	self._robot.trajectory:update(ToTarget, moveTo, faceBall:angle())
end

function Keeper:_rate()
	return self._robot == World.FriendlyKeeper and 1 or 0
end

function Keeper.factory(position)
	local f = function (robots)
		return Keeper.create(robots[position])
	end
	return f
end

function Keeper.test(id)
	if id > 0 then
		return nil
	end
	return Keeper.factory(1), 1
end

return Keeper
