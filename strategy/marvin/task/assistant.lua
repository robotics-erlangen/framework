local Assistant = (require "../base/class").new("Task.Assistant", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local Interval = require "util/interval"
local Rating = require "util/rating"
local Referee = require "../base/referee"
local Ball = require "observer/ball"

Assistant.priority = 1

function Assistant:_init(pos, radius)
	self._pos = pos
	self._radius = radius
	self.lineNum = math.random(3)
	self.numMapping = { 0.5, 1.0, 1.4}
	self.lineDir = Vector.create(World.Geometry.FieldWidth, 0)
end

function Assistant:run()
	--referee handling
	local offFreeKick = World.RefereeState == "IndirectOffensive" 
		or World.RefereeState == "DirectOffensive"
	self.numMapping[3] = (Referee.isStopState() or offFreeKick) and 1.25 or 1.4
	
	--some variables
	local lineY = World.Geometry.FieldHeightQuarter * self.numMapping[self.lineNum]
	local linePos = Vector.create(-World.Geometry.FieldWidthHalf, lineY)
	local robotsInWay = false
	
	--special case: blocking enemy robot on assistance line
	for _, robot in ipairs(World.OpponentRobots) do
		if World.Ball.pos.y < (linePos.y + 0.2) and World.Ball.pos.y > (linePos.y - 0.2) and robot.pos.y < (linePos.y + 0.2) and robot.pos.y > (linePos.y - 0.2) and ((robot.pos.x > World.Ball.pos.x and robot.pos.x < self._robot.pos.x) or (robot.pos.x < World.Ball.pos.x and robot.pos.x > self._robot.pos.x)) then
			robotsInWay = true
		end
	end
	if robotsInWay and World.Ball.speed:length() < Settings.slowBall then
		if self.lineNum == 3 then
			linePos.y = linePos.y - 0.3
		else
			linePos.y = linePos.y + 0.3
		end
	end
	
	--bounding of playing field and shooting Line
	local lineStart = linePos
	local lineEnd = linePos + self.lineDir
	local northBound = World.Geometry.FieldWidthHalf - self._robot.radius
	local southBound = -northBound
	self.shotPos = World.Ball.pos
	local shotDir = World.Ball.speed:copy():setLength(World.Geometry.FieldHeightHalf)
	self.shotTarget = self.shotPos+shotDir
	
	if Ball.isShot() then
		local shotIntersect = geom.intersectLinesByPoints(lineStart, lineEnd, self.shotPos, self.shotTarget)
		if shotIntersect and shotIntersect.x >= self._robot.pos.x then
			northBound = math.min(northBound, shotIntersect.x)
		elseif shotIntersect and shotIntersect.x < self._robot.pos.x then
			southBound = math.max(southBound, shotIntersect.x)
		end
	end
	
	--referee handling
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		linePos.y = World.Geometry.PenaltyLine - Settings.penaltyLineDistance
	end
	
	--collection of all intersections
	local occupiedSectors = {}
	
	-- don't position between ball and goal
	if World.Ball.pos.y < lineStart.y then
		local goalLeft = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, World.Geometry.OpponentGoalLeft)
		local goalRight = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, World.Geometry.OpponentGoalRight)
		table.insert(occupiedSectors, {math.bound(southBound, goalLeft.x - self._robot.radius, northBound), math.bound(southBound, goalRight.x + self._robot.radius, northBound)})
	end

	-- always keep distance to ball
	local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
	if math.abs(World.Ball.pos.y - lineStart.y) < minDist then
		local cut1, cut2 = geom.intersectLineCircle(lineStart, lineEnd - lineStart, World.Ball.pos, minDist)
		if cut1 and cut2 then
			local min = math.min(cut1.x, cut2.x)
			local max = math.max(cut1.x, cut2.x)
			table.insert(occupiedSectors, {math.bound(southBound, min, northBound), math.bound(southBound, max, northBound)})
		end
	end

	-- consider opponents between ball and our line
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < lineStart.y and robot.pos.y > World.Ball.pos.y then
			local tmp = geom.intersectLinesByPoints(lineStart, lineEnd, World.Ball.pos, robot.pos)
			if tmp then
				table.insert(occupiedSectors, {math.bound(southBound, tmp.x - self._robot.radius, northBound), math.bound(southBound, tmp.x + self._robot.radius, northBound)})
			end
		end
	end
	
	-- lookup friendly assistants
	local otherAssistants = {}
	for robot, _ in pairs(self._inbox.assistantRating()) do
		otherAssistants[robot] = true
	end
	for robot, pos in pairs(self._inbox.moveDest()) do
		if otherAssistants[robot] and math.abs(pos.y - lineStart.y) < 0.5 then
			table.insert(occupiedSectors, {math.bound(southBound, pos.x - 2*robot.radius, northBound), math.bound(southBound, pos.x + 2*robot.radius, northBound)})
		end
	end

	-- get free sectors
	Interval.sort(occupiedSectors)
	Interval.merge(occupiedSectors)
	local widthLimit = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
	local freeSectors = Interval.negate(occupiedSectors, southBound, northBound)
	
	--some debug output
	vis.addPath("ShootingLine", {self.shotPos, self.shotTarget}, vis.colors.blueHalf, true)
	vis.addPath("AssistantLine", {lineStart, lineEnd}, vis.colors.blueHalf, true)
	for _, pos in ipairs(freeSectors) do
		vis.addPath("AssistantIntersections" .. self._robot.id, {Vector.create(pos[1], lineStart.y), Vector.create(pos[2], lineStart.y)}, vis.colors.blueHalf, true)
	end
	
	--takes the biggest free space
	local best = nil
	local bestSpace = -1

	for _, sector in ipairs(freeSectors) do
		local space = sector[2] - sector[1]
		local pos = Vector.create((sector[1] + sector[2]) / 2, lineStart.y)
		local distance = pos:distanceTo(self._robot.pos)
		space = space / math.log(distance+math.exp(1)) -- weight by distance
		if space > bestSpace then
			best = sector
			bestSpace = space
		end
	end
	
	--calculate target pos and move
	local midX = best and (best[1] + best[2]) / 2 or 0 -- fallback to mid
	self.targetPos = Vector.create(midX, lineStart.y)
	self.targetDir = (World.Ball.pos - self.targetPos):angle()
	self.rating = Rating.posToRating(self._robot, self.targetPos)

	self._robot.path:setDefaultObstacles(self._robot)
	if World.Ball.speed:length() > Settings.slowBall then
		self._robot.path:addLine(self.shotPos.x, self.shotPos.y, self.shotTarget.x, self.shotTarget.y, 0.1)
	end
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self.targetPos, self.targetDir)

	self._send("all").moveDest(self.targetPos)
	self._send("all").assistantRating(self.rating)
end

return Assistant
