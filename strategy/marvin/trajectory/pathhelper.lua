local PathHelper = {}

local Rating = require "util/rating"
local Constants = require "../base/constants"
local Referee = require "../base/referee"
local World = require "../base/world"
local Physics = require "observer/physics"
local geom = require "../base/geom"
local Cache = require "../base/cache"
local Field = require "../base/field"

local G = World.Geometry
local POSITION_PADDING = 0.02
local SEED_ANGLE_MOD = 2/180*math.pi
local SEED_PREDICT_TIME = 0.5

-- suggested table
-- local priorities = {
-- 	-- seedTarget = unknown
-- 	Pass2 = 15
-- 	Pass1 = 16
-- 	GoalShot = 20
-- 	KickoffStateFieldHalf = 25,
-- 	DefenseArea = 35,
-- 	Ball = 50,
-- 	PhysicalRobots = 100,
-- 	PhysicalWalls = 100,
-- }

local function addSeedTargets(path, robot)
	if path.addSeedTarget and robot.speed:length() > 0.1 then
		local angleMod = { -SEED_ANGLE_MOD, 0, SEED_ANGLE_MOD }
		for _, angle in ipairs(angleMod) do
			local seedTarget = robot.pos + (robot.speed * SEED_PREDICT_TIME):rotate(angle)
			path:addSeedTarget(seedTarget.x, seedTarget.y)
			-- vis.addPath("traj/pathhelper: seedTarget", { robot.pos, seedTarget }, vis.colors.blue)
		end
	end
end


local _GoalArea = {
	Vector(-G.GoalWidth/2 - 0.04,G.FieldHeightHalf + G.GoalDepth + 0.04),
	Vector(G.GoalWidth/2 + 0.04,G.FieldHeightHalf - G.GoalDepth - 0.04)
}
local _GoalAreaFriendly = {
	-_GoalArea[1],
	-_GoalArea[2]
}
local function addFriendlyDefenseAreaObstacle(path, robot)
	-- only keeper may enter friendly defense area
	-- don't add obstacles for friendly defense area if the robot is in the opponent half
	if World.FriendlyKeeper ~= robot and robot.pos.y < 0 then
		if World.RULEVERSION == "2018" then
			path:addRect(G.FriendlyGoal.x - G.DefenseWidthHalf - POSITION_PADDING,
					G.FriendlyGoal.y,
					G.FriendlyGoal.x + G.DefenseWidthHalf + POSITION_PADDING,
					G.FriendlyGoal.y + G.DefenseHeight + POSITION_PADDING,
					"DefenseArea", 35)
		else
		-- line with round end caps
			path:addLine(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", 35)
		end
		if geom.insideRect(_GoalAreaFriendly[1], _GoalAreaFriendly[2], robot.pos) or Field.isInFriendlyDefenseArea(robot.pos, robot.radius * 2) then
			path:addRect(_GoalAreaFriendly[1].x, _GoalAreaFriendly[1].y, _GoalAreaFriendly[2].x, _GoalAreaFriendly[2].y, "EvacuateGoal", 90)
		end
	end
end

local function addOpponentDefenseAreaObstacle(path, robot)
	-- don't add obstacles for opponent defense area if the robot is in the friendly half
	local oppDefAreaDist = Referee.isFriendlyFreeKickState() and G.FreeKickDefenseDist or 0
	-- TODO: adjust to rect with distance instead of larger rect
	local distance = oppDefAreaDist + POSITION_PADDING
	if robot.pos.y > 0 and (not Referee.isFriendlyPenaltyState()) and
			World.RefereeState ~= "BallPlacementOffensive" then
		if World.RULEVERSION == "2018" then
			path:addRect(G.OpponentGoal.x - G.DefenseWidthHalf - distance,
					G.OpponentGoal.y - G.DefenseHeight - distance,
					G.OpponentGoal.x + G.DefenseWidthHalf + distance,
					G.OpponentGoal.y,
					"DefenseArea", 35)
		else
			path:addLine(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y,
					G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", 35)
		end
		if geom.insideRect(_GoalArea[1], _GoalArea[2], robot.pos) or Field.isInOpponentDefenseArea(robot.pos, robot.radius * 2) then
			path:addRect(_GoalArea[1].x, _GoalArea[1].y, _GoalArea[2].x, _GoalArea[2].y, "EvacuateGoal", 90)
		end
	end
end
local function addOpponentFieldHalfObstacle(path)
	path:addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
		-G.CenterCircleRadius, 0.02, "OppFieldHalf", 25)
	path:addRect(-G.CenterCircleRadius - 0.2, G.FieldHeightHalf + 0.5,
		G.CenterCircleRadius + 0.2, 0.15, "OppFieldHalf", 26)
	path:addRect(G.CenterCircleRadius, G.FieldHeightHalf + 0.5,
		G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", 25)
end

local function addZonedBallObstacles(robot, innerBallDistance, outerBallDistance)
	local ball = World.Ball
	local distSq = robot.pos:distanceToSq(ball.pos)
	local outermost = math.huge

	if outerBallDistance then
		outermost = outerBallDistance * outerBallDistance
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius + outerBallDistance, "OuterBallObstacle", 48)
	end
	if distSq < outermost and innerBallDistance then
		outermost = innerBallDistance * innerBallDistance
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius + innerBallDistance, "InnerBallObstacle", 49)
	end
	if distSq < outermost then
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius, "Ball", 50)
	end
end

local function addBallObstacle(robot, ignoreBall, stopBallDistance, extraBallDistance)
	-- Since I had some trouble figuring out the semantic when I changed this I'll document it here
	-- (Even if it should be clear from the code now)
	-- If we are in a defensive stop state, the ignoreBall parameter is ignored (because that is how it was before)
	-- In the other two cases (ball placement and normal game), ignoreBall is considered.
	-- If it is false, we don't want to set a stopDistance but still consider an eventual extraBallDistance
	-- addZonedBallObstacles takes care of the nil handling
	local isDefensiveStopState = Referee.isStopState() and World.RefereeState ~= "BallPlacementOffensive"
	if isDefensiveStopState then
		if stopBallDistance and extraBallDistance and stopBallDistance > extraBallDistance then
			local temp = stopBallDistance
			stopBallDistance = extraBallDistance
			extraBallDistance = temp
		end

		addZonedBallObstacles(robot, stopBallDistance, extraBallDistance)
	elseif not ignoreBall then
		addZonedBallObstacles(robot, nil, extraBallDistance)
	end
end

local function addGoalObstacle(path, robot)
	local gw = G.GoalWallWidth / 2
	-- add goal obstacles for the field half the robot is in
	if robot.pos.y < 0 then
		path:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - gw,
				G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw, gw, "OwnGoal_Left", 100)
		path:addLine(G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Right", 100)
		path:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Back", 100)
	else
		path:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + gw,
				G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw, gw, "OppGoal_Left", 100)
		path:addLine(G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Right", 100)
		path:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Center", 100)
	end
end


local function isGoalShot()
	if World.Ball.speed:length() > 0.5 then
		local intersection, lambda1, lambda2 = geom.intersectLineLine(G.OpponentGoal, Vector(1,0), World.Ball.pos, World.Ball.speed)
		if intersection and math.abs(lambda1) < G.GoalWidth / 2 + 0.2 then
			if lambda2 > 0 and Physics.checkedBallRollTime(World.Ball, intersection) < math.huge then
				return true
			end
		end
	end
	return false
end

isGoalShot = Cache.forFrame(isGoalShot)

-- @return disablePass bool - no obstacles for pass needed
local function addGoalObstacleShot(path, robot, inbox)
	if not inbox then
		error("missing parameter: inbox")
	end
	local _, attackPos = next(inbox.attackPosition())
	if not attackPos then
		return
	end

	local mainAttacker = inbox.mainAttacker().trainer
	if mainAttacker and robot == mainAttacker then
		return true
	end
	local goal = G.OpponentGoal
	-- check whether the robot could possibly interfere with a goal shot
	local distRobotOpponentGoal = robot.pos:distanceToSq(goal)
	local distAttackPosOpponentGoal = attackPos:distanceToSq(goal)
	local distBallOpponentGoal = World.Ball.pos:distanceToSq(goal)
	if distRobotOpponentGoal > distAttackPosOpponentGoal
			and distRobotOpponentGoal > distBallOpponentGoal then
		return false
	end

	local _, shootDest = next(inbox.shootDestination())
	local disablePass = false
	local viewPos
	if isGoalShot() then
		viewPos = World.Ball.pos
		disablePass = true
	elseif shootDest then
		if G.OpponentGoal:distanceToSq(shootDest) <= G.GoalWidth * G.GoalWidth / 4 then
			viewPos = attackPos
		end
	end
	if viewPos then
		local leftGoal = G.OpponentGoalLeft
		local rightGoal = G.OpponentGoalRight
		path:addTriangle(viewPos.x, viewPos.y, leftGoal.x, leftGoal.y,
			rightGoal.x, rightGoal.y, World.Ball.radius + 0.05, "goalShot", 20)
	end
	return disablePass
end


local PASS_OBSTACLE_RADIUS = 0.2
local function addFriendlyPassObstacle(path, robot, inbox, radius)
	if not inbox then
		error("missing parameter: inbox")
	end
	-- don't move between the ball and the main attacker
	-- relevant for incoming passes
	radius = radius or PASS_OBSTACLE_RADIUS
	local radiusRobot = robot.radius*2 + 0.02
	local epsilonSq = robot.radius * robot.radius / 4
	local _, attackPosition = next(inbox.attackPosition())
	local mainAttacker = inbox.mainAttacker().trainer
	if mainAttacker and robot ~= mainAttacker then
		local dangerPos = attackPosition or mainAttacker.pos
		-- ball - intercept
		if dangerPos:distanceToSq(World.Ball.pos) > epsilonSq then
			path:addLine(World.Ball.pos.x, World.Ball.pos.y, dangerPos.x, dangerPos.y, radius, "pass1", 16)
		end
		-- MA - intercept
		if attackPosition and attackPosition:distanceToSq(mainAttacker.pos) > epsilonSq then
			path:addLine(mainAttacker.pos.x, mainAttacker.pos.y, attackPosition.x, attackPosition.y, radiusRobot, "pass1", 16)
		end
		local _, passInfoTable = next(inbox.passInfo())
		if passInfoTable then
			for _, passInfo in pairs(passInfoTable) do
				-- don't block the pass receiver
				if passInfo.target and passInfo.target ~= robot then
					local startPoint = passInfo.target.pos
					local endPoint = passInfo.ballPos
					path:addLine(endPoint.x, endPoint.y, dangerPos.x, dangerPos.y, radius, "pass2", 15)
					path:addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, radiusRobot, "pass2", 15)
				end

			end
		end
	end
end

local function addBallPlacementObstacle(path)
    if World.RefereeState == "BallPlacementOffensive" or World.RefereeState == "BallPlacementDefensive" then
        path:addLine(
            World.Ball.pos.x,
            World.Ball.pos.y,
            World.BallPlacementPos.x,
            World.BallPlacementPos.y,
            Constants.stopBallDistance,
            "BallPlacement"
        )
    end
end

local function setDefaultObstacles(path, robot, ignoreBall, ignoreGoals, ignoreDefenseArea, radius, stopBallDistance, noSeedTarget, ignoreOpponentDefenseArea, extraBallDistance)
	radius = radius or robot.radius
	stopBallDistance = stopBallDistance or Constants.stopBallDistance

	local forbidOppFieldHalf = Referee.isKickoffState()

	-- set radius for path finding
	path:setRadius(radius)

	if not noSeedTarget then
		addSeedTargets(path, robot)
	end
	if not ignoreDefenseArea then
		addFriendlyDefenseAreaObstacle(path, robot)
	end
	if not ignoreOpponentDefenseArea then
		addOpponentDefenseAreaObstacle(path, robot)
	end
	if forbidOppFieldHalf then
		addOpponentFieldHalfObstacle(path)
	end
	addBallObstacle(robot, ignoreBall, stopBallDistance, extraBallDistance)

	if not ignoreGoals then
		addGoalObstacle(path, robot)
	end
end

local function ignoreRobot(ownRobot, robot)
	if robot.speed:length() > 1 and ownRobot.pos:distanceTo(robot.pos) > 2 then
		return true
	end
	return false
end

local function addRobotObstacles(path, robot, ignoreFriendlyRobots, ignoreOpponentRobots, disableOpponentPrediction)
	-- TODO: better robot prediction and time estimation
	-- use 1 seconds for the navigation challenge
	local estimationTime = 0.1 -- just a fixed time for now
	local SLOW_ROBOT = 0.3
	if not ignoreFriendlyRobots then
		for _, r in ipairs(World.FriendlyRobots) do
			if r.id ~= robot.id and not ignoreRobot(robot, r) then -- don't add current robot
				-- use speed difference to calculate the safety distance
				local safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.05, 0.05)
				local estimatedPosition = r.pos + r.speed * estimationTime
				-- only use estimated position if it doesn't collide with the robot
				if robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						and r.pos:distanceTo(estimatedPosition) > 0.0001 then
					path:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, "OwnRobot_"..r.id, 100)
				else
					path:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OwnRobot_"..r.id, 100)
				end
			end
		end
	end
	if disableOpponentPrediction then
		estimationTime = 0
	end
	if not ignoreOpponentRobots then
		for _, r in ipairs(World.OpponentRobots) do
			if not ignoreRobot(robot, r) then
				-- use speed difference to calculate the safety distance
				local safetyDistance = Rating.valueToRating(robot.speed:distanceTo(r.speed), 0, 1.25) * 0.15 - 0.05
				if disableOpponentPrediction then -- be more aggressive
					safetyDistance = safetyDistance / 2
				elseif robot.speed:length() < SLOW_ROBOT and r.speed:length() < SLOW_ROBOT then
					safetyDistance = safetyDistance - 0.02
				end
				local estimatedPosition = r.pos + r.speed * estimationTime
				-- only use estimated position if it doesn't collide with the robot
				if robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						and r.pos:distanceTo(estimatedPosition) > 0.0001 then
					path:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, "OppRobot_"..r.id, 100)
				else
					path:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OppRobot_"..r.id, 100)
				end
			end
		end
	end
end

local obstacles = {}

function PathHelper.setObstacleParam(robot, name, value)
	if not obstacles[robot] then
		error("setObstacleParam got called before setDefaultObstaclesByTable for robot " .. robot.id)
	end
	obstacles[robot][name] = value
end

function PathHelper.getObstacleParam(robot, name)
	if not obstacles[robot] then
		error("getObstacleParam got called before setDefaultObstaclesByTable for robot " .. robot.id)
	end
	return obstacles[robot][name]
end

-- Possible parameters
-- ignoreBall                       bool
-- ignoreGoals                      bool
-- ignoreDefenseArea                bool
-- noSeedTarget                     bool
-- ignorePass                       bool
-- ignoreFriendlyRobots             bool
-- ignoreOpponentRobots             bool
-- ignoreBallPlacementObstacle      bool
-- disableOpponentPrediction        bool
-- pathRadius                       number
-- stopBallDistance                 number
-- extraBallDistance                number
-- inbox                            agent inbox
function PathHelper.setDefaultObstaclesByTable(path, robot, params)
	if not params then
		error("setDefaultObstaclesByTable called with nil parameter table")
	end

	path:clearObstacles()

	params["path"] = path or robot.path
	params["pathRadius"] = params.pathRadius or robot.radius
	params["stopBallDistance"] = params.stopBallDistance or Constants.stopBallDistance
	obstacles[robot] = table.copy(params)
end

function PathHelper.insertObstacles(robot)
	local p = obstacles[robot]
	setDefaultObstacles(p.path, robot, p.ignoreBall, p.ignoreGoals, p.ignoreDefenseArea,
		p.pathRadius, p.stopBallDistance, p.noSeedTarget, p.ignoreOpponentDefenseArea, p.extraBallDistance)
	if not p.ignorePass then
		local disablePass = addGoalObstacleShot(p.path, robot, p.inbox)
		if not disablePass then
			addFriendlyPassObstacle(p.path, robot, p.inbox)
		end
	end
    if not p.ignoreBallPlacementObstacle then
        addBallPlacementObstacle(p.path)
    end
	addRobotObstacles(p.path, robot, p.ignoreFriendlyRobots, p.ignoreOpponentRobots, p.disableOpponentPrediction)
	-- Clear obstacle params because obstacles gets kept over multiple frames
	obstacles[robot] = nil
end

return PathHelper
