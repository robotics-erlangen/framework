local Halt = Class("Task.Halt", require "task/base")


function Halt:run()
	self._robot:halt()
end

return Halt
