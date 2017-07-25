local Attack = {}

local Cache = require "../base/cache"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Rating = require "util/rating"

--- evaluates a given pass object
-- @name ratePass
-- @param robot Robot - the pass sender / main attacker
-- @param pass table - a pass object (target: Robot, ballPos: Vector, time: number)
-- @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
-- @return number - a rating between 0 and 1 (1 = perfect, 0 = poor)
function Attack.ratePass(robot, pass, considerTiming)
	local rating = 1

	-- rate distance
	local distanceToMA = robot.pos:distanceTo(pass.ballPos)
	rating = rating * Rating.valueToRating(distanceToMA, 1, 2)

	-- rate timing
	local shootTime
	if Ball.receivesPass(robot) then
		local dribblerPos = robot.pos + (World.Ball.pos - robot.pos):setLength(
			robot.shootRadius + World.Ball.radius)
		shootTime = Physics.checkedBallRollTime(World.Ball, dribblerPos)
	else
		shootTime = Robot.minShootTime(robot, pass.ballPos)
	end
	local shootPos = Physics.ballAtTime(World.Ball, shootTime).pos
	local passTime = Shoot.ballPassTime(shootPos, pass.ballPos, pass.target, nil, robot)
	local ballArrivalTime = shootTime + passTime + World.Time
	if considerTiming then
		rating = rating * Rating.valueToRating(ballArrivalTime - pass.time, -0.1, 0.1)
	end

	-- rate volley
	if Ball.receivesPass(robot) then
		local volleyAngle = World.Ball.speed:absoluteAngleDiff(shootPos - pass.ballPos)
		local volleyWeight = 0.7
		local volleyRating = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
		rating = rating * (1 - volleyWeight + volleyWeight * volleyRating)
	end

	-- rate angle shooter-goal-receiver
	local shooterGoalReceiverAngle = (shootPos - World.Geometry.OpponentGoal):absoluteAngleDiff(
			pass.ballPos - World.Geometry.OpponentGoal)
	local shooterGoalReceiverRating = Rating.valueToRating(shooterGoalReceiverAngle, 0, 180 / 180 * math.pi)
	local shooterGoalReceiverWeight = 0.5
	rating = rating * (1 - shooterGoalReceiverWeight + shooterGoalReceiverWeight * shooterGoalReceiverRating)

	-- rate possible interceptions
	for _,opp in ipairs(World.OpponentRobots) do

		-- check if robot would have to move through defense area to intercept the pass
		local orthogonalProjection = opp.pos:orthogonalProjection(shootPos, pass.ballPos)
		local intersection = Field.intersectRayDefenseArea(opp.pos, orthogonalProjection - opp.pos, 0, true)
		local validIntersection = false
		if intersection then
			validIntersection = Field.isInField(intersection) and (opp.pos - intersection):length() < (opp.pos - orthogonalProjection):length()
			if validIntersection then
				vis.addCircle("u/a/ratePass", intersection, 0.05, vis.colors.red, true)
				vis.addPath("u/a/ratePass", {opp.pos, intersection}, vis.colors.slate, true)
			end
		end

		-- rate opponent's ability to intercept the pass
		if not validIntersection and orthogonalProjection:distanceToLineSegment(shootPos, pass.ballPos) < 1
					and opp ~= World.OpponentKeeper then
			local passInterception = orthogonalProjection:distanceToLineSegment(shootPos, pass.ballPos) > 0.5
					and pass.ballPos or orthogonalProjection
			vis.addPath("u/a/ratePass", {opp.pos, passInterception}, vis.colors.blue, true)

			-- calculate the time the ball needs to arrive at the intersection point
			local shootSpeed = Vector(1,1):setLength(robot:calculateShootSpeed(3, (shootPos-pass.ballPos):length())) -- direction doesn't actually matter
			local fakeBall = {speed = shootSpeed, maxSpeed = shootSpeed:length()}
			local ballRollTime = Physics.ballRollTime(fakeBall, (passInterception - shootPos):length() - World.Ball.radius - opp.shootRadius)

			-- calculate the time the robot needs to arrive at the intersection point
			-- to achieve more relevant results, the speed component parallel to the pass trajectory is ignored
			local projectedSpeed = opp.speed - ((opp.pos + opp.speed):orthogonalProjection(shootPos, pass.ballPos) - orthogonalProjection)
			vis.addPath("u/a/ratePass", {opp.pos, opp.pos + projectedSpeed}, vis.colors.pink, true)
			local fakeRobot = {acceleration = opp.acceleration, pos = opp.pos, maxSpeed = opp.maxSpeed, speed = projectedSpeed}

			local timeToPos = 0
			local minDist = World.Ball.radius + opp.radius
			if opp.pos:distanceTo(passInterception) > minDist then
				local hitPoint = passInterception + (opp.pos - passInterception):setLength(minDist)
				timeToPos = Physics.robotTimeToPos(fakeRobot, hitPoint, Vector(0,0), false)
			end

			local passRating = Rating.valueToRating(timeToPos, ballRollTime - 1, ballRollTime + 0.5)
			-- uncomment to debug: log("Rating: "..tostring(opp)..", ballRollTime: "..tostring(ballRollTime)..", timeToPos: "..tostring(timeToPos)..", passRating: "..tostring(passRating))
			rating = rating * (passRating / 2 + 0.5)

		end
	end

	vis.addCircle("u/a/ratePass", shootPos, 0.1, vis.colors.blue, true)
	vis.addPath("u/a/ratePass", {shootPos, pass.ballPos}, vis.colors.red)
	vis.addCircle("u/a/ratePass: rating", pass.ballPos, 0.2,
	vis.fromTemperature(1 - rating, 127), true)
	return rating
end

--- chooses a pass from a list of pass objects using Attack.ratePass
-- @name choosePass
-- @param robot Robot - the pass sender / main attacker
-- @param passes table - a list of pass objects
-- @param currentPassPos - the ballPos of the last frame, used for stability
-- @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
-- @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
-- @return table - the best pass object
function Attack.choosePass(robot, passes, currentPassPos, considerTiming, customHysteresis)
	local bestPass
	local bestPassRating = -math.huge
	for _,pass in ipairs(passes) do
		local rating = Attack.ratePass(robot, pass, considerTiming)
		if rating > 0 then
			-- give a bonus if the pos is near the currentPassPos
			if currentPassPos then
				local ratingHystDistance = customHysteresis or 0.1
				local ratingHystPercentage = customHysteresis or 0.1
				rating = math.min(1, rating * (1 + ratingHystPercentage *
					Rating.valueToRating(pass.ballPos:distanceTo(currentPassPos), ratingHystDistance, 0)))
			end

			if rating > bestPassRating then
				bestPass = pass
				bestPassRating = rating
			end
		end
	end

	return bestPass, bestPassRating
end

--- chooses a pass from a list of pass suggestions using Attack.ratePass
-- @name choosePassFromSuggestions
-- @param robot Robot - the pass sender / main attacker
-- @param passSuggestions table - all incoming passSuggestion messages
-- @param currentPassPos - the ballPos of the last frame, used for stability
-- @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
-- @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
-- @return table - the best pass object
function Attack.choosePassFromSuggestions(robot, passSuggestions, currentPassPos, considerTiming, customHysteresis)
	local passes = {}
	for sender, sugg in pairs(passSuggestions) do
		local target = sender
		if sugg.anonymous then
			target = nil
		end
		table.insert(passes, {target = target, ballPos = sugg.ballPos, time = sugg.time })
	end
	return Attack.choosePass(robot, passes, currentPassPos, considerTiming, customHysteresis)
end

local function sortByRating(a, b)
	return a.rating > b.rating
end

--- sorts the passes by their rating
-- @name sortPassesFromSuggestions
-- @param robot Robot - the pass sender / main attacker
-- @param passSuggestions table - all incoming passSuggestion messages
-- @param currentPassPositions table - the ballPositions of the last frame, used for stability
-- @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
-- @param threshold - number between 0 and 1, ratings lower than the threshold won't be included (unless we would have none otherwise)
-- @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
-- @return table - list of passes, sorted by their rating
function Attack.sortPassesFromSuggestions(robot, passSuggestions, currentPassPositions, considerTiming, threshold, customHysteresis)
	local passes = {}
	threshold = threshold or 0.5
	for sender, sugg in pairs(passSuggestions) do
		local pass = {target = sender, ballPos = sugg.ballPos, time = sugg.time}
		local rating = Attack.ratePass(robot, pass, considerTiming)
		-- give a bonus if the pos is near the currentPassPos
		if currentPassPositions then
			local ratingHystDistance = customHysteresis or 0.1
			local ratingHystPercentage = customHysteresis or 0.1
			local hystBonus = -math.huge
			for _, pos in ipairs(currentPassPositions) do
				local bonus = (1 + ratingHystPercentage *
					Rating.valueToRating(sugg.ballPos:distanceTo(pos), ratingHystDistance, 0))
				if bonus > hystBonus then
					hystBonus = bonus
				end
			end
			rating = rating * hystBonus
		end

		local target = sender
		if sugg.anonymous then
			target = nil
		end
		table.insert(passes, {target = target, ballPos = sugg.ballPos, time = sugg.time, rating = rating})
	end

	table.sort(passes, sortByRating)

	for i = 2, #passes do
		if passes[i].rating < threshold then
			passes[i] = nil
		end
	end
	return next(passes) and passes or nil
end

--- draws a broad line beween the main attacker (robotPos) and the next attack destination (shootDest)
-- @name visualizeAttack
-- @param robotPos Vector - the position of the main attacker
-- @param shootDest Vector - the position of the next shoot destination
function Attack.visualizeAttack(robotPos, shootDest)
	local color = World.TeamIsBlue and vis.fromRGBA(38, 48, 217, 63) or vis.fromRGBA(244, 214, 31, 63)
	vis.addPath("u/a/Attack", {robotPos, shootDest}, color, nil, nil, 0.1)
end

--- decides whether a robot has to be a main attacker because it will receive a pass
-- used in a/a/applyformainattacker
-- @param passInfoSender Robot - the sender of the passInfo message
-- @param passInfoMessage table - passInfo, for format details see messaging.lua
-- @return Robot - the main attacker that receives a pass, or nil
local lastCPMA = nil
local lastPasser = nil
local lastReceiver = nil
function Attack.currentPlannedMainAttacker(passInfoSender, passInfoTable)
	local passInfoMessage
	if passInfoTable then
		if #passInfoTable > 1 then
			return nil
		end
		local _
		_, passInfoMessage = next(passInfoTable)
		if passInfoSender and Robot.hadBall(passInfoSender, 0) then
			lastPasser = passInfoSender
			lastReceiver = passInfoMessage.target
		end
	end

	debug.set("plannedMA/lastCPMA", lastCPMA)
	debug.set("plannedMA/lastPasser", lastPasser)
	if lastPasser then
		debug.set("plannedMA/lastReceiver", lastReceiver or "anonymous")
	else
		debug.set("plannedMA/lastReceiver", lastReceiver)
	end

	if lastPasser and Ball.wasShot(0.5) == lastPasser
			and World.Ball.speed:length() > 1 and World.Ball.speed:absoluteAngleDiff(
				lastReceiver.pos - World.Ball.pos) < 45 / 180 * math.pi then
		lastCPMA = lastReceiver
		return lastCPMA
	end

	if lastCPMA and World.Ball.speed:length() > 1 and World.Ball.speed:absoluteAngleDiff(
				lastCPMA.pos - World.Ball.pos) < 45 / 180 * math.pi then
		return lastCPMA
	end

	lastCPMA = nil
end
Attack.currentPlannedMainAttacker = Cache.forFrame(Attack.currentPlannedMainAttacker)

--- checks whether we are shooting a goal and returns a position for a path obstacle, or nil
-- @param shootDest Vector - the content of the shootDestination message
-- @param attackPos Vector - the content of the attackPosition message
-- @return Vector - robots should not move between the returned position and the opponent goal
function Attack.shootGoalViewPos(shootDest, attackPos)
	-- if we want to shoot a goal
	if shootDest then
		if World.Geometry.OpponentGoal:distanceTo(shootDest) <= World.Geometry.GoalWidth / 2 then
			return attackPos
		end
	end

	-- if the ball is rolling towards the opponent goal
	if World.Ball.speed:length() > 3 then
		local intersection, _, l2 = geom.intersectLineLine(World.Ball.pos, World.Ball.speed,
			World.Geometry.OpponentGoal, Vector(1, 0))
		if intersection and math.abs(l2) < World.Geometry.GoalWidth / 2 + 0.2 then
			if Physics.checkedBallRollTime(World.Ball, intersection) < math.huge then
				return World.Ball.pos
			end
		end
	end

	return nil
end
Attack.checkForGoalShot = Cache.forFrame(Attack.checkForGoalShot)

--- makes sure that a robot does not intercept our goal shot
-- only adds a path obstacle if necessary
-- has to be called after PathHelper.setDefaultObstacles
-- @param robot Robot - the robot that gets the obstacle
-- @param shootDest Vector - the content of the shootDestination message
-- @param attackPos Vector - the content of the attackPosition message
function Attack.addShootGoalObstacle(robot, shootDest, attackPos)
	if not attackPos then
		return
	end

	-- check whether the robot could possibly interfere with a goal shot
	local distRobotOpponentGoal = robot.pos:distanceTo(World.Geometry.OpponentGoal)
	local distAttackPosOpponentGoal = attackPos:distanceTo(World.Geometry.OpponentGoal)
	local distBallOpponentGoal = World.Ball.pos:distanceTo(World.Geometry.OpponentGoal)
	if distRobotOpponentGoal > distAttackPosOpponentGoal
			and distRobotOpponentGoal > distBallOpponentGoal then
		return
	end

	local viewPos
	if World.Ball.speed:length() > 0.5 and Ball.ballHeadingForGoal(World.Ball) then
		viewPos = World.Ball.pos
	else
		viewPos = Attack.shootGoalViewPos(shootDest, attackPos)
	end
	if viewPos then
		local leftGoal = World.Geometry.OpponentGoalLeft
		local rightGoal = World.Geometry.OpponentGoalRight
		robot.path:addTriangle(viewPos.x, viewPos.y, leftGoal.x, leftGoal.y,
			rightGoal.x, rightGoal.y, World.Ball.radius + 0.05)
	end
end

local BUFFER_TIME = 0.15
local function printPassInfo(robot, passInfo, hysteresis, hysteresisPassInfo)
	if passInfo then
		local robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(robot.shootRadius + World.Ball.radius)
		local robotTime = math.max(Physics.robotTimeToPos(robot, robotPos, Vector(0, 0), true), 0.5)
		debug.push("PassInfo")
		debug.set("robotTime",robotTime + BUFFER_TIME)
		debug.set("messageTime", passInfo.time - World.Time)
		debug.set("ballTime", Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(passInfo.ballPos)))
		debug.set("passInfoTime", passInfo.time)
		debug.set("hysteresis", hysteresis)
		debug.push("hysteresisPassInfo")
		debug.set("passInfo", hysteresisPassInfo)
		if hysteresisPassInfo then
			for k,v in pairs(hysteresisPassInfo) do
				debug.set("hyseresis "..tostring(k), v)
			end
		end
		debug.pop()
		debug.pop()
	end
end

-- the time between the arrival of the robot and the ball
local function calculatePassInfoTiming(robot, passInfo, passIncoming)
	if passInfo then
		local robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(robot.shootRadius + World.Ball.radius)
		local robotTime = math.max(Physics.robotTimeToPos(robot, robotPos, Vector(0, 0), true), 0.5)
		local ballTime = passIncoming and Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(passInfo.ballPos)) or math.huge
		local messageTime = passInfo.time - World.Time
		local bufferTime = BUFFER_TIME
		return math.min(messageTime, ballTime) - (robotTime + bufferTime)
	end
	return math.huge
end

--checks if an attacker has to start to move towards its pass
--@param robot Robot
--@param passInfoTable table - all of the passInfos currently being sent out
--@param lastResult bool - the return value of the last call to this function, or false
--@return bool - if we have to start to move
local function checkPassInfos(robot, passInfoTable, lastResult, lastPassInfo, passIncoming)
	local relevantPassInfoMessage = Attack.relevantPassInfoMessage(robot, passInfoTable)
	printPassInfo(robot, relevantPassInfoMessage, lastResult, lastPassInfo)
	if not relevantPassInfoMessage then
		return nil, false
	else
		local timeLeft = calculatePassInfoTiming(robot, relevantPassInfoMessage, passIncoming)
		return relevantPassInfoMessage, lastResult and timeLeft < 0.5 or timeLeft < 0
	end
end

local checkedPassInfoPerRobot = {}

function Attack.checkPassInfos(robot, passInfoTable, passIncoming)
	local cachedPassInfo = checkedPassInfoPerRobot[robot]
	local preResult = cachedPassInfo and cachedPassInfo.result
	local preMessage = cachedPassInfo and cachedPassInfo.message
	local message, result = checkPassInfos(robot, passInfoTable, preResult, preMessage, passIncoming)
	checkedPassInfoPerRobot[robot] = {message = message, result = result}
	return result
end

--checks if an attacker has to start to move towards its pass
--@param robot Robot - to copy its specs
--@param passInfo Message - the passInfo-Message
--@param position Vector - an alternative starting position for the timing calculations
--@param speed Vector - an alternative starting speed for timing, or Vector(0,0)
--@return bool - if we have to start to move
function Attack.checkPassInfoFromPosition(robot, passInfo, position, speed, passIncoming)
	if position then
		speed = speed or Vector(0,0)
		local fakeRobot = {
			acceleration = robot.acceleration,
			pos = position,
			maxSpeed = robot.maxSpeed,
			speed = speed
		}
		printPassInfo(fakeRobot, passInfo, false, nil)
		return calculatePassInfoTiming(fakeRobot, passInfo, passIncoming) < 0
	end
	return false
end

-- returns the passInfo that targets the robot
-- @param robot Robot
-- @param passInfoTable table - all of the passInfos currently being sent out
-- @return Message relevantPassInfoMessage (the passInfo message that targets the robot), nil if there isn't one
function Attack.relevantPassInfoMessage(robot, passInfoTable)
	local relevantPassInfoMessage = nil
	if passInfoTable then
		for _, passInfo in ipairs(passInfoTable) do
			if passInfo.target == robot then
				relevantPassInfoMessage = passInfo
				break
			end
		end
	end
	return relevantPassInfoMessage
end

---returns last incoming passInfo for each robot
--@param robot Robot
--@param passInfo Message - passInfo-Message
--@return passInfo Message - last passInfo-Message
local InvalidationCounter = {}
local lastIncomingPassInfo = {}

function Attack.lastIncomingPassInfo(robot, passInfo)
	local incomingPassInfo = nil
	local anonymousPass = false
	local _, passInfoTable = next(passInfo)

	if not InvalidationCounter[robot] then
		InvalidationCounter[robot] = 0
	end
	if passInfoTable then
		for _, passInfoEntry in ipairs(passInfoTable) do
			if passInfoEntry.target == nil then
				anonymousPass = true
			end
			if passInfoEntry.target == robot then
				incomingPassInfo = passInfoEntry
			end
		end
	end
	assert(incomingPassInfo or not anonymousPass, "a/a/Shoot does not know how to handle anonymous passes")
	if incomingPassInfo then
		lastIncomingPassInfo[robot] = incomingPassInfo
		InvalidationCounter[robot] = 0
	elseif not Ball.isAccelerating() and not Ball.receivesPass(robot) then
		InvalidationCounter[robot] = InvalidationCounter[robot] + 1
	end
	if InvalidationCounter[robot] == 5 then
		lastIncomingPassInfo[robot] = nil
		InvalidationCounter[robot] = 0
	end
	return lastIncomingPassInfo[robot]
end
return Attack
