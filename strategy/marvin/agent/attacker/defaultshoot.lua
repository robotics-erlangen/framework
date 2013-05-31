local Base = require "agent/base/behaviour"
local DefaultShoot = (require "../base/class").new("Agent.Attacker.DefaultShoot", Base)
local Ball = require "observer/ball"
local World = require "../base/world"
local Observer = require "observer/ball"

local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"

function DefaultShoot:_init()
	-- these values are only used during cool down
	self._pass = false
	self._shootTime = 0
end

function DefaultShoot:_check()
	if self._state == Base.State.Active and Ball.isShot() then -- I've shot the ball
		self._shootTime = World.Time
		return Base.State.CoolDown
	elseif self._state == Base.State.CoolDown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return Base.State.Inactive
		end
		-- shootgoal has a timeout of 0.5 seconds, 2 seconds for passing
		local timeout = self._pass and 2 or 0.5
		if self._shootTime + timeout < World.Time then
			return Base.State.Inactive
		end
		return Base.State.CoolDown
	end
	return Base.State.Active
end

function DefaultShoot:_run()
	if not self._task then
		local bestRobot = nil
		local bestRating = -1
		for robot, msg in pairs(self._messages) do
			local rating = msg.task.assistantRating
			if rating and rating > bestRating and Observer.wayToRobotFree(robot, self._robot) then
				bestRobot = robot
				bestRating = rating
			end
		end
		self._pass = bestRobot -- and math.random(100) < 70
		if self._pass then
			self._task = DirectPass.create(self._robot, bestRobot, true)
		else
			self._task = ShootGoal.create(self._robot)
		end
	end
end

return DefaultShoot
