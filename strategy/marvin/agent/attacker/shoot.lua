local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local Class = require "../base/class"

function Shoot:check() -- mainAttacker fallback behavior
	if self.inbox.mainAttacker().trainer == self._robot then
		return true
	else
		return false
	end
end

function Shoot:updateTask()
	local bestAssistant = ObserverShoot.bestFreeAssistant(self._robot, self.inbox.assistantRating())
	local shootGoalTmp = ShootGoal.create(self._robot, self.inbox, self.send)
	local reachTime = Robot.minTimeToBall(self._robot, World.Ball)
	
	self._pass = bestAssistant and not shootGoalTmp:canShoot() and reachTime < 0.6

	if self._pass then
		return DirectPass, { bestAssistant, true }
	else
		return ShootGoal
	end
end

return Shoot
