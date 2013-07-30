local Base = require "agent/base/behavior"
local KickoffOffensive = (require "../base/class").new("Agent.Defender.KickoffOffensive", Base)

local World = require "../base/world"

local FarMirror = require "task/farmirror"

function KickoffOffensive:check()
	local isKickoff = World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive"
	return isKickoff
end

function KickoffOffensive:updateTask()
	return FarMirror
end

return KickoffOffensive
