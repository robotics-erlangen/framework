local Base = require "agent/base/behavior"
local Penalty = Class("Agent.Attacker.Penalty", Base)

local World = require "../base/world"

local MoveToStaticBall = require "task/movetostaticball"
local ShootGoal = require "task/shootgoal"
local ShootPenalty = require "task/shootpenalty"


function Penalty:check()
	local mainAttacker = self._inbox.mainAttacker().trainer == self._robot
	local isPenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	return isPenalty and mainAttacker
end

function Penalty:_updateTask()
	if not self.lookDir then
		self.lookDir = "Right"
		if math.random() < 0.5 then
			self.lookDir = "Left"
		end
	end

	if World.RefereeState == "PenaltyOffensivePrepare" then
		return MoveToStaticBall, {(World.Geometry["OpponentGoal"..self.lookDir] - World.Ball.pos):angle(), 0.08}
	else -- PenaltyOffensive
		return ShootPenalty, {self.lookDir }
	end
end

function Penalty:_stop()
	self.lookDir = nil
end

return Penalty
