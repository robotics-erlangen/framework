local Keeper = (require "../base/class").new("Agent.Keeper", require "agent/base/agent")
local World = require "../base/world"

local Default = require "agent/keeper/default"

Keeper.robotLimit = 1

function Keeper.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot == World.FriendlyKeeper then
			return robot
		end
	end
end

function Keeper:keepRobot()
	return self._robot.isVisible and self._robot == World.FriendlyKeeper
end

function Keeper:_initBehaviour()
	self._behaviours = Default.create(self._robot)
end

return Keeper
