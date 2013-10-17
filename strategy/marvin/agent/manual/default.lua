local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Manual.Default", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Rating = require "util/rating"

local Manual = require "task/manual"

function Default:check()	
	-- apply for main attacker
	local mainAttackerRating = 0
	if Ball.friendlyBallOwner() == self._robot then
		mainAttackerRating = 1.5
	else
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		mainAttackerRating = Rating.timeToRating(timeToBall) * 1.5 --small rating bonus to please the human player
	end
	
	-- look for incoming passes
	for r, _ in pairs(self._inbox.passSender()) do --tests if table has content, runs 0-1 times, otherwise BUG
		mainAttackerRating = 1.5
	end
	self._send("trainer").specialRole({mainAttacker = mainAttackerRating})

	-- play assistant
	self._send("all").assistantRating(42)

	return true
end

function Default:_updateTask()
	return Manual
end

return Default
