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

	self.outbox = {} -- initialize message array
	self.send = Messaging.getSender(self)
	self.inboxRaw = {} -- initialize raw inbox
	self.inbox = Messaging.getInbox(self)

	self._behaviors = {
		Halt.create(self._robot, self.inbox, self.send),
		unpack(self:_supplyBehaviors())
	}
	self._activeBehavior = nil
end

function Base:run(messages)
	self.inboxRaw = messages[self._robot] or {} -- happens when entering the game
	self.outbox = {}

	self:_applyForMainAttacker()

	-- choose best behavior
	local bestBehavior = nil
	for _, behavior in ipairs(self._behaviors) do
		if behavior:check() then
			bestBehavior = behavior
			break
		end
	end
	if bestBehavior ~= self._activeBehavior then
		if self._activeBehavior then
			self._activeBehavior:stop()
		end
		self._activeBehavior = bestBehavior
	end
	self._activeBehavior:run()

	self:_dump()

	return self.outbox
end

function Base:keepRobot()
	error("stub")
end

function Base:rateRobot()
	error("stub")
end

function Base:robot()
	return self._robot
end

function Base:_applyForMainAttacker()
	error("stub")
end

function Base:_supplyBehaviors()
	-- return agent-type specific behaviors
	error("stub")
end

function Base:_dump()
	debug.pushtop("Agent " .. self._robot.id)
	debug.set(nil, Class.name(self, true))
	debug.push("inbox")
	for n, func in pairs(self.inbox) do
		debug.push(n)
		for robot, msg in pairs(func()) do
			debug.set(robot.id or robot, msg)
		end
		debug.pop()
	end
	debug.pop()
	debug.set("behavior", Class.name(self._activeBehavior, true))
	debug.set("task", Class.name(self._activeBehavior._task, true))
	debug.pop()
end

return Base
