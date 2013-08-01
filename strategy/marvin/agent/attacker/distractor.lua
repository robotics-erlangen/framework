local Base = require "agent/base/behavior"
local Distractor = (require "../base/class").new("Agent.Attacker.Distractor", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Class = require "../base/class"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local DistractorTask = require "task/distractor"
 
function Distractor:check()
	local isFreeKick = World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive"
	-- count the number of mainAttacker-canditates
	-- (equals the number of robots in the attack pool unless a defender handles the ball)
	local maCounter = 1 --FIXME anders lösen!
	-- for _,m in pairs(self._messages) do
	-- 	if m.agent.specialTask and m.agent.specialTask.mainAttacker then
	-- 		maCounter = maCounter + 1
	-- 	end
	-- end
	--[[if self._state ~= Base.State.Active then
		self.startTime = World.Time
	end]]
	
	return isFreeKick and maCounter >= 4
end

function Distractor:_updateTask()
	if not self._task then
		log("DISTRACTOR")
	end
	return DistractorTask
end

return Distractor
