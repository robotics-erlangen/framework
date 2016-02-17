local Base = Class("Agent.Base.Agent")

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local Halt = require "agent/shared/halt"
local Messaging = require "control/messaging"
local Physics = require "observer/physics"
local Rating = require "util/rating"


-- static method for pool
function Base.takeRobot(robots)
	error("stub")
end

function Base:init(robot)
	self._robot = robot
	self._task = nil
	self._send, self._inbox = Messaging.registerAgent(self)
	-- behaviors are ordered by decreasing priority
	self._behaviors = {
		Halt(self),
		unpack(table.map(self._behaviors,
			function (B) return B(self) end)
		)
	}
	self._activeBehavior = nil
	self._mainAttackerParameters = nil
end

function Base:_run()
end

function Base:run()
	debug.pushtop("Agent " .. self._robot.id)
	debug.set(nil, Class.name(self, true))

	self:_updateBehavior()
	self:_runTaskAndBehavior()
	self:_applyForMainAttacker()
	self:_run()

	debug.pop() -- Agent
end

function Base:_updateBehavior()
	-- choose best behavior, that is the behavior with the highest priority of all useable ones
	local bestBehavior = nil
	for _, behavior in ipairs(self._behaviors) do
		if behavior:check() then
			bestBehavior = behavior
			break
		end
	end
	-- check if the behavior has changed
	if bestBehavior ~= self._activeBehavior then
		if self._activeBehavior then
			self._activeBehavior:stop()
		end
		self._activeBehavior = bestBehavior
	end
end

function Base:_runTaskAndBehavior()
	if self._activeBehavior then
		debug.set("Behavior", Class.name(self._activeBehavior, true))
		self._activeBehavior:run()
	else
		debug.set("Behavior", "none")
	end
	debug.push("Inbox")
	for name, func in pairs(self._inbox) do
		debug.push(name)
		for sender, msg in pairs(func()) do
			debug.set(sender.id or sender, msg)
		end
		debug.pop() -- name
	end
	debug.pop() -- Inbox
	debug.push("Task")
	if self._task then
		self._task:clearMainAttackerParameters()
		self._task:run()
		debug.set(nil, Class.name(self._task, true))
	else
		debug.set(nil, "none")
	end
	debug.pop() -- Task
end

function Base:_applyForMainAttacker()
	-- the keeper just overrides this
	local parameters = nil
	for _, behavior in ipairs(self._behaviors) do
		parameters = behavior:mainAttackerParameters() or parameters
		if behavior == self._activeBehavior then
			break
		end
	end
	if parameters and self._task then
		-- only use task parameters if behavior asked for main attacker application
		parameters = self._task:mainAttackerParameters() or parameters
	end
	if not parameters then
		return
	end

	if not Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) then
		local targetPos = parameters[1] or World.Geometry.OpponentGoal
		local endSpeedLength = parameters[2] or 0

		local timeToBall = Physics.robotTimeToBall(self._robot,
			World.Ball, targetPos, endSpeedLength)
		local mainAttackerRating = Rating.timeToRating(timeToBall)
		debug.set("ma application sent", true)
		self._send.exclusiveRole("trainer", {mainAttacker = mainAttackerRating})
	end
end

-- controls whether the robot may be kept in its pool
function Base:keepRobot()
	error("stub")
end

-- rate robot for deciding which robots to keep in the pool
-- the robots with the lowest rating are removed until the robot limit is satisfied
function Base:rateRobot()
	error("stub")
end

function Base:setTask(task)
	self._task = task
end

function Base:task()
	return self._task
end

function Base:robot()
	return self._robot
end

return Base
