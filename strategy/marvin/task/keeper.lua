local keeper = (require "../base/class").new("Task.keeper", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local geom = require "../base/geom"

Base.priority = 6

function keeper:_init()

end

--moves keeper do defending possition
function keeper:_run(priorityMessages, notifications)
	local atkPos, atkDir, isShot = Observer.--todo predictShot
	--Defending possition if ball is allready shot: shortest way to stop the ball
	if isShot then
		local movTo = geom.nearestPosOnLine(self._roboter.pos, atkPos, atkPos+atkDir)
		local faceBall = World.Ball.Pos-movTo
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	--Defending possition to block possible Goal shots: Moves along a straigt line in front of the goal: distance to goal: Settings.keeperGoalDistance
	else
		local goalLinePos = Vector.create(0 ,World.Geometry.FriendlyGoal.y + Settings.keeperGoalDistance)
		local goalLineDir = Vector.create(1,0)
		local movTo = geom.intersectLineLine(atkPos, atkDir, goalLinePos, goalLineDir)
		movTo.x = math.bound(-World.Geometry.GoalWidth.x / 2, movTo.x, World.Geometry.GoalWidth.x / 2) --don't move out of the goal
		local faceBall = World.Ball.pos-movTo
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	end
end

return Goalkeeper