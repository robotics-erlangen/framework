local CenterBack = (require "../base/class").new("Agent.CenterBack", require "agent/base/agent")

local World = require "../base/world"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "util/referee"

local Default = require "agent/centerback/default"
local HandleBall = require "agent/defender/handleball"
local Penalty = require "agent/defender/penalty"

CenterBack._behaviors = {
	Penalty,
	HandleBall,
	Default
}

function CenterBack.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function CenterBack:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

function CenterBack:rateRobot()
	return 1
end

return CenterBack
