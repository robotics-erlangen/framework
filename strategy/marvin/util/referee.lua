local Referee = {}
local World = require "../base/world"

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

function Referee.isStopState()
	return stopStates[World.RefereeState]
end

function Referee.isFriendlyFreeKickState()
	return friendlyFreeKickStates[World.RefereeState]
end

function Referee.isKickoffState()
	return kickoffStates[World.RefereeState]
end

return Referee
