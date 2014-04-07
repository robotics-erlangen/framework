local path = path
local World = require "../base/world"
local Constants = require "../base/constants"
local Settings = require "settings"
local Referee = require "../base/referee"

function path:setDefaultObstacles(robot, ignoreBall, ignoreGoals, ignoreDefenseArea, radius)
	local ballDistance = 0
	radius = radius or robot.radius
	
	local forbidOppDefenseArea = Referee.isFriendlyFreeKickState()
	local forbidOppFieldHalf = Referee.isKickoffState()
	
	if Referee.isStopState() then
		ballDistance = Constants.stopBallDistance
		ignoreBall = false
	end

	-- clear and add obstacles
	self:clearObstacles()
	
	-- set radius for path finding
	self:setRadius(radius)
	
	local G = World.Geometry
	-- only keeper may enter friendly defense area
	-- don't add obstacles for friendly defense area if the robot is in the opponent half
	if World.FriendlyKeeper ~= robot and robot.pos.y < 0 and not ignoreDefenseArea then
		self:addCircle(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Left")
		self:addCircle(G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Right")
		--self:addRect(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
			--G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y + G.DefenseRadius, "DefenseArea_Center")
		self:addCircle(G.FriendlyGoal.x, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Center")
	end

	if forbidOppDefenseArea and robot.pos.y > 0 then
		self:addCircle(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y, G.DefenseRadius + G.FreeKickDefenseDist, "DefenseAreaOpp_Left")
		self:addCircle(G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y, G.DefenseRadius + G.FreeKickDefenseDist, "DefenseAreaOpp_Right")
		--self:addRect(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y,
			--G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y - G.DefenseRadius - G.FreeKickDefenseDist, "DefenseAreaOpp_Center")
		self:addCircle(G.OpponentGoal.x, G.OpponentGoal.y, G.DefenseRadius + Settings.positionPadding + G.FreeKickDefenseDist, "DefenseAreaOpp_Center")
	end
	
	if forbidOppFieldHalf then
		self:addRect(-G.FieldWidthHalf, G.FieldHeightHalf,
			G.FieldWidthHalf, 0, "OppFieldHalf")
	end
	
	if not ignoreBall then
		self:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius + ballDistance, "Ball")
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

function path:addRobotObstacles(robot, ignoreFriendlyRobots, ignoreOpponentRobots)
	-- TODO: Predict robots to avoid crashes
	if not ignoreFriendlyRobots then
		for _, r in pairs(World.FriendlyRobots) do
			if r.id ~= robot.id then -- don't add current robot
				-- use speed difference to calculate the safety distance
				local safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.05, 0.05)
				self:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OwnRobot_"..r.id)
			end
		end
	end
	if not ignoreOpponentRobots then
		for _, r in pairs(World.OpponentRobots) do
			-- use speed difference to calculate the safety distance
			local safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.08, 0.10)
			self:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OppRobot_"..r.id)
		end
	end
end
