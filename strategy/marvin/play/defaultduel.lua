local Base = require "play/base"
local DefaultDuel = (require "../base/class").new("Play.DefaultDuel", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Ball = require "observer/ball"

local Duel = require "task/duel"

DefaultDuel.weight = 100
DefaultDuel.timeout = 20
DefaultDuel.maxRating = Base.rating.perhaps
DefaultDuel._conditions = {
	[1] = Duel.factory(1)
}

function DefaultDuel:_init()
end

function DefaultDuel:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._messages, robots, 1, DefaultDuel._conditions)
end

-- attack while the opponent has the ball
function DefaultDuel:rateDefault()
	if Ball.opponentBallOwner() then
		return Base.rating.perhaps
	else
		return Base.rating.no
	end
end

function DefaultDuel:prepareDefault()
	self._tasks = { Duel.create(self._robots[1]) }
end

-- once we've got the ball, fight until we shoot the ball or loose it
function DefaultDuel:switchDefault()
	if Ball.friendlyBallOwner() == self._robots[1] then
		self:_setState("Duel")
	end
end

function DefaultDuel:rateDuel()
	if Ball.friendlyBallOwner() == self._robots[1] then
		return Base.rating.perhaps
	else
		return Base.rating.no
	end
end

function DefaultDuel:prepareDuel()
	-- keep duel task
end

return DefaultDuel
