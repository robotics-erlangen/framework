local Assistant = (require "../base/class").new("Task.Assistant", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local geom = require "../base/geom"
local vis = require "../base/vis"

Assistant.priority = 1

function Assistant:_init(pos, radius)
	self._pos = pos
	self._radius = radius
	self.lineNumber = math.random(3)
end

local function vecYComp(vec1, vec2)
	if vec1.x < vec2.x then
		return true
	else
		return false
	end
end

function Assistant:_run(priorityMessages, notifications)
	--TODO Obstacles in shoting line and chose 1 of 3 assistant lines
	self._robot.path:setDefaultObstacles(self._robot, false, false)
	self._robot.path:addRobotObstacles(self._robot, false, false)
	local linePos = Vector.create(0, World.Geometry.FieldHeightQuarter)
	local lineDir = Vector.create(1,0)
	--choose 1 of 3 Lines
	--[[if lineNumber == 0 then
		linePos.y = (linePos.y * 0.5)
	elseif lineNumber == 1 then
		linePos.y = (linePos.y * 1.0)
	else
		linePos.y = (linePos.y * 1.5)
	end]]--
	local intersections = {}
	table.insert(intersections, Vector.create(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightQuarter))
	table.insert(intersections, Vector.create(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightQuarter))
	local goalEdgeSouthIntersection = geom.intersectLinesByPoints(linePos, linePos+lineDir, World.Ball.pos, Vector.create(-World.Geometry.GoalWidth / 2, World.Geometry.OpponentGoal.y))
	local goalEdgeNorthIntersection = geom.intersectLinesByPoints(linePos, linePos+lineDir, World.Ball.pos, Vector.create(World.Geometry.GoalWidth / 2, World.Geometry.OpponentGoal.y))
	table.insert(intersections, goalEdgeSouthIntersection)
	table.insert(intersections, goalEdgeNorthIntersection)
	local best = 0
	local bestSpace = -1

	vis.addPath("AssistantLine",{linePos,linePos+lineDir})

	--scan for relevant robots and intersections points on line
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < linePos.y and robot.pos.y > World.Ball.pos.y then
			local tmp = geom.intersectLinesByPoints(linePos, linePos+lineDir, World.Ball.pos, robot.pos)
			if tmp then
				if tmp.x < goalEdgeSouthIntersection.x or tmp.x > goalEdgeNorthIntersection.x then
					if tmp.x < World.Geometry.FieldWidthHalf and tmp.x > -World.Geometry.FieldWidthHalf then
						table.insert(intersections, tmp)
					end
				end
			end
		end
	end
	
	--lookup friendly assistants
	for robot, msg in pairs(priorityMessages) do
		if msg.targetPos then
			if msg.targetPos.y < (linePos.y+0.5) and msg.targetPos.y > (linePos.y-0.5) then
				table.insert(intersections, msg.targetPos)
			end
		end
	end
	
	for _, pos in ipairs(intersections) do
		vis.addCircle("AssistantIntersections", pos, 0.03, blue, true)
	end

	--sort intersections
	table.sort (intersections, vecYComp)
	--takes the biggest free space
	for i = 1 , #intersections do
		if i ~= #intersections and intersections[i] ~= goalEdgeSouthIntersection then
			if intersections[i+1].x - intersections[i].x > bestSpace then
				best = i
				bestSpace = intersections[i+1].x - intersections[i].x
			end
		end
	end
	local moveTo = Vector.create(intersections[best].x + (bestSpace/2), World.Geometry.FieldHeightQuarter)

	moveTo.x = math.bound(-World.Geometry.FieldWidthHalf + 2 * self._robot.radius, moveTo.x, World.Geometry.FieldWidthHalf - 2 * self._robot.radius)
	local faceBall = World.Ball.pos-moveTo
	self._robot.trajectory:update(ToTarget, moveTo, faceBall:angle())
	return {targetPos = moveTo}
end

local inst = nil
function Assistant.test()
	local robot = World.FriendlyRobots[2]
	if robot then
		inst = inst or Assistant.create(robot)
		return inst
	else
		inst = nil
	end
end

return Assistant
