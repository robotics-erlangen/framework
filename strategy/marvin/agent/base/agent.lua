local Base = (require "../base/class").new("Agent.Base.Agent")
local Class = require "../base/class"
local debug = require "../base/debug"
local World = require "../base/world"
local Message = require "agent/base/message"

local Group = require "agent/base/group"
local Halt = require "agent/shared/halt"
local Play = require "agent/shared/play"

function Base.takeRobot(robots)
	error("stub")
end

function Base:keepRobot()
	error("stub")
end

function Base:rateRobot()
	error("stub")
end

function Base:_initBehaviour()
	error("stub")
	-- self._behaviours = ...
end

function Base:init(robot)
	self._robot = robot
	-- setup behaviours and add defaults
	self:_initBehaviour()
	self._behaviours = Group.create(self._robot, {
		Halt.create(self._robot),
		Play.create(self._robot),
		self._behaviours
	})
end

function Base:run(messages)
	local ownMessages = messages:own(self._robot)
	local priorityMessages, notifications = messages:split(self._robot)
	local trainerMessage = messages:trainer()

	local behaviour, agentMessage = self._behaviours:run(false, ownMessages, 
			priorityMessages, notifications, trainerMessage)
	local task = behaviour and behaviour:task()

	debug.pushtop("Agents")
	local behaviourName = behaviour and ("(" .. Class.name(behaviour, true) .. ")") or ""
	debug.push("Robot " .. self._robot.id, Class.name(self, true) .. " " .. behaviourName)
	
	local taskMessage
	if task then
		debug.push("Task", Class.name(task))
		taskMessage = task:run(priorityMessages, notifications)
		debug.pop()
	else
		debug.set("Task", nil)
	end
	
	debug.pop()
	debug.pop()
	
	local priority = task and task.priority or 0
	return Message.Container.create{agent = agentMessage, task = taskMessage or {}}, priority
end

function Base:robot()
	return self._robot
end

return Base
