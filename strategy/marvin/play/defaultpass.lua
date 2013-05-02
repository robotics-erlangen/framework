local Base = require "play/base"
local DefaultPass = (require "../base/class").new("Play.DefaultPass", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Ball = require "observer/ball"

local DirectPass = require "task/directpass"
local Assistant = require "task/assistant"
local ReceivePass = require "task/receivepass"

DefaultPass.weight = 100
DefaultPass.timeout = 20
DefaultPass.maxRating = Base.rating.perhaps
DefaultPass._conditions = {
	[1] = DirectPass.factory(1, 1, true),
	[2] = Assistant.factory(2)
}

function DefaultPass:_init()
end

function DefaultPass:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._taskmanager, robots, 2, DefaultPass._conditions)
end

-- attack no opponent has the ball
function DefaultPass:rateDefault()
	if not Ball.opponentBallOwner() then
		return Base.rating.perhaps
	else
		return Base.rating.no
	end
end

function DefaultPass:prepareDefault()
	self._tasks = {
		DirectPass.create(self._robots[1], self._robots[2], true),
		Assistant.create(self._robots[2])
	}
end

-- once we've got the ball, fight until we shoot the ball or loose it
function DefaultPass:switchDefault()
	if Ball.isShot() then
		self:_setState("Shot")
	end
end

function DefaultPass:rateShot()
	if Ball.opponentBallOwner() then
		return Base.rating.no
	elseif Ball.friendlyBallOwner() == self._robots[2] then
		return Base.rating.no
	else
		return Base.rating.perhaps
	end
end

function DefaultPass:prepareShot()
	self._tasks = {
		nil,
		ReceivePass.create(self._robots[2])
	}
end

return DefaultPass
