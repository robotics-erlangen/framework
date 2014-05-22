local Defender = (require "../base/class").new("Agent.Defender", require "agent/base/agent")

local World = require "../base/world"

local Penalty = require "agent/defender/penalty"
local Kickoff = require "agent/defender/kickoff"
local HandleBall = require "agent/defender/handleball"
local ManMark = require "agent/defender/manmark"
local Default = require "agent/defender/default"
local Messaging = require "control/messaging"

Defender._behaviors = {
	Kickoff,
	Penalty,
	HandleBall,
	ManMark,
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
	if self._activeBehavior and self._activeBehavior:requestingPoolChange() then
		return false
	end
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot if farther away from own goal
function Defender:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return 0
	end
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
end

return Defender
