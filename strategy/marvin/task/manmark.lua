local ManMark = (require "../base/class").new("Task.ManMark", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"
local Rating = require "util/rating"
local Referee = require "util/referee"

ManMark.priority = 3

function ManMark:_init(priorityTarget)
	if priorityTarget then
		self.priority = 3.1 --HACK HACK HACK
		self._priorityTarget = priorityTarget
	end
end

function ManMark:_run()
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, self._preferredPos, self._preferredDir)
	
	if self._targetRobot then
		self.send("all").defendedOpponent(self._targetRobot)
	end
end

local function rateOpp(own, remainingOpponents, opp)
	local offFreeKick = World.RefereeState == "IndirectOffensive" 
		or World.RefereeState == "DirectOffensive"
	if Referee.isStopState() or offFreeKick then
		if opp.pos:distanceTo(World.Ball.pos) < 0.5 + 2*opp.radius then
			return math.huge
		end
	end

	local goalDist = opp.pos:distanceTo(World.Geometry.FriendlyGoal)
	local robotDist = opp.pos:distanceTo(own.pos)
	-- FIXME better metrik
	return goalDist + 0.5*robotDist
end

function ManMark:_rate()
	if not self._priorityTarget then
		local defendedOpponents = {}
		for _, opp in pairs(self.inbox.defendedOpponent("priority")) do
			defendedOpponents[opp] = true
		end
		
		local remainingOpponents = {}
		for _, robot in pairs(World.OpponentRobots) do
			if not defendedOpponents[robot] and World.OpponentKeeper ~= robot then
				table.insert(remainingOpponents, robot)
			end
		end
		
		local oppOrder = function(opp1, opp2)
			return rateOpp(self._robot, remainingOpponents, opp1) < rateOpp(self._robot, remainingOpponents, opp2)
		end
		
		table.sort(remainingOpponents, oppOrder)
	
		self._targetRobot = nil
		if #remainingOpponents > 0 then
			self._targetRobot = remainingOpponents[1]
		else -- fallback when no opponent
			self._targetRobot = nil
		end
	else
		self._targetRobot = self._priorityTarget
	end
	
	-- FIXME place fallback near defense
	local targetPos = self._targetRobot and self._targetRobot.pos or Vector.create(0, 0)
	local ballPos = World.Ball.pos

	--preferred position in front of the target robot in direction to the ball
	local midpointDistance = (self._targetRobot and self._targetRobot.radius or 0.09) + self._robot.radius + Settings.markingDistance
	self._preferredPos = targetPos + (ballPos - targetPos):setLength(midpointDistance)
	self._preferredPos = Field.limitToAllowedField(self._preferredPos, self._robot.radius, true)

	if Referee.isStopState() then
		local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
		if self._preferredPos:distanceTo(ballPos) < minDist then
			self._preferredPos = ballPos + (self._preferredPos - ballPos):setLength(minDist)
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		self._preferredPos.y = math.min(self._preferredPos.y, World.Geometry.PenaltyLine - Settings.penaltyLineDistance)
	end

	self._preferredDir = (ballPos - targetPos):angle()

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
