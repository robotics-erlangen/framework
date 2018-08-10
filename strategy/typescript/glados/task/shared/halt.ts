let Halt = Class("Task.Halt", require "task/base")


function Halt:run () {
	self._robot:halt()
}

return Halt
