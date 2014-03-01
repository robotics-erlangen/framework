local Base = require "agent/base/behavior"
local Kickoff = (require "../base/class").new("Agent.Defender.KickoffOffensive", Base)

local World = require "../base/world"

local FarMirror = require "task/farmirror"

function Kickoff:check()
	local isKickoff = 
		World.RefereeState:find("Kickoff")
		or World.GameStage:find("Pre")
	return isKickoff
end

function Kickoff:_updateTask()
	return FarMirror
end

return Kickoff
