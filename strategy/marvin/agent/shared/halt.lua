local Base = require "agent/base/behavior"
local Halt = (require "../base/class").new("Agent.Shared.Halt", Base)

local World = require "../base/world"
local HaltTask = require "task/halt"

function Halt:check()
	return World.RefereeState == "Halt"
end

function Halt:updateTask()
	return HaltTask
end

return Halt
