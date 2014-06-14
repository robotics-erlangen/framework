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
		mainAttackerRating = Rating.timeToRating(timeToBall) * 1.3 --small rating bonus to please the human player
	end

	-- look for incoming passes
	for _,_ in pairs(self._inbox.passSender()) do --tests if table has content, runs 0-1 times, otherwise BUG
		self._lastPass = World.Time
	end
	self._lastPass = self._lastPass or 0
	if World.Time - self._lastPass < 2 and Ball.isShot() then
		self._catching = true
	end
	if Ball.opponentBallOwner() or Ball.friendlyBallOwner() ~= self._robot
			or World.Ball.speed:length() < Settings.slowBall then
		self._catching = false
	end
	if self._catching then
		self._send.exclusiveRole("trainer", { passReceiver = 1.5, mainAttacker = 1.5 })
	else
		self._send.exclusiveRole("trainer", {mainAttacker = mainAttackerRating})
	end

	return true
end

function Default:_updateTask()
	return Manual
end

return Default
