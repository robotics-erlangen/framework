local Assistant = (require "../base/class").new("Task.Assistant", require "task/base")

Assistant.priority = 1

function Assistant:_init(pos, radius)
	self._pos = pos
	self._radius = radius
end

function Assistant:_run()

end

return MoveToPos