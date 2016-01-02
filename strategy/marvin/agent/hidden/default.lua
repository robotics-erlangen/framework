local Base = require "agent/base/behavior"
local Default = Class("Agent.Hidden.Default", Base)

local World = require "../base/world"
local RescueRobot = require "task/rescuerobot"


function Default:check()
	return true
end

function Default:_updateTask()
	return RescueRobot
end

return Default
