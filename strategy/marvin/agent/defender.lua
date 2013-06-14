local Defender = (require "../base/class").new("Agent.Defender", require "agent/base/agent")
local World = require "../base/world"

local Group = require "agent/base/group"
local CenterBack = require "agent/defender/centerback"
local Default = require "agent/defender/default"
local HandleBall = require "agent/defender/handleball"
local Penalty = require "agent/defender/penalty"

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

function Defender:_initBehaviour()
	self._behaviours = Group.create(self._robot, {
		Penalty.create(self._robot),
		CenterBack.create(self._robot),
		HandleBall.create(self._robot),
		Default.create(self._robot)
	})
end

return Defender
