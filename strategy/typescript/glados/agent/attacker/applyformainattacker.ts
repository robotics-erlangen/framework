local Base = require "agent/base/behavior"
local ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local Robot = require "observer/robot"
local Attack = require "util/attack"
local Defense = require "util/defense"


function ApplyForMainattacker:_init()
end

function ApplyForMainattacker:_stop()
	self._applying = false
end

function ApplyForMainattacker:check()
	if Referee.isOpponentPenaltyState() then
		self._applying = false
		return false
	end

	// prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
	if not Referee.isFriendlyFreeKickState() and Robot.ownStandardShooter() == self._robot then
		self._applying = false
		return false
	end

	local applying = false
	local sender, passInfoTable = next(self._inbox.passInfo("broadcast"))
	if Attack.currentPlannedMainAttacker(sender, passInfoTable) == self._robot then
		self:_applyForMainAttacker(nil, nil, 2)
		self._agent.beOffensive = true
		applying = true
	else
		if not Defense.dangerousBallTowardsDefense(true) then
			self:_applyForMainAttacker()
			self._agent.beOffensive = false
			applying = true
		else
			local robotDistToGoal = self._robot.pos:distanceTo(World.Geometry.OpponentGoal)
			local ballDistToGoal = World.Ball.pos:distanceTo(World.Geometry.OpponentGoal)
			local maxDistDiff = (self._applying and -1 or 1) * (World.Ball.radius + self._robot.shootRadius)
			if robotDistToGoal - ballDistToGoal > maxDistDiff then
				self:_applyForMainAttacker()
				self._agent.beOffensive = false
				applying = true
			end
		end
	end
	self._applying = applying
	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
