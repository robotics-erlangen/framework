local Base = require "agent/base/behaviour"
local Kickoff = (require "../base/class").new("Agent.Defender.Kickoff", Base)

local World = require "../base/world"

local FarMirror = require "task/farmirror"

function Kickoff:_check()
	local isKickoff = World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive"
	return isKickoff and Base.State.Active or Base.State.Inactive
end

function Kickoff:_run()
	if not self._task then
		self._task = FarMirror.create(self._robot)	
	end
end

return Kickoff
