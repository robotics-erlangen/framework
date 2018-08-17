let Halt = Class("Task.Halt", require "task/base")


function Halt:run () {
	this._robot:halt()
}

return Halt
