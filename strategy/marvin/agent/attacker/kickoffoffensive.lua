local Base = require "agent/base/behavior"
local KickoffOffensive = Class("Agent.Attacker.KickoffOffensive", Base)

local World = require "../base/world"

local MoveToStaticBall = require "task/movetostaticball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local ShootGoalUtil = require "util/shootgoal"


local MIN_ANGLE_PRECISION = 1 / 180 * math.pi


function KickoffOffensive:check()
	return self._inbox.mainAttacker().trainer == self._robot and
		(World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive")
end


function KickoffOffensive:_updateTask()
	local sg_target, sg_mae = ShootGoalUtil.updateTarget(self._robot, nil, false)
	local canShootGoal = sg_mae and sg_mae > MIN_ANGLE_PRECISION

	local rob, _ = next(self._inbox.kickoffPass())
	if World.RefereeState == "KickoffOffensivePrepare" then -- wait for kickoff
		return MoveToStaticBall, { math.pi/2, 0.05 }
	elseif canShootGoal then -- shoot if it is possible
		return ShootGoal
	elseif rob then --pass the ball
		self._send.kickoffStart("all", 1)
		return Pass, {rob, 1.2}
	else
		return ShootGoal
	end
end

return KickoffOffensive
