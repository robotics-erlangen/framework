local Base = (require "../base/class").new("Agent.Base")
local Class = require "../base/class"
local debug = require "../base/debug"

function Base.takeRobot(robots)
	error("stub")
end

function Base:init(robot)
	self._robot = robot
	self._task = nil
	self._playControlled = false
end

function Base:run(messages)
	debug.pushtop("Agents")
	debug.push("Robot " .. self._robot.id)
	debug.set(nil, Class.name(self, true))
	local agentMessage, taskMessage
	
	local priorityMessages, notifications = messages:split(self._robot)
	local trainerMessage = messages:trainer()
	
	local play = trainerMessage.play
	if play and play[self._robot] then
		self._task = play[self._robot]
		self._playControlled = true
	else
		if self._playControlled then
			self._playControlled = false
			self._task = nil -- reset task after play has finished
		end
		-- sets self._task
		agentMessage = self:_run(priorityMessages, notifications, trainerMessage)
	end
	
	if self._task then
		debug.push("Task" .. (self._playControlled and " (Play)" or ""))
		debug.set(nil, Class.name(self._task))
		taskMessage = self._task:run(priorityMessages, notifications)
		debug.pop()
	else
		debug.set("Task", nil)
	end
	
	debug.pop()
	debug.pop()
	
	local priority = self._task and self._task.priority or 0
	return {agent = agentMessage or {}, task = taskMessage or {}}, priority
end

return Base
