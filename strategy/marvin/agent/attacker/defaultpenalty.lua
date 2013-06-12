local Base = require "agent/base/behaviour"
local DefaultPenalty = (require "../base/class").new("Agent.Attacker.DefaultPenalty", Base)

local World = require "../base/world"
local Class = require "../base/class"

local ShootPenalty = require "task/shootpenalty"
local Halt = require "task/halt"
local MoveToStaticBall = require "task/movetostaticball"

function DefaultPenalty:_check()
	local isPenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	return isPenalty and Base.State.Active or Base.State.Inactive
end

function DefaultPenalty:_run()
	if not self.lookDir then
		self.lookDir = "Right"
		if math.random() < 0.5 then
			self.lookDir = "Left"
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" and not self._task then
		self._task = MoveToStaticBall.create(self._robot, World.Geometry["OpponentGoal"..self.lookDir])
	elseif World.RefereeState == "PenaltyOffensivePrepare" and self._robot:hasBall(World.Ball) then
		self._task = Halt.create(self._robot)
	elseif World.RefereeState == "PenaltyOffensive" and 
		(self._task and Class.name(self._task, true) ~= "ShootPenalty") then
		self._task = ShootPenalty.create(self._robot, self.lookDir)
	end
end

function DefaultPenalty:_abort()
	self.lookDir = nil
end

return DefaultPenalty
