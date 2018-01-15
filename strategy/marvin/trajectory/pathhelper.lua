local PathHelper = {}

local Rating = require "util/rating"
local Constants = require "../base/constants"
local Referee = require "../base/referee"
local World = require "../base/world"


local G = World.Geometry
local POSITION_PADDING = 0.02
local SEED_ANGLE_MOD = 2/180*math.pi
local SEED_PREDICT_TIME = 0.5

-- suggested table
-- local priorities = {
-- 	-- seedTarget = unknown
-- 	Pass2 = 15
-- 	Pass1 = 16
-- 	KickoffStateFieldHalf = 25,
-- 	DefenseArea = 35,
-- 	Ball = 50,
-- 	PhysicalRobots = 100,
-- 	PhysicalWalls = 100,
-- }




-- local EXTRA_BALL_DISTANCE = 0.2
-- @name setDefaultObstacles
-- @param path base/path - path the obstacle takes
-- @param robot robot - robot which recieves the obstacles;
-- 		also serves as generic robot
-- @param ignoreBall bool - the ball may be pushed
-- @param ignoreGoals bool - adds the goal walls as obstacles
-- @param ignoreDefenseArea bool - friendly Defense Area
-- @param radius number - radus used for path; defaults to robot radius
-- @param stopBallDistance number - distance to ball in StopState
-- @param noSeedTarget bool - something
-- @param ignoreOpponentDefenseArea bool - opponent Defense Area
-- @param forceBallDistance bool - keeps EXTRA_BALL_DISTANCE
-- @return nil

local function obstacle_SeedTarget(path, robot)
	if path.addSeedTarget and robot.speed:length() > 0.1 then
		local angleMod = { -SEED_ANGLE_MOD, 0, SEED_ANGLE_MOD }
		for _, angle in ipairs(angleMod) do
			local seedTarget = robot.pos + (robot.speed * SEED_PREDICT_TIME):rotate(angle)
			path:addSeedTarget(seedTarget.x, seedTarget.y)
			-- vis.addPath("traj/pathhelper: seedTarget", { robot.pos, seedTarget }, vis.colors.blue)
		end
	end
end
local function obstacle_friendlyDefenseArea(path, robot)
	-- only keeper may enter friendly defense area
	-- don't add obstacles for friendly defense area if the robot is in the opponent half
	if World.FriendlyKeeper ~= robot and robot.pos.y < 0 then
		-- line with round end caps
		path:addRect(G.FriendlyGoal.x - G.DefenseWidthHalf - POSITION_PADDING,
				G.FriendlyGoal.y,
				G.FriendlyGoal.x + G.DefenseWidthHalf + POSITION_PADDING,
				G.FriendlyGoal.y + G.DefenseHeight + POSITION_PADDING,
				"DefenseArea", 35)
		-- path:addLine(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
		-- 		G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y,
		-- 		G.DefenseRadius + POSITION_PADDING, "DefenseArea", 35)
	end
end
local function obstacle_OpponentDefenseArea(path, robot)
	-- don't add obstacles for opponent defense area if the robot is in the friendly half
	local oppDefAreaDist = Referee.isFriendlyFreeKickState() and G.FreeKickDefenseDist or 0
	-- TODO: adjust to rect with distance instead of larger rect
	local distance = oppDefAreaDist + POSITION_PADDING
	if robot.pos.y > 0 and (not Referee.isFriendlyPenaltyState()) and
			World.RefereeState ~= "BallPlacementOffensive" then
		path:addRect(G.OpponentGoal.x - G.DefenseWidthHalf - distance,
				G.OpponentGoal.y - G.DefenseHeight - distance,
				G.OpponentGoal.x + G.DefenseWidthHalf + distance,
				G.OpponentGoal.y,
				"DefenseArea", 35)
	end
end
local function obstacle_forbidOppFieldHalf(path)
	path:addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
		-G.CenterCircleRadius, 0.02, "OppFieldHalf", 25)
	path:addRect(-G.CenterCircleRadius - 0.2, G.FieldHeightHalf + 0.5,
		G.CenterCircleRadius + 0.2, 0.15, "OppFieldHalf", 26)
	path:addRect(G.CenterCircleRadius, G.FieldHeightHalf + 0.5,
		G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", 25)
end

local function obstacle_ball(path, stopBallDistance, ignoreBall, extraBallDistance)
	if (not ignoreBall) and extraBallDistance and extraBallDistance > stopBallDistance then
		path:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius + extraBallDistance, "BallDistance", 50)
	elseif Referee.isStopState() and World.RefereeState ~= "BallPlacementOffensive" then
		path:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius + stopBallDistance, "BallStop", 50)
	elseif not ignoreBall and not extraBallDistance then
		path:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius, "Ball", 50)
	elseif not ignoreBall then
		path:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius + extraBallDistance, "ExtraBallDistance", 50)
	end
end

local function obstacle_goal(path, robot)
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

local PASS_OBSTACLE_RADIUS = 0.2
function PathHelper.obstacle_friendlyPass(path, robot, inbox, radius)
	if not inbox then
		error("missing parameter: inbox")
	end
	-- don't move between the ball and the main attacker
	-- relevant for incoming passes
	radius = radius or PASS_OBSTACLE_RADIUS
	local radiusRobot = robot.radius*2 + 0.02
	local epsilonSq = radiusRobot * radiusRobot / 4
	local _, attackPosition = next(inbox.attackPosition())
	local mainAttacker = inbox.mainAttacker().trainer
	if mainAttacker and robot ~= mainAttacker then
		local dangerPos = attackPosition or mainAttacker.pos
		-- ball - intercept
		if dangerPos:distanceToSq(World.Ball.pos) > epsilonSq then
			path:addLine(World.Ball.pos.x, World.Ball.pos.y, dangerPos.x, dangerPos.y, radius, "pass1", 16)
		end
		-- MA - intercept
		if attackPosition and attackPosition:distanceToSq(dangerPos) > epsilonSq then
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

function PathHelper.setDefaultObstacles(path, robot, ignoreBall, ignoreGoals, ignoreDefenseArea, radius, stopBallDistance, noSeedTarget, ignoreOpponentDefenseArea, extraBallDistance)
	radius = radius or robot.radius
	stopBallDistance = stopBallDistance or Constants.stopBallDistance

	
	local forbidOppFieldHalf = Referee.isKickoffState()

	-- clear and add obstacles
	path:clearObstacles()

	-- set radius for path finding
	path:setRadius(radius)

	if not noSeedTarget then
		obstacle_SeedTarget(path, robot)
	end
	if not ignoreDefenseArea then
		obstacle_friendlyDefenseArea(path, robot)
	end
	if not ignoreOpponentDefenseArea then
		obstacle_OpponentDefenseArea(path, robot)
	end
	if forbidOppFieldHalf then
		obstacle_forbidOppFieldHalf(path)
	end
	obstacle_ball(path, stopBallDistance, ignoreBall, extraBallDistance)

	if not ignoreGoals then
		obstacle_goal(path, robot)
	end
end

function PathHelper.setDefaultObstaclesByTable(path, robot, t)
	PathHelper.setDefaultObstacles(path, robot, t.ignoreBall, t.ignoreGoals, t.ignoreDefenseArea, t.pathRadius,
			t.stopBallDistance, t.noSeedTarget, t.ignoreOpponentDefenseArea, t.extraBallDistance)
	if not t.ignorePass then
		PathHelper.obstacle_friendlyPass(path, robot, t.inbox)
	end
	PathHelper.addRobotObstacles(path, robot, t.ignoreFriendlyRobots, t.ignoreOpponentRobots, t.disableOpponentPrediction)
end

local function ignoreRobot(ownRobot, robot)
	if robot.speed:length() > 1 and ownRobot.pos:distanceTo(robot.pos) > 2 then
		return true
	end
	return false
end

function PathHelper.addRobotObstacles(path, robot, ignoreFriendlyRobots, ignoreOpponentRobots, disableOpponentPrediction)
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

return PathHelper
