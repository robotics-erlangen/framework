local Defender = (require "../base/class").new("Agent.Defender", require "agent/base/agent")

local World = require "../base/world"

local Penalty = require "agent/defender/penalty"
local KickoffOffensive = require "agent/defender/kickoffoffensive"
local HandleBall = require "agent/defender/handleball"
local CenterBack = require "agent/defender/centerback"
local Default = require "agent/defender/default"

Defender._behaviors = {
	Penalty,
	HandleBall,
	CenterBack,
	KickoffOffensive,
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
