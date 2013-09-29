local Halt = (require "../base/class").new("Task.Halt", require "task/base")

Halt.priority = 10

function Halt:_init()
end

function Halt:run()
	self._robot:halt()
end

return Halt
