local Base = require "agent/base/behavior"
local KickoffDefensive = (require "../base/class").new("Agent.Attacker.KickoffDefensive", Base)

local World = require "../base/world"
local KickoffMirror = require "task/kickoffmirror"

function KickoffDefensive:check()
	local positiveState = {
		FirstHalfPre = true,
		SecondHalfPre = true,
		ExtraFirstHalfPre = true,
		ExtraSecondHalfPre = true,
		KickoffDefensivePrepare = true,
		KickoffDefensive = true,
	}
	local blockState = {
		KickoffOffensive = true,
		KickoffOffensivePrepare = true
	}

	if (positiveState[World.RefereeState] or positiveState[World.GameStage])
			and not blockState[World.RefereeState] then
		return true
	elseif World.RefereeState == "Game" then
		return false
	end
	return false
end

function KickoffDefensive:_updateTask()
	return KickoffMirror, {Settings.positionPadding}
end

return KickoffDefensive
