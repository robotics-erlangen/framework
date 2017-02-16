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
	local passTime = Shoot.ballPassTime(shootPos, pass.ballPos, pass.target)
	local ballArrivalTime = shootTime + passTime + World.Time
	if considerTiming then
		rating = rating * Rating.valueToRating(ballArrivalTime - pass.time, -0.1, 0.1)
	end

	-- rate volley
	if Ball.receivesPass(robot) then
		local volleyAngle = World.Ball.speed:absoluteAngleDiff(robot.pos - pass.ballPos)
		rating = rating * Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	end

	-- rate possible interceptions
	for _,opp in ipairs(World.OpponentRobots) do
		local oppVector = opp.pos - shootPos
		if oppVector:length() > 0.2 then

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

			if not validIntersection and orthogonalProjection:distanceToLineSegment(shootPos, pass.ballPos) < 0.1
						and opp ~= World.OpponentKeeper then
				vis.addPath("u/a/ratePass", {opp.pos, orthogonalProjection}, vis.colors.blue, true)

				-- calculate the time the ball needs to arrive at the intersection point
				local shootSpeed = Vector(1,1):setLength(robot:calculateShootSpeed(3, (shootPos-pass.ballPos):length()))
				local fakeBall = {speed = shootSpeed, maxSpeed = shootSpeed:length()}
				local ballRollTime = Physics.ballRollTime(fakeBall, (orthogonalProjection - shootPos):length() - World.Ball.radius - opp.shootRadius)

				-- calculate the time the robot needs to arrive at the intersection point
				-- to achieve more relevant results, the speed component parallel to the pass trajectory is ignored
				local projectedSpeed = opp.speed - ((opp.pos + opp.speed):orthogonalProjection(shootPos, pass.ballPos) - orthogonalProjection)
				vis.addPath("u/a/ratePass", {opp.pos, opp.pos + projectedSpeed}, vis.colors.pink, true)
				local fakeRobot = {acceleration = opp.acceleration, pos = opp.pos, maxSpeed = opp.maxSpeed, speed = projectedSpeed}
				local timeToPos = Physics.robotTimeToPos(fakeRobot, orthogonalProjection, Vector(0,0), false)

				local passRating = Rating.valueToRating(timeToPos, ballRollTime - 0.5, ballRollTime + 0.2)
				--log("Rating: "..tostring(opp)..", ballRollTime: "..tostring(ballRollTime)..", timeToPos: "..tostring(timeToPos)..", passRating: "..tostring(passRating))
				rating = rating * (passRating / 2 + 0.5)

			end
		end
	end
	vis.addCircle("u/a/ratePass", shootPos, 0.1, vis.colors.blue, true)
	vis.addPath("u/a/ratePass", {shootPos, pass.ballPos}, vis.colors.red)
	vis.addCircle("u/a/ratePass: rating", pass.ballPos, 0.2,
	vis.fromTemperature(1 - rating, 127), true)
	return rating
end

function Attack.choosePass(robot, passes, currentPassPos, considerTiming)
	local bestPass
	local bestPassRating = -math.huge
	for _,pass in ipairs(passes) do
		local rating = Attack.ratePass(robot, pass, considerTiming)
		if rating > 0 then
			-- give a bonus if the pos is near the currentPassPos
			if currentPassPos then
				local ratingHystDistance = 0.1
				local ratingHystPercentage = 0.1
				rating = rating * (1 + ratingHystPercentage *
					Rating.valueToRating(pass.ballPos:distanceTo(currentPassPos), ratingHystDistance, 0))
			end

			if rating > bestPassRating then
				bestPass = pass
				bestPassRating = rating
			end
		end
	end

	return bestPass, bestPassRating
end

function Attack.choosePassFromSuggestions(robot, passSuggestions, currentPassPos, considerTiming)
	local passes = {}
	for sender, sugg in pairs(passSuggestions) do
		table.insert(passes, {target = sender, ballPos = sugg.ballPos, time = sugg.time })
	end
	return Attack.choosePass(robot, passes, currentPassPos, considerTiming)
end

function Attack.visualizeAttack(robotPos, attackPos)
	local color = World.TeamIsBlue and vis.fromRGBA(38, 48, 217, 63) or vis.fromRGBA(244, 214, 31, 63)
	vis.addPath("u/a/Attack", {robotPos, attackPos}, color, nil, nil, 0.1)
end

local lastCPMA = nil
local lastPasser = nil
local lastReceiver = nil
function Attack.currentPlannedMainAttacker(passInfo)
	local passInfoSender, passInfoMessage = next(passInfo)
	if passInfoSender and Robot.hadBall(passInfoSender, 0) then
		lastPasser = passInfoSender
		lastReceiver = passInfoMessage.target
	end

	debug.set("plannedMA/lastCPMA", lastCPMA)
	debug.set("plannedMA/lastPasser", lastPasser)
	debug.set("plannedMA/lastReceiver", lastReceiver)

	if lastPasser and Ball.wasShot(0.2) == lastPasser
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

	local viewPos = Attack.shootGoalViewPos(shootDest, attackPos)
	if viewPos then
		local leftGoal = World.Geometry.OpponentGoalLeft
		local rightGoal = World.Geometry.OpponentGoalRight
		robot.path:addTriangle(viewPos.x, viewPos.y, leftGoal.x, leftGoal.y,
			rightGoal.x, rightGoal.y, World.Ball.radius + 0.05)
	end
end

return Attack
