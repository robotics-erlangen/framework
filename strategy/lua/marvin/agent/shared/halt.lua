local Base = require "agent/base/behavior"
local Halt = Class("Agent.Shared.Halt", Base)

local World = require "../base/world"
local HaltTask = require "task/shared/halt"


function Halt:check()
	return World.RefereeState == "Halt"
end

function Halt:_updateTask()
	return HaltTask
end

return Halt
