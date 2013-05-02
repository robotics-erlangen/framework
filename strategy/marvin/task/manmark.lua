local ManMark = (require "../base/class").new("Task.ManMark", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"
local Rating = require "util/rating"

ManMark.priority = 3

function ManMark:_init()
end

function ManMark:_run(priorityMessages, notifications)
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, self._preferredPos, self._preferredDir)
	
	return { defendedOpponent = self._targetRobot }
end

local function rateOpp(own, opp)
	local goalDist = opp.pos:distanceTo(World.Geometry.FriendlyGoal)
	local robotDist = opp.pos:distanceTo(own.pos)
	-- FIXME better metrik
	return goalDist + 0.5*robotDist
end

function ManMark:_rate(priorityMessages, notifications)
	local defendedOpponents = {}
	for _, msg in pairs(priorityMessages) do
		local defendedOpponent = msg.defendedOpponent
		if defendedOpponent then
			defendedOpponents[defendedOpponent] = true
		end
	end
	
	local remainingOpponents = {}
	for _, robot in pairs(World.OpponentRobots) do
		if not defendedOpponents[robot] then
			table.insert(remainingOpponents, robot)
		end
	end
	
	local oppOrder = function(opp1, opp2)
		return rateOpp(self._robot, opp1) < rateOpp(self._robot, opp2)
	end
	
	table.sort(remainingOpponents, oppOrder)
	
	self._targetRobot = nil
	if #remainingOpponents > 0 then
		self._targetRobot = remainingOpponents[1]
	else
		-- FIXME better fallback
		self._targetRobot = nil
	end
	
	-- FIXME place near defense
	local targetPos = self._targetRobot and self._targetRobot.pos or Vector.create(0, 0)
	local ballPos = World.Ball.pos

	--preferred position in front of the target robot in direction to the ball
	local midpointDistance = self._targetRobot.radius + self._robot.radius + Settings.markingDistance
	self._preferredDir = (ballPos - targetPos):angle()
	self._preferredPos = (ballPos - targetPos):setLength(midpointDistance) + targetPos
	self._preferredPos = Field.limitToAllowedField(self._preferredPos, self._robot.radius)
	
	return Rating.posToRating(self._robot, self._preferredPos)
end

function ManMark.factory(position)
	local f = function (robots)
		return ManMark.create(robots[position])
	end
	return f
end

function ManMark.test(id)
	if id > 2 then
		return nil
	end
	return ManMark.factory(1), 1
end

return ManMark
