local Base = require "agent/base/behavior"
local KickoffOffensive = Class("Agent.Attacker.KickoffOffensive", Base)

local debug = require "../base/debug"
local World = require "../base/world"
local G = World.Geometry
local vis = require "../base/vis"
local ShootGoal = require "task/shootgoal"
local Pass = require "task/pass"
local MoveToStaticBall = require "task/movetostaticball"


function KickoffOffensive:check()
	return self._inbox.mainAttacker().trainer == self._robot and
		(World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive")
end


function KickoffOffensive:_updateTask()
	local rob, loc = next(self._inbox.kickoffPass())
	if World.RefereeState == "KickoffOffensivePrepare" then -- wait for kickoff
		return MoveToStaticBall, { math.pi/2, 0.05 }
	elseif rob then --~= nil then-- kickoff
		-- is a player waiting for a kickoffpass
		
		self._send.kickoffStart("all", 1)
		debug.set("kickoffPassSuggestion", "true")
		--end
		
		
		if  self._inbox.targetTime() ~= nil then
			--debug.set("time", self._inbox.targetTime())
			for r, time in pairs(self._inbox.targetTime()) do
				debug.set("r", r)
				debug.set("time", time)
				if time <= 1.90 then
					self._send.kickoffStart("all", 1)
					debug.set("targetTime", "true")
					--return ShootGoal
					for rr, k in pairs(self._inbox.kickoffPass()) do
						return Pass, {r, Vector(k.x, -k.y*0.6)}
					end			
				end
			end
		end
		return MoveToStaticBall, { math.pi/2, 0.05 }
			
	else
		return ShootGoal
	end
end

return KickoffOffensive
