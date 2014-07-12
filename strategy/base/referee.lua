local Referee = {}
local World = require "../base/world"
local vis = require "../base/vis"
local robotRadius = (require "../base/constants").maxRobotRadius -- avoid table lookups for speed reasons

-- states, in which we must keep a dist of 50cm
local stopStates = {
	Stop = true,
	KickoffDefensivePrepare = true,
	KickoffDefensive = true,
	DirectDefensive = true,
	IndirectDefensive = true
}

local friendlyFreeKickStates = {
	DirectOffensive = true,
	IndirectOffensive = true
}

local kickoffStates = {
	KickoffDefensivePrepare = true,
	KickoffDefensive = true,
	KickoffOffensivePrepare = true,
	KickoffOffensive = true
}

local opponentPenaltyStates = {
	PenaltyDefensivePrepare = true,
	PenaltyDefensive = true
}

function Referee.isStopState()
	return stopStates[World.RefereeState]
end

function Referee.isFriendlyFreeKickState()
	return friendlyFreeKickStates[World.RefereeState]
end

function Referee.isKickoffState()
	return kickoffStates[World.RefereeState]
end

function Referee.isOpponentPenaltyState()
	return opponentPenaltyStates[World.RefereeState]
end

local rightLine = World.Geometry.FieldWidthHalf
local leftLine = -rightLine
local goalLine = World.Geometry.FieldHeightHalf
local cornerDist = 0.2 -- some tolerance, rules say 10cm
function Referee.isOffensiveCornerKick()
	local ballPos = World.Ball.pos
	return World.RefereeState == "DirectOffensive"
		and goalLine - ballPos.y < cornerDist
		and (leftLine - ballPos.x > -cornerDist or rightLine - ballPos.x < cornerDist)
end

function Referee.illustrateRefereeStates()
	if World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.OwnPenaltyLine), Vector.create(2,World.Geometry.OwnPenaltyLine)}, vis.colors.red)
	elseif World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.PenaltyLine), Vector.create(2,World.Geometry.PenaltyLine)}, vis.colors.red)
	elseif Referee.isStopState() then
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true)
	end
end

local lastTeam = true -- true for the friendly team, false for the opponent
local touchDist = World.Ball.radius+robotRadius
function Referee.checkTouching()
	local ballPos = World.Ball.pos
	-- pessimistic approach: when we are at the ball, our team is considered touching
	for _, robot in ipairs(World.FriendlyRobots) do
		if robot.pos:distanceTo(ballPos) <= touchDist then
			lastTeam = true
			return
		end
	end
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos:distanceTo(ballPos) <= touchDist then
			lastTeam = false
			return
		end
	end
end

function Referee.friendlyTouchedLast()
	return lastTeam
end

return Referee
