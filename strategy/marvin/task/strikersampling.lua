local StrikerSampling = Class("Task.StrikerSampling", require "task/base")

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Processor = require "../base/processor"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Interval = require "util/interval"

local PositionProcessor = Class("Task.PositionProcessor", require "../base/process")

local lastFramePositions = {} -- attacker -> position
local newPositions 		 = {} -- attacker -> position
local processorRunning = false

function PositionProcessor:run()
	lastFramePositions = table.copy(newPositions)
	newPositions = {}
end

function PositionProcessor:isFinished()
	return false
end

function StrikerSampling:_init()
	if not processorRunning then
		processorRunning = true
		local positionProcessor = PositionProcessor()
		Processor.addPost(positionProcessor)
	end
	self._lastPoint = nil
	self._lastScore = 0
	local frontGoalPos = World.Geometry.OpponentGoal+Vector(0,-math.sign(World.Geometry.OpponentGoal.y)*
							(World.Geometry.DefenseRadius+self._robot.radius))
	local freeSector = Goal.largestFreeSector(frontGoalPos,{},true)
	self._bestGoalAngle = freeSector[2]-freeSector[1]
	self._openAngleRobotList = {}
	self._minDist = self._robot.radius * 2
	self._posLimitX = World.Geometry.FieldWidthHalf - self._minDist
	self._posLimitY = World.Geometry.FieldHeightHalf - self._minDist - World.Geometry.DefenseRadius
		-  World.Geometry.FreeKickDefenseDist - 0.10
	self._allOtherRobots = {}
	for _,r in ipairs(World.OpponentRobots) do
		if r ~= self._robot then
			table.insert(self._allOtherRobots, r)
		end
	end
end

function StrikerSampling:randomLocationAroundPoint(point, radius)
	local randomRadius = math.random() * radius
	local randomAngle = math.random() * 2 * math.pi
	local x = math.cos(randomAngle) * randomRadius + point.x
	local y = math.sin(randomAngle) * randomRadius + point.y
	if y < -World.Geometry.FieldHeightQuarter then
		y = -World.Geometry.FieldHeightQuarter
	end
	local pos = Vector(x, y)
	if math.abs(x) < self._posLimitX and math.abs(y) < self._posLimitY then
		return pos
	end
	return Field.limitToAllowedField(Vector(x, y), self._minDist)
end

-- check whether an opponent robot can reach pos faster than the own robot
function StrikerSampling:oppFasterThenOwnRobot(pos)
	local moveTime = Physics.robotTimeToPos(self._robot, pos, Vector(0, 0), false, false)
	if moveTime < 0.4 then
		return 1
	end
	local shortestTimeToPos = math.huge
	local closestOpponentRobot = nil
	for _,r in ipairs(World.OpponentRobots) do
		local oppTime = Physics.robotTimeToPos(r, pos, Vector(0, 0), false, false)
		if oppTime < shortestTimeToPos then
			shortestTimeToPos = oppTime
			closestOpponentRobot = r
		end
	end
	return math.bound(0,  (shortestTimeToPos - moveTime) * 2 + 0.2, 1)
end

function StrikerSampling:distanceToOtherRobots(pos)
	local closestDistance = math.huge
	for _,r in ipairs(self._allOtherRobots) do
		local distance = pos:distanceTo(r.pos)
		if distance < closestDistance then
			closestDistance = distance
		end
	end
	return math.min(1, 0.5*closestDistance)
end

function StrikerSampling:distanceToAttackers(pos)
	local closestDistance = math.huge
	for attacker, position in pairs(lastFramePositions) do
		if attacker.id > self._robot.id then
			local distance = pos:distanceTo(position)
			if distance < closestDistance then
				closestDistance = distance
			end
		end
	end
	return math.min(1, 0.3*closestDistance)
end

function StrikerSampling:passInterception(pos)
	local fastestTime = math.huge
	local distance = pos:distanceTo(World.Ball.pos)
	local perpendicular = (pos - World.Ball.pos):perpendicular():setLength(distance / 4)
	local posPlus = pos + perpendicular
	local posMinus = pos - perpendicular

	for _,r in ipairs(World.OpponentRobots) do
		--just a VERY rough estimation to improve the time consumption
		local isIn = geom.isInTriangle(posPlus, posMinus, World.Ball.pos, r.pos)

		if isIn then
			local timePos = r.pos:nearestPosOnLine(World.Ball.pos, pos)
			local difVector = timePos - r.pos
			local partLength = difVector:length() - r.radius
			if partLength < 0 then
				return 0
			end

			difVector:normalize()
			local maxDirectionVelocity = difVector * r.maxSpeed
			local realPos = r.pos + difVector:setLength(partLength)
			local robotTime = Physics.robotTimeToPos(r, realPos, maxDirectionVelocity, false, false)
			local fakeBall = {
				pos = World.Ball.pos,
				speed = Vector(self._robot:calculateShootSpeed(self._robot.constants.passSpeed, 
								World.Ball.pos:distanceTo(pos)), 0),
				maxSpeed = World.Ball.maxSpeed,
				radius = World.Ball.radius
			}
			local ballTime = Physics.ballRollTime(fakeBall, World.Ball.pos:distanceTo(timePos))
			local difTime = robotTime - ballTime

			if difTime < fastestTime then
				fastestTime = difTime
			end
		end
	end
	return math.bound(0, fastestTime * 2, 1)
end

function StrikerSampling:posNearEnough(pos)
	local distance = pos:distanceTo(self._robot.pos)
	local d_max = 4
	local cmp = distance / d_max
	return math.bound(0, 1 - cmp, 1)
end

function StrikerSampling:passTooShort(pos)
	if pos:distanceTo(World.Ball.pos) < 1 then
		return 0
	end
	return 1
end

-- calculate the largest free sector from pos to the opponent goal and scale it
function StrikerSampling:openAngle(pos)
	local robots = {}
	local rangeMin = World.Geometry.OpponentGoalLeft.x
	local rangeMax = World.Geometry.OpponentGoalRight.x
	if pos.x < World.Geometry.OpponentGoalLeft.x then
		rangeMin = pos.x
	elseif pos.x > World.Geometry.OpponentGoalRight.x then
		rangeMax = pos.x
	end
	for _,r in ipairs(self._openAngleRobotList) do
		if r.pos.y > pos.y and r.pos.x > rangeMin and r.pos.x < rangeMax then
			table.insert(robots, r)
		end
	end

	local largestSector = Goal.largestFreeSector(pos, robots, true)
	if largestSector == nil then
		return 0
	end
	local angle = largestSector[2]-largestSector[1]
	return angle/self._bestGoalAngle, robots
end

function StrikerSampling:oneTouchShot(pos)
	local toAttacker = World.Ball.pos - pos
	local toGoal = World.Geometry.OpponentGoal - pos
	local angle = math.abs(toAttacker:angleDiff(toGoal))
	if angle < 70/180*math.pi then
		return 1
	else
		return 0.5
	end
end

-- tests whether pos is in the way of a possible shot to the goal
function StrikerSampling:dontAnnoyMainAttacker(pos)
	if pos.y < World.Ball.pos.y then
		return 1
	end

	local isIn = geom.isInTriangle(World.Geometry.OpponentGoalRight , World.Geometry.OpponentGoalLeft, World.Ball.pos, pos)

	if isIn then
		return 0.1
	end
	return 1
end

-- check the distance to the opponent goal
function StrikerSampling:correctFieldHalf(pos)
	return math.bound(0, 1 - pos:distanceTo(World.Geometry.OpponentGoal) / World.Geometry.FieldHeight, 1)
end

function StrikerSampling:precalculate()
	-- the list of robots to be used for openAngle
	-- exclude fast moving robots as they wont be relevant anymore in a few frames
	self._openAngleRobotList = {}
	for _,r in ipairs(self._allOtherRobots) do
		if r.speed:length() < 1 then
			table.insert(self._openAngleRobotList, r)
		end
	end
end

function StrikerSampling:evalLocation(pos, currentBestScore)
	local score = self:correctFieldHalf(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:openAngle(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:posNearEnough(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:distanceToOtherRobots(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:distanceToAttackers(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:oneTouchShot(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:dontAnnoyMainAttacker(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:passTooShort(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:oppFasterThenOwnRobot(pos)
	if score <= currentBestScore then
		return score
	end
	score = score * self:passInterception(pos)
	return score
end

function StrikerSampling:findLocation()
	local bestPos = self._lastPoint or self._robot.pos
	local difTime = World.TimeDiff / 4
	local bestScore = self._lastScore - difTime
	local oldScore = self:evalLocation(bestPos, -1)
	if oldScore > bestScore then
		bestScore = oldScore
	end

	for i = 1, 10 do
		local radius = 0.75 * (1 - bestScore)
		local randPos = self:randomLocationAroundPoint(bestPos, radius)
		local eval = self:evalLocation(randPos, bestScore)
		if eval > bestScore then
			bestScore = eval
			bestPos = randPos
		end
	end
	self._lastPoint = bestPos
	self._lastScore = bestScore
	return bestPos
end

function StrikerSampling:calcMoveDest()
	self:precalculate()
	local passPos = self:findLocation()
	newPositions[self._robot] = passPos
	vis.addCircle("t/strikersampling: Position", passPos, 0.3, vis.colors.magenta)
	return passPos
end

return StrikerSampling