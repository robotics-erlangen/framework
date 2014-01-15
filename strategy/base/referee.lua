local Referee = {}
local World = require "../base/world"
local vis = require "../base/vis"

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

function Referee.illustrateRefereeStates()
	if World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.OwnPenaltyLine), Vector.create(2,World.Geometry.OwnPenaltyLine)}, vis.colors.red)
	elseif World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.PenaltyLine), Vector.create(2,World.Geometry.PenaltyLine)}, vis.colors.red)
	elseif Referee.isStopState() then
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true)
	end
end

return Referee
