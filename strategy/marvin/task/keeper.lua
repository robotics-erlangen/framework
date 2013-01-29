local Keeper = (require "../base/class").new("Task.Keeper", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local geom = require "../base/geom"
local Settings = require "settings"
local vis = require "../base/vis"

Keeper.priority = 6

function Keeper:_init()
end

--moves keeper do defending possition
function Keeper:_run(priorityMessages, notifications)
	--TODO: add obstacles if outside keeper area
	local goalLinePos = Vector.create(0 ,World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance + self._robot.radius)
	local goalLineDir = Vector.create(1,0)
	local atkPos, atkDir, isShot = Goal.predictShot()
	atkPos = atkPos:copy()
	atkDir = atkDir:copy():setLength(30)
	local intersectPos = geom.intersectLineLine(atkPos, atkDir, goalLinePos, goalLineDir)
	
	--visualization Tool
	vis.addPath("KeeperShotPrediction",{atkPos,atkPos+atkDir})
	vis.addPath("KeeperGoalLineIntersect",{intersectPos,atkPos})
	
	-- ignore goal walls if ball is shot
	self._robot.path:setDefaultObstacles(self._robot, true, isShot)
	
	local moveTo
	--Defending possition if ball is allready shot: shortest way to stop the ball
	if isShot and atkDir.y < 0 and math.abs(intersectPos.x) < World.Geometry.GoalWidth / 2 then
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir)
		moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--Defending possition to block possible Goal shots: Moves along a straight line in front of the goal: distance to goal: Settings.keeperGoalDistance
	elseif atkDir.y < 0 then
			moveTo = intersectPos
			moveTo.x = math.bound(-World.Geometry.GoalWidth / 2, moveTo.x, World.Geometry.GoalWidth / 2) --don't move out of the goal
	--Standart Position if no Goal-Shot is expected
	else
			moveTo = goalLinePos
	end
	local faceBall = World.Ball.pos-moveTo
	self._robot.trajectory:update(ToTarget, moveTo, faceBall:angle())
end

local inst = nil
function Keeper.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		inst = inst or Keeper.create(robot)
		return inst
	else
		inst = nil
	end
end

return Keeper
