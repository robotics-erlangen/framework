local Base = require "agent/base/behavior"
local KickoffOffensive = Class("Agent.Attacker.KickoffOffensive", Base)

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"

local MoveToStaticBall = require "task/movetostaticball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"


local G = World.Geometry
local MIN_ANGLE_PRECISION = 1 / 180 * math.pi


function KickoffOffensive:check()
	return self._inbox.mainAttacker().trainer == self._robot and
		(World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive")
end


function KickoffOffensive:_updateTask()

	local shootGoalTmp = ShootGoal(self._agent)
	local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
	local canShootGoal = sg_mae and sg_mae > MIN_ANGLE_PRECISION

	local rob, loc = next(self._inbox.kickoffPass())
	if World.RefereeState == "KickoffOffensivePrepare" then -- wait for kickoff
		return MoveToStaticBall, { math.pi/2, 0.05 }
	elseif canShootGoal then -- shoot if it is possible
		return ShootGoal
	elseif rob then --pass the ball
		-- is a player waiting for a kickoffpass
		
		self._send.kickoffStart("all", 1)
		debug.set("kickoffPassSuggestion", "true")
		
		if  self._inbox.targetTime() ~= nil then
			--debug.set("time", self._inbox.targetTime())
			for r, time in pairs(self._inbox.targetTime()) do
				debug.set("r", r)
				debug.set("time", time)
				if time <= 1.90 then -- use this to time the pass best if robot is at full speed when you pass
					self._send.kickoffStart("all", 1)
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
