local Assistant = (require "../base/class").new("Task.Assistant", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Goal = require "observer/goal"
local Rating = require "util/rating"

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
	--Obstacles
	self._robot.path:setDefaultObstacles(self._robot, false, false)
	self._robot.path:addRobotObstacles(self._robot, false, false)
	local shotPos, shotDir = Goal.predictShot()
	shotDir = shotDir:copy():setLength(World.Geometry.FieldHeightHalf)
	local shotTarget = (shotPos+shotDir)
	self._robot.path:addLine(shotPos.x, shotPos.y, shotTarget.x, shotTarget.y, 0.1)
	
	local linePos = Vector.create(0, World.Geometry.FieldHeightQuarter)
	local lineDir = Vector.create(1,0)
	--choose 1 of 3 Lines
	if self.lineNumber == 1 then
		linePos.y = (linePos.y * 0.5)
	elseif self.lineNumber == 2 then
		linePos.y = (linePos.y * 1.0)
	else
		linePos.y = (linePos.y * 1.4)
	end
	
	local intersections = {}
	table.insert(intersections, Vector.create(-World.Geometry.FieldWidthHalf, linePos.y))
	table.insert(intersections, Vector.create(World.Geometry.FieldWidthHalf, linePos.y))
	local goalEdgeSouthIntersection = geom.intersectLinesByPoints(linePos, linePos+lineDir, World.Ball.pos, Vector.create(-World.Geometry.GoalWidth / 2, World.Geometry.OpponentGoal.y))
	local goalEdgeNorthIntersection = geom.intersectLinesByPoints(linePos, linePos+lineDir, World.Ball.pos, Vector.create(World.Geometry.GoalWidth / 2, World.Geometry.OpponentGoal.y))
	if World.Ball.pos.y < linePos.y then
		table.insert(intersections, goalEdgeSouthIntersection)
		table.insert(intersections, goalEdgeNorthIntersection)
	end
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
		local targetPos = msg.task.targetPos
		if targetPos and targetPos.y < (linePos.y+0.5) and targetPos.y > (linePos.y-0.5) then
			table.insert(intersections, targetPos)
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
			local space = intersections[i+1].x - intersections[i].x
			local distance = math.abs((intersections[i].x + (space / 2)) - self._robot.pos.x)
			space = space / math.log(distance+math.exp(1))
			if space > bestSpace then
				best = i
				bestSpace = space
			end
		end
	end
	local moveTo = Vector.create(intersections[best].x + (bestSpace/2), linePos.y)

	moveTo.x = math.bound(-World.Geometry.FieldWidthHalf + 2 * self._robot.radius, moveTo.x, World.Geometry.FieldWidthHalf - 2 * self._robot.radius)
	local faceBall = World.Ball.pos-moveTo
	self._robot.trajectory:update(ToTarget, moveTo, faceBall:angle())
	return {targetPos = moveTo, assistantRating = self:_rate()}
end

function Assistant:_rate()
	--(more distance to ball -> 1) * (near the enemy fieldhalf -> 1)
	return ((1 - Rating.posToRating(self._robot, World.Ball.pos))*math.bound(0, ((self._robot.pos.y+World.Geometry.FieldHeightHalf)/(2.2*World.Geometry.FieldHeightQuarter)), 1))
end

function Assistant.factory(position)
	local f = function (robots)
		return Assistant.create(robots[position])
	end
	return f
end

function Assistant.test(id)
	if id > 2 then
		return nil
	end
	return Assistant.factory(1), 1
end

return Assistant
