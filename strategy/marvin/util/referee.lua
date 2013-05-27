local Referee = {}
local World = require "../base/world"

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

function Referee.isStopState()
	return refereeStopStates[World.RefereeState]
end

function Referee.isDefendState()
	return refereeDefendStates[World.RefereeState]
end

function Referee.isKickoffState()
	return refereeKickoffStates[World.RefereeState]
end

return Referee
