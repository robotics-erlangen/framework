local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local Class = require "../base/class"

local USE_ADVANCED_DECISION_MAKING = false

--TODO implement perfect estimate functions
local p_hasBall_receivePass = function() return 0.8 end
local p_hasBall_goal = function() return 0.5 end
local p_receivePass_hasBall = function() return 0.9 end
local p_receivePass_volley = function() return 0.9 end
local p_volley_receivePass = function() return 0.7 end
local p_volley_goal = function() return 0.6 end



function Shoot:check() -- mainAttacker fallback behavior
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_updateTask()
	if USE_ADVANCED_DECISION_MAKING then
		--TODO
		log("advanced decision making not implemented")
		return ShootGoal
	else
		local bestAssistant = ObserverShoot.bestFreeAssistant(self._robot, self._inbox.assistantRating("ignorePriority"))
		local shootGoalTmp = ShootGoal.create(self._agent)
		local reachTime = Robot.minTimeToBall(self._robot, World.Ball)
		
		self._pass = bestAssistant and not shootGoalTmp:canShoot() and reachTime < 0.6
    
		if self._pass then
			return DirectPass, { bestAssistant, true }
		else
			return ShootGoal
		end
	end
end

return Shoot
