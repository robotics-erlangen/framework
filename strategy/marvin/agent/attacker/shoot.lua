local Base = require "agent/base/behaviour"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local Class = require "../base/class"

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
	if not self._task then
		local bestAssistant = ObserverShoot.bestFreeAssistant(self._robot, self._messages)
		local shootGoalTask = ShootGoal.create(self._robot)
		local reachTime = Robot.minTimeToBall(self._robot, World.Ball)
		
		self._pass = bestAssistant and not shootGoalTask:canShoot() and reachTime < 0.6

		if self._pass then
			self._task = DirectPass.create(self._robot, bestAssistant, true)
		else
			self._task = shootGoalTask
		end
	end
end

return Shoot
