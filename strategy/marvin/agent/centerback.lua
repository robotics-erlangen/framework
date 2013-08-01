local CenterBack = (require "../base/class").new("Agent.CenterBack", require "agent/base/agent")

local Default = require "agent/centerback/default"
local HandleBall = require "agent/defender/handleball"
local World = require "../base/world"
local Robot = require "observer/robot"
local Rating = require "util/rating"

CenterBack.robotLimit = 1 -- is not considered :(

function CenterBack.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function CenterBack:_supplyBehaviors()
	return {
		HandleBall.create(self._robot, self.inbox, self.send),
		Default.create(self._robot, self.inbox, self.send)
	}
end


function CenterBack:keepRobot()
	return self._robot.isVisible
end

function CenterBack:rateRobot()
	return 1
end

function CenterBack:_applyForMainAttacker()
	local inadequateState = {
		Stop = true,
		PenaltyDefensivePrepare = true,
		PenaltyDefensive = true
	}
	if not inadequateState[World.RefereeState]  then
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		local mainAttackerRating = Rating.timeToRating(timeToBall)
		self.send("trainer").specialRole({mainAttacker = mainAttackerRating})
	end
end

return CenterBack
