local Assistant = (require "../base/class").new("Task.Assistant", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local Interval = require "util/interval"
local Rating = require "util/rating"
local Referee = require "util/referee"

Assistant.priority = 1

function Assistant:_init(pos, radius)
	self._pos = pos
	self._radius = radius
	local lineNum = math.random(3)

	local numMapping = { 0.5, 1.0, 1.4}
	local lineY = World.Geometry.FieldHeightQuarter * numMapping[lineNum]

	self.linePos = Vector.create(-World.Geometry.FieldWidthHalf, lineY)
	self.lineDir = Vector.create(World.Geometry.FieldWidth, 0)
end

function Assistant:_run()
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self.targetPos, self.targetDir)

	return {targetPos = self.targetPos, assistantRating = self.rating}
end

function Assistant:_rate(priorityMessages, notifications)
	local shotPos, shotDir = Goal.predictShot() --FIXME use suitable function
	shotDir = shotDir:copy():setLength(World.Geometry.FieldHeightHalf)
	local shotTarget = (shotPos+shotDir)
	self._robot.path:addLine(shotPos.x, shotPos.y, shotTarget.x, shotTarget.y, 0.1)
	
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		self.linePos.y = World.Geometry.PenaltyLine - Settings.penaltyLineDistance
	end
	local lineStart = self.linePos
	local lineEnd = self.linePos + self.lineDir

	local occupiedSectors = {}
	if World.Ball.pos.y < lineStart.y then -- don't position between ball and goal
		local goalLeft = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, World.Geometry.OpponentGoalLeft)
		local goalRight = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, World.Geometry.OpponentGoalRight)
		table.insert(occupiedSectors, {goalLeft.x - self._robot.radius, goalRight.x + self._robot.radius})
	end

	if Referee.isStopState() then -- keep distance to ball during stop
		local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
		if math.abs(World.Ball.pos.y - lineStart.y) < minDist then
			local cut1, cut2 = geom.intersectLineCircle(lineStart, lineEnd - lineStart, World.Ball.pos, minDist)
			if cut1 and cut2 then
				table.insert(occupiedSectors, {math.min(cut1.x, cut2.x), math.max(cut1.x, cut2.x)})
			end
		end
	end

	-- consider opponents between ball and our line
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < lineStart.y and robot.pos.y > World.Ball.pos.y then
			local tmp = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, robot.pos)
			if tmp then
				table.insert(occupiedSectors, {tmp.x - self._robot.radius, tmp.x + self._robot.radius})
			end
		end
	end
	
	-- lookup friendly assistants
	for robot, msg in pairs(priorityMessages) do
		local targetPos = msg.task.targetPos
		if targetPos and math.abs(targetPos.y - lineStart.y) < 0.5 then
			table.insert(occupiedSectors, {targetPos.x - 2*robot.radius, targetPos.x + 2*robot.radius})
		end
	end

	-- get free sectors
	Interval.sort(occupiedSectors)
	Interval.merge(occupiedSectors)
	local widthLimit = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
	local freeSectors = Interval.negate(occupiedSectors, -widthLimit, widthLimit)
	
	--some debug output
	vis.addPath("AssistantLine", {lineStart, lineEnd}, vis.colors.blueHalf, true)
	for _, pos in ipairs(freeSectors) do
		vis.addPath("AssistantIntersections" .. self._robot.id, {Vector.create(pos[1], lineStart.y), Vector.create(pos[2], lineStart.y)}, vis.colors.blueHalf, true)
	end
	
	local best = nil
	local bestSpace = -1

	--takes the biggest free space
	for _, sector in ipairs(freeSectors) do
		local space = sector[2] - sector[1]
		local pos = Vector.create((sector[1] + sector[2]) / 2, lineStart.y)
		local distance = pos:distanceTo(self._robot.pos)
		space = space / math.log(distance+math.exp(1)) -- weigth by distance
		if space > bestSpace then
			best = sector
			bestSpace = space
		end
	end

	local midX = best and (best[1] + best[2]) / 2 or 0 -- fallback to mid
	self.targetPos = Vector.create(midX, lineStart.y)
	self.targetDir = (World.Ball.pos - self.targetPos):angle()
	self.rating = Rating.posToRating(self._robot, self.targetPos)
	return self.rating
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
