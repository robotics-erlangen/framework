local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local Class = require "../base/class"

local USE_ADVANCED_DECISION_MAKING = true

--TODO implement perfect estimate functions
local p_receivePass_hasBall = function() return 0.9 end			-- receivePass
local p_receivePass_volley = function() return 0.9 end			-- receiveVolley
local p_hasBall_receivePass = function() return 0.7 end			-- pass
local p_volley_receivePass = function() return 0.6 end			-- passVolley
local p_hasBall_goal = function() return 0.5 end				-- shootGoal
local p_volley_goal = function() return 0.6 end					-- shootGoalVolley

local rewards = {["has ball"] = 0, ["receive pass"] = 0, ["volley"] = 0, ["goal"] = 100, ["ball lost"] = -20}

function Shoot:check() -- mainAttacker fallback behavior
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_decide(state, depth)
	if state == "goal" or state == "ball lost" or depth == 5 then
		return rewards[state]
	end

	if state == "has ball" then
		local p_pass = p_hasBall_receivePass() 
		local b_pass = p_pass * self:_decide("receive pass", depth+1)
				+ (1-p_pass) * self:_decide("ball lost", depth+1)

		local p_shootGoal = p_hasBall_goal()
		local b_shootGoal = p_shootGoal * self:_decide("goal", depth+1)
				+ (1-p_shootGoal) * self:_decide("ball lost", depth+1)

		if b_pass > b_shootGoal then
			return b_pass, "pass"
		else
			return b_shootGoal, "shootGoal"
		end

	elseif state == "receive pass" then
		local p_receivePass = p_receivePass_hasBall()
		local b_receivePass = p_receivePass * self:_decide("has ball", depth+1)
				+ (1-p_receivePass) * self:_decide("ball lost", depth+1)
		
		local p_receiveVolley = p_receivePass_volley()
		local b_receiveVolley = p_receiveVolley * self:_decide("volley", depth+1)
				+ (1-p_receiveVolley) * self:_decide("ball lost", depth+1)

		if b_receivePass > b_receiveVolley then
			return b_receivePass, "receivePass"
		else
			return b_receiveVolley, "receiveVolley"
		end

	elseif state == "volley" then
		local p_passVolley = p_volley_receivePass()
		local b_passVolley = p_passVolley * self:_decide("receive pass", depth+1)
				+ (1-p_passVolley) * self:_decide("ball lost", depth+1)

		local p_shootGoalVolley = p_volley_goal()
		local b_shootGoalVolley = p_shootGoalVolley * self:_decide("goal", depth+1)
				+ (1-p_shootGoalVolley) * self:_decide("ball lost", depth+1)
	
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
		log("SHOOT: decide for "..decision.." with benefit = "..benefit)

		--TODO
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
