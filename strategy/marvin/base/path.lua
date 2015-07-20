local path = path
local World = require "../base/world"
local G = World.Geometry
local Constants = require "../base/constants"
local Referee = require "../base/referee"

local POSITION_PADDING = 0.02

function path:setDefaultObstacles(robot, ignoreBall, ignoreGoals, ignoreDefenseArea, radius, stopBallDistance)
	radius = radius or robot.radius
	stopBallDistance = stopBallDistance or Constants.stopBallDistance

	local oppDefAreaDist = Referee.isFriendlyFreeKickState() and G.FreeKickDefenseDist or 0
	local forbidOppFieldHalf = Referee.isKickoffState()

	-- clear and add obstacles
	self:clearObstacles()

	-- set radius for path finding
	self:setRadius(radius)

	-- only keeper may enter friendly defense area
	-- don't add obstacles for friendly defense area if the robot is in the opponent half
	if World.FriendlyKeeper ~= robot and robot.pos.y < 0 and not ignoreDefenseArea then
		-- line with round end caps
		self:addLine(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
				G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y,
				G.DefenseRadius + POSITION_PADDING, "DefenseArea")
	end

	if robot.pos.y > 0 and (not Referee.isFriendlyPenaltyState()) then
		self:addLine(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y,
				G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y,
				G.DefenseRadius + World.Ball.radius + oppDefAreaDist, "DefenseAreaOpp")
	end

	if forbidOppFieldHalf then
		self:addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
			G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf")
	end

	if not ignoreBall or Referee.isStopState() then
		-- always add the actual ball obstacle, otherwise the ball may be pushed during stop
		self:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius, "Ball")
	end
	if Referee.isStopState() then
		self:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius + stopBallDistance, "BallStop")
	end

	if not ignoreGoals then
		local gw = G.GoalWallWidth / 2
		-- add goal obstacles for the field half the robot is in
		if robot.pos.y < 0 then
			self:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - gw,
					G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw, gw, "OwnGoal_Left")
			self:addLine(G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - gw,
					G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Right")
			self:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw,
					G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Back")
		else
			self:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + gw,
					G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw, gw, "OppGoal_Left")
			self:addLine(G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + gw,
					G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Right")
			self:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw,
					G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Center")
		end
	end
end

function path:addRobotObstacles(robot, ignoreFriendlyRobots, ignoreOpponentRobots, disableOpponentPrediction)
	-- TODO: better robot prediction and time estimation
	-- use 1 seconds for the navigation challenge
	local estimationTime = 0.1 -- just a fixed time for now
	if not ignoreFriendlyRobots then
		for _, r in pairs(World.FriendlyRobots) do
			if r.id ~= robot.id then -- don't add current robot
				-- use speed difference to calculate the safety distance
				local safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.05, 0.05)
				local estimatedPosition = r.pos + r.speed * estimationTime
				-- only use estimated position if it doesn't collide with the robot
				if robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						and r.pos:distanceTo(estimatedPosition) > 0.0001 then
					self:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, "OwnRobot_"..r.id)
				else
					self:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OwnRobot_"..r.id)
				end
			end
		end
	end
	if disableOpponentPrediction then
		estimationTime = 0
	end
	if not ignoreOpponentRobots then
		for _, r in pairs(World.OpponentRobots) do
			-- use speed difference to calculate the safety distance
			local safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.08, 0.10)
			if disableOpponentPrediction then -- be more aggressive
				safetyDistance = safetyDistance / 2
			end
			local estimatedPosition = r.pos + r.speed * estimationTime
			-- only use estimated position if it doesn't collide with the robot
			if robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
					and r.pos:distanceTo(estimatedPosition) > 0.0001 then
				self:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
						r.radius + safetyDistance, "OppRobot_"..r.id)
			else
				self:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OppRobot_"..r.id)
			end
		end
	end
end
