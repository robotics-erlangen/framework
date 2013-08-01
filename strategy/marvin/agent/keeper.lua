local Keeper = (require "../base/class").new("Agent.Keeper", require "agent/base/agent")
local World = require "../base/world"

local Default = require "agent/keeper/default"
local HandleBall = require "agent/keeper/handleball"

Keeper.robotLimit = 1

function Keeper.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot == World.FriendlyKeeper then
			return robot
		end
	end
end

function Keeper:_supplyBehaviors()
	return {
		HandleBall.create(self._robot, self.inbox, self.send),
		Default.create(self._robot, self.inbox, self.send)
	}
end

function Keeper:applyForMainAttacker()
	-- applying always is not a good idea for the keeper
end

function Keeper:keepRobot()
	return self._robot.isVisible and self._robot == World.FriendlyKeeper
end

function Keeper:rateRobot()
	return 1
end

return Keeper
