local Base = (require "../base/class").new("Agent.Base")

function Base.takeRobot(robots)
	error("stub")
end

function Base:init(robot)
	self._robot = robot
	self._task = nil
end

function Base:run(messages)
	debug.pushtop(self.classNameShort.."-agent: robot "..robot.id)
	local agentMessage, taskMessage
	local play = messages:trainer().play
	if play and play[self._robot] then
		self._task = play[self._robot]
	else
		agentMessage = self:_run(messages:split(self._robot), messages:trainer())
	end
	if not self._task then
		taskMessage = self._task:run(messages:split(self._robot))
	end
	debug.pop()
	return {agent = agentMessage, task = taskMessage}
end

return Base
