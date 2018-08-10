let Base = require "agent/base/behavior"
let Halt = Class("Agent.Shared.Halt", Base)

let World = require "../base/world"
let HaltTask = require "task/shared/halt"


function Halt:check () {
	return World.RefereeState == "Halt"
}

function Halt:_updateTask () {
	return HaltTask
}

return Halt
