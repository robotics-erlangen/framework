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
	self._defendShortCorner = false
end

--moves keeper do defending possition
function Keeper:_run(priorityMessages, notifications)	
	local goalLinePos = Vector.create(0, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
	local goalLineDir = Vector.create(1, 0)
	local atkPos, atkDir, isShot = Goal.predictShot()
	atkPos = atkPos:copy()
	atkDir = atkDir:copy():setLength(30)
	local intersectPos = geom.intersectLineLine(atkPos, atkDir, goalLinePos, goalLineDir)
	if not intersectPos then -- ensure there's an intersect pos
		if atkDir.x > 0 then
			intersectPos = intersectPos or Vector.create(World.Geometry.GoalWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
		else
			intersectPos = intersectPos or Vector.create(-World.Geometry.GoalWidth, World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
		end
	end
	
	--visualization Tool
	vis.addPath("KeeperShotPrediction",{atkPos,atkPos+atkDir})
	vis.addPath("KeeperGoalLineIntersect",{intersectPos,atkPos})
	
	--add obstacles if outside keeper area
	if not Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		self._robot.path:addRobotObstacles(self._robot, false, false)
	end
	-- ignore goal walls if ball is shot
	self._robot.path:setDefaultObstacles(self._robot, true, isShot)
	
	
	if math.abs(World.Ball.pos.x) > World.Geometry.GoalWidth / 2 then
		-- check whether we should defend the short corner
		local side = math.sign(World.Ball.pos.x)
		local shortCorner = Vector.create(side * World.Geometry.GoalWidth/2,
				World.Geometry.FriendlyGoal.y + self._robot.radius)
		local otherGoalPost = (side > 0) and World.Geometry.FriendlyGoalLeft or World.Geometry.FriendlyGoalRight
		
		-- tangent from other corner over robot towards the ball
		local innerTangent1, innerTangent2 = geom.getTangentsToCircle(otherGoalPost, shortCorner, self._robot.radius)
		local innerTangent = (innerTangent1.y > innerTangent2.y) and innerTangent1 or innerTangent2
		
		-- get tangent point inside the field
		local outerTangent1, outerTangent2 = geom.getTangentsToCircle(otherGoalPost, shortCorner,
				self._robot.radius + World.Ball.radius)
		local outerTangent = (outerTangent1.y > outerTangent2.y) and outerTangent1 or outerTangent2
		
		-- cw(-1) if ball is on the right of the goal, ccw(1) if on the left
		-- check if we can block the whole goal by staying in the short angle
		if geom.checkTriangleOrientation(otherGoalPost, innerTangent, World.Ball.pos) == -side then
			self._defendShortCorner = true
		-- ccw(1) if ball is on the right of the goal, cw(-1) if on the left
		-- blocking the whole goal is not possible
		elseif geom.checkTriangleOrientation(otherGoalPost, outerTangent, World.Ball.pos) == side then
			self._defendShortCorner = false
		end
	end
	
	local moveTo
	--defending possition if ball is allready shot: shortest way to stop the ball
	if isShot and atkDir.y < 0 and math.abs(intersectPos.x) < World.Geometry.GoalWidth / 2 then
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir)
		moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--defending possition to block possible Goal shots: moves along a straight line in front of the goal: distance to goal: Settings.keeperGoalDistance
	elseif atkDir.y < 0 then
		moveTo = intersectPos
		moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--standard position if no Goal-Shot is expected
		if self._defendShortCorner then
			moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, World.Ball.pos.x, World.Geometry.GoalWidth / 2)
		end
	else
		moveTo = goalLinePos
		if self._defendShortCorner then
			moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, World.Ball.pos.x, World.Geometry.GoalWidth / 2)
		end
	end
	
	--bound at goal edges
	if World.RefereeState == "PenaltyDefensive" or World.RefereeState == "PenaltyDefensivePrepare" then
		moveTo.x = math.bound((-World.Geometry.GoalWidth / 2) + self._robot.radius, moveTo.x, (World.Geometry.GoalWidth / 2) - self._robot.radius)
	elseif moveTo.x < -World.Geometry.GoalWidth / 2 + Settings.keeperGoalDistance or moveTo.x > World.Geometry.GoalWidth / 2 - Settings.keeperGoalDistance then
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
