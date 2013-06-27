local Base = require "agent/base/behaviour"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"

function Shoot:_init()
	-- these values are only used during cool down
	self._bestAssistant = nil
	self._pass = false
	self._shootTime = 0
end

function Shoot:_check()
	if self._state == Base.State.Active and Ball.isShot() then -- I've shot the ball
		self._shootTime = World.Time
		return Base.State.CoolDown
	elseif self._state == Base.State.CoolDown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return Base.State.Inactive
		end
		-- shootgoal has a timeout of 0.5 seconds, 1.0 seconds for passing
		local timeout = self._pass and 1 or 0.5
		if self._shootTime + timeout < World.Time then
			return Base.State.Inactive
		end
		return Base.State.CoolDown
	end
	return Base.State.Active
end

function Shoot:_run()
	local bestAssistant = ObserverShoot.bestFreeAssistant(self._robot, self._messages)
	
	local rating = bestAssistant and ObserverShoot.rateAssistant(bestAssistant) or 0
	local oldRating = self._bestAssistant and ObserverShoot.rateAssistant(self._bestAssistant) or 0 
	local hyst = World.Geometry.FieldHeightQuarter / 2

	if not self._task or 
		(self._bestAssistant ~= bestAssistant and rating > oldRating+hyst) then
		
		self._bestAssistant = bestAssistant
		local shootGoalTask = ShootGoal.create(self._robot)
		self._pass = bestAssistant and not shootGoalTask:canShoot()

		if self._pass then
			self._task = DirectPass.create(self._robot, bestAssistant, true)
		else
			self._task = shootGoalTask
		end
	end
end

return Shoot
