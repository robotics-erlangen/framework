local Defender = (require "../base/class").new("Agent.Defender", require "agent/base/agent")

local World = require "../base/world"

local Default = require "agent/defender/default"
local HandleBall = require "agent/defender/handleball"
local Penalty = require "agent/defender/penalty"
local KickoffOffensive = require "agent/defender/kickoffoffensive"

Defender._behaviors = {
	Penalty,
	KickoffOffensive,
	HandleBall,
	Default
}

function Defender.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Defender:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

-- worse rating if robot if farther away from own goal
function Defender:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return 0
	end
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
end

return Defender
