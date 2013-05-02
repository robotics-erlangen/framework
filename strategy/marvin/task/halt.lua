local Halt = (require "../base/class").new("Task.Halt", require "task/base")

Halt.priority = 10

function Halt:_init()
end

function Halt:_run()
	self._robot:halt()
end

function Halt:_rate()
	return 1
end

return Halt
