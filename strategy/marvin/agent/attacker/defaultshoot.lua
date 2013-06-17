local Base = require "agent/base/behaviour"
local DefaultShoot = (require "../base/class").new("Agent.Attacker.DefaultShoot", Base)
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local World = require "../base/world"

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
		-- shootgoal has a timeout of 0.5 seconds, 1.0 seconds for passing
		local timeout = self._pass and 1 or 0.5
		if self._shootTime + timeout < World.Time then
			return Base.State.Inactive
		end
		return Base.State.CoolDown
	end
	return Base.State.Active
end

function DefaultShoot:_run()
	if not self._task then
		local function canPassTo(r)
			return self._messages[r] and self._messages[r].task.assistantRating 
				and Robot.wayToRobotFree(r, self._robot)
		end
		local function cmpAssistantByRating(r1, r2)
			return self._messages[r1].task.assistantRating > self._messages[r2].task.assistantRating
		end
		local freeAssistants = table.filter(World.FriendlyRobots, canPassTo)
		table.sort(freeAssistants, cmpAssistantByRating)
		local bestRobot = freeAssistants[1]
		
		local shootGoalTask = ShootGoal.create(self._robot)
		local goalChance = shootGoalTask:rate(self._priorityMessages, self._notifications)

		self._pass = bestRobot and goalChance < 1.5 -- 1.5 MAGIC CONSTANT, Andre fragen

		if self._pass then
			self._task = DirectPass.create(self._robot, bestRobot, true)
		else
			self._task = shootGoalTask
		end
	end
end

return DefaultShoot
