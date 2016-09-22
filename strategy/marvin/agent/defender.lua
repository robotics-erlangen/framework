local Base = require "agent/base/agent"
local Defender = Class("Agent.Defender", Base)

local World = require "../base/world"

local Default = require "agent/defender/default"
local HandleBall = require "agent/defender/handleball"
local ManMark = require "agent/defender/manmark"
local ZoneDefense = require "agent/defender/zonedefense"
local Penalty = require "agent/defender/penalty"

local Messaging = require "control/messaging"
local Move = require "moves/moveBehavior"


Defender._behaviors = {
	Penalty,
	Move,
	HandleBall,
	ManMark,
	ZoneDefense,
	Default
}

function Defender:_run()
	self._activeBehavior._send.defenderFlag("all")
end

function Defender.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Defender:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot if farther away from own goal
function Defender:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool() then
		return math.huge
	end
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
end

return Defender
