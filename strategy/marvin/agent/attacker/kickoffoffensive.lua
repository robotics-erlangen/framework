local Base = require "agent/base/behavior"
local KickoffOffensive = Class("Agent.Attacker.KickoffOffensive", Base)

local World = require "../base/world"
local G = World.Geometry
local vis = require "../base/vis"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"


function KickoffOffensive:check()
	return self._inbox.mainAttacker().trainer == self._robot and
		(World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive")
end


function KickoffOffensive:_updateTask()
	if World.RefereeState == "KickoffOffensivePrepare" then
		return MoveToStaticBall, { math.pi/2, 0.05 }
	else
		return ShootGoal
	end
end

return KickoffOffensive
