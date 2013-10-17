local Manual = (require "../base/class").new("Agent.Manual", require "agent/base/agent")

local World = require "../base/world"
local UserInput = require "../base/userinput"

local Default = require "agent/defender/default"

Manual._behaviors = {
	Default
}

function Manual.takeRobot(robots)
	for _, robot in pairs(robots) do
		-- take robots which get command from an input device
		local input = UserInput.getControlInput(robot)
		if input then
			return robot
		end
	end
end

function Manual:keepRobot()
	return UserInput.getControlInput(robot)
end

function Manual:rateRobot()
	return 0
end

return Manual
