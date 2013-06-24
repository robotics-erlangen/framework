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
	if Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) == false then
	self._robot.path:addRobotObstacles(self._robot, false, false)
	end
	-- ignore goal walls if ball is shot
	self._robot.path:setDefaultObstacles(self._robot, true, isShot)
	
	local moveTo
	--defending possition if ball is allready shot: shortest way to stop the ball
	if isShot and atkDir.y < 0 and math.abs(intersectPos.x) < World.Geometry.GoalWidth / 2 then
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir)
		moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--defending possition to block possible Goal shots: moves along a straight line in front of the goal: distance to goal: Settings.keeperGoalDistance
	elseif atkDir.y < 0 then
			moveTo = intersectPos
			moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--standart possition if no Goal-Shot is expected
	else
			moveTo = goalLinePos
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
