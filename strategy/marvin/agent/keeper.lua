local Keeper = (require "../base/class").new("Agent.Keeper", require "agent/base/agent")
local World = require "../base/world"

local Default = require "agent/keeper/default"
local HandleBall = require "agent/keeper/handleball"
local Group = require "agent/base/group"

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

function Keeper:rateRobot()
	return 1
end

function Keeper:_initBehaviour()
	self._behaviours = Group.create(self._robot, {
		HandleBall.create(self._robot),
		Default.create(self._robot)
	})
end

return Keeper
