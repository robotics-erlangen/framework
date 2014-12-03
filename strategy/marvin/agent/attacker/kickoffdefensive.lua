local Base = require "agent/base/behavior"
local KickoffDefensive = (require "../base/class").new("Agent.Attacker.KickoffDefensive", Base)

local World = require "../base/world"
local KickoffMirror = require "task/kickoffmirror"

local preGameStages = {
	FirstHalfPre = true,
	SecondHalfPre = true,
	ExtraFirstHalfPre = true,
	ExtraSecondHalfPre = true
}
local defensiveKickoffStates = {
	KickoffDefensivePrepare = true,
	KickoffDefensive = true
}
local offensiveKickoffStates = {
	KickoffOffensive = true,
	KickoffOffensivePrepare = true
}

function KickoffDefensive:check()
	if defensiveKickoffStates[World.RefereeState] or
		(preGameStages[World.GameStage] and not offensiveKickoffStates[World.RefereeState]) then
		return true
	end
	return false
end

function KickoffDefensive:_updateTask()
	return KickoffMirror, {Settings.positionPadding}
end

return KickoffDefensive
