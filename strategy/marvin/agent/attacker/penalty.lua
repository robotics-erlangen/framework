local Base = require "agent/base/behaviour"
local Penalty = (require "../base/class").new("Agent.Attacker.Penalty", Base)

local World = require "../base/world"
local Class = require "../base/class"

local ShootPenalty = require "task/shootpenalty"
local Halt = require "task/halt"
local MoveToStaticBall = require "task/movetostaticball"

function Penalty:_check()
	local isPenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	return isPenalty and Base.State.Active or Base.State.Inactive
end

function Penalty:_run()
	if not self.lookDir then
		self.lookDir = "Right"
		if math.random() < 0.5 then
			self.lookDir = "Left"
		end
	end

	if World.RefereeState == "PenaltyOffensivePrepare" then
		if self._robot:hasBall(World.Ball) then
			if not self._task or Class.name(self._task, true) ~= "Halt" then
				self._task = Halt.create(self._robot)
			end
		else
			if not self._task or Class.name(self._task, true) ~= "MoveToStaticBall" then
				self._task = MoveToStaticBall.create(self._robot, World.Geometry["OpponentGoal"..self.lookDir])
			end
		end
	elseif World.RefereeState == "PenaltyOffensive" then
		if not self._task or Class.name(self._task, true) ~= "ShootPenalty" then
			self._task = ShootPenalty.create(self._robot, self.lookDir)
		end
	end
end

function Penalty:_stop()
	self.lookDir = nil
end

return Penalty
