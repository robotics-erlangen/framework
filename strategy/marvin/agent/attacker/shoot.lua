local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local Volley = require "task/volley"
local Class = require "../base/class"

local USE_ADVANCED_DECISION_MAKING = false

--TODO implement perfect estimate functions
-- receivePass
local p_receivePass_hasBall = function() return 0.9 end
local t_receivePass_hasBall = function() return 0.8 end

-- receiveVolley
local p_receivePass_volley = function() return 0.9 end	
local t_receivePass_volley = function() return 0.2 end		

-- pass	
local p_hasBall_receivePass = function() return 0.7 end		
local t_hasBall_receivePass = function() return 1.0 end

-- passVolley
local p_volley_receivePass = function() return 0.6 end
local t_volley_receivePass = function() return 1.0 end

-- shootGoal
local p_hasBall_goal = function() return 0.5 end
local t_hasBall_goal = function() return 0.7 end

-- shootGoalVolley
local p_volley_goal = function() return 0.6 end
local t_volley_goal = function() return 0.6 end



local rewards = {["has ball"] = 0, ["receive pass"] = 0, ["volley"] = 0, ["goal"] = 100, ["ball lost"] = -20}

function Shoot:check() -- mainAttacker fallback behavior
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_decide(state, time)
	if state == "goal" or state == "ball lost" or time >= 5 then
		return rewards[state]
	end

	if state == "has ball" then
		local t_pass = t_hasBall_receivePass()
		local p_pass = p_hasBall_receivePass() 
		local b_pass = p_pass * self:_decide("receive pass", time + t_pass)
				+ (1-p_pass) * self:_decide("ball lost", time + t_pass)

		local t_shootGoal = t_hasBall_goal()
		local p_shootGoal = p_hasBall_goal()
		local b_shootGoal = p_shootGoal * self:_decide("goal", time + t_shootGoal)
				+ (1-p_shootGoal) * self:_decide("ball lost", time + t_shootGoal)

		if b_pass > b_shootGoal then
			return b_pass, "pass"
		else
			return b_shootGoal, "shootGoal"
		end

	elseif state == "receive pass" then
		local t_receivePass = t_receivePass_hasBall()
		local p_receivePass = p_receivePass_hasBall()
		local b_receivePass = p_receivePass * self:_decide("has ball", time + t_receivePass)
				+ (1-p_receivePass) * self:_decide("ball lost", time + t_receivePass)
		
		local t_receiveVolley = t_receivePass_volley()
		local p_receiveVolley = p_receivePass_volley()
		local b_receiveVolley = p_receiveVolley * self:_decide("volley", time + t_receiveVolley)
				+ (1-p_receiveVolley) * self:_decide("ball lost", time + t_receiveVolley)

		if b_receivePass > b_receiveVolley then
			return b_receivePass, "receivePass"
		else
			return b_receiveVolley, "receiveVolley"
		end

	elseif state == "volley" then
		local t_passVolley = t_volley_receivePass()
		local p_passVolley = p_volley_receivePass()
		local b_passVolley = p_passVolley * self:_decide("receive pass", time + t_passVolley)
				+ (1-p_passVolley) * self:_decide("ball lost", time + t_passVolley)

		local t_shootGoalVolley = t_volley_goal()
		local p_shootGoalVolley = p_volley_goal()
		local b_shootGoalVolley = p_shootGoalVolley * self:_decide("goal", time + t_shootGoalVolley)
				+ (1-p_shootGoalVolley) * self:_decide("ball lost", time + t_shootGoalVolley)
	
		if b_passVolley > b_shootGoalVolley then
			return b_passVolley, "passVolley"
		else
			return b_shootGoalVolley, "shootGoalVolley"
		end
	end
end

function Shoot:_updateTask()
	if USE_ADVANCED_DECISION_MAKING then
		
		local benefit, decision = self:_decide("has ball", 0)
		--log("SHOOT: decide for "..decision.." with benefit = "..benefit)

		--TODO
		return ShootGoal
	else
		local bestAssistant = ObserverShoot.bestFreeAssistant(self._robot, self._inbox.attackerFlag("ignorePriority"))
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
