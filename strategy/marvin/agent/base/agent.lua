local Base = (require "../base/class").new("Agent.Base.Agent")
local Class = require "../base/class"
local debug = require "../base/debug"

local Messaging = require "control/messaging"
local Halt = require "agent/shared/halt"

-- static method for pool
function Base.takeRobot(robots)
	error("stub")
end

function Base:init(robot)
	self._robot = robot
	self._task = nil
	-- behaviors are ordered by decreasing priority
	self._behaviors = {
		Halt.create(self),
		unpack(table.map(self._behaviors, 
			function (B) return B.create(self) end)
		)
	}
	self._activeBehavior = nil
	Messaging.registerAgent(self)
end

function Base:run()
	debug.pushtop("Agent " .. self._robot.id)
	debug.set(nil, Class.name(self, true))

	self:_updateBehavior()
	self:_runTaskAndBehavior()
	
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
	debug.push("Task")
	if self._task then
		self._task:run()
		debug.set(nil, Class.name(self._task, true))
		debug.push("Inbox")
		for n, func in pairs(self._task._inbox) do
			debug.push(n)
			for robot, msg in pairs(func()) do
				debug.set(robot.id or robot, msg)
			end
			debug.pop() -- n
		end
		debug.pop() -- Inbox
	else
		debug.set(nil, "none")
	end
	debug.pop() -- Task
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

function Base:robot()
	return self._robot
end

return Base
