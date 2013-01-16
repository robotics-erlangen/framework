local path = path
local World = require "../base/world"
local Constants = require "../base/constants"
local Settings = require "settings"

-- states, in which we must keep a dist of 50cm
local refereeStopStates = {
	Stop = true,
	KickoffDefensivePrepare = true,
	KiffoffDefensive = true,
	DirectDefensive = true,
	IndirectDefensive = true
}

local refereeDefendStates = {
	DirectOffensive = true,
	IndirectOffensive = true
}

local refereeKickoffStates = {
	KickoffDefensivePrepare = true,
	KiffoffDefensive = true,
	KickoffOffensivePrepare = true,
	KiffoffOffensive = true
}

function path:setDefaultObstacles(robot, ignoreBall, ignoreGoals, radius)
	local ballDistance = 0
	radius = radius or robot.radius
	
	local forbidOppDefenseArea = refereeDefendStates[World.RefereeState]
	local forbidOppFieldHalf = refereeKickoffStates[World.RefereeeState]
	
	if refereeStopStates[World.RefereeState] then
		ballDistance = Constants.stopBallDistance
		ignoreBall = false
	end

	-- clear and add obstacles
	self:clearObstacles()
	
	-- set radius for path finding
	self:setRadius(radius)
	
	local G = World.Geometry
	-- only keeper may enter friendly defense area
	if World.FriendlyKeeper ~= robot then
		self:addCircle(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Left")
		self:addCircle(G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Right")
		--self:addRect(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
			--G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y + G.DefenseRadius, "DefenseArea_Center")
		self:addCircle(G.FriendlyGoal.x, G.FriendlyGoal.y, G.DefenseRadius + Settings.positionPadding, "DefenseArea_Center")
	end

	if forbidOppDefenseArea then
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
		self:addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius, "Ball")
	end

	if not ignoreGoals then
		local gw = G.GoalWallWidth / 2
		self:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - gw,
				G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw, gw, "OwnGoal_Left")
		self:addLine(G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Right")
		self:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Back")
		
		self:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + gw,
				G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw, gw, "OppGoal_Left")
		self:addLine(G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Right")
		self:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Center")
	end
end

function path:addRobotObstacles(robot, ignoreFriendlyRobots, ignoreOpponentRobots)
	-- TODO: speed based robot size?? leads to problems with path finding
	-- TODO: Predict robots to avoid crashes
	if not ignoreFriendlyRobots then
		for _, r in pairs(World.FriendlyRobots) do
			if r.id ~= robot.id then -- don't add current robot
				self:addCircle(r.pos.x, r.pos.y, r.radius, "OwnRobot_"..r.id)
			end
		end
	end
	if not ignoreOpponentRobots then
		for _, r in pairs(World.OpponentRobots) do
			self:addCircle(r.pos.x, r.pos.y, r.radius, "OppRobot_"..r.id)
		end
	end
end
