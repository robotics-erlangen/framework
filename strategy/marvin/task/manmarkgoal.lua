local ManMarkGoal = (require "../base/class").new("Task.ManMarkGoal", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"
local Referee = require "../base/referee"

ManMarkGoal.priority = 3

function ManMarkGoal:_init()
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

function ManMarkGoal:run()
	-- ATTENTION/FIXME: make sure to do the same as ManMarkBall here
	local defendedOpponents = {}
	for _, opp in pairs(self._inbox.defendedOpponent()) do
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
	-- ATTENTION END

	local targetRobot
	if #remainingOpponents > 0 then
		targetRobot = remainingOpponents[1]
	else -- TODO consider other defender
		for _,r in pairs(World.OpponentRobots) do
			if not targetRobot or r.pos.y < targetRobot.pos.y then
				targetRobot = r
			end
		end
	end

	-- preferred position between target robot and goal
	local midpointDistance = (targetRobot and targetRobot.radius or 0.09) + self._robot.radius + Settings.markingDistance
	
	local preferredPos = targetRobot.pos + (World.Geometry.FriendlyGoal - targetRobot.pos):setLength(midpointDistance)
	preferredPos = Field.limitToAllowedField(preferredPos, self._robot.radius, true)

	local ballPos = World.Ball.pos
	if Referee.isStopState() then -- keep distance to ball
		local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
		if preferredPos:distanceTo(ballPos) < minDist then
			preferredPos = ballPos + (preferredPos - ballPos):setLength(minDist)
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		preferredPos.y = math.min(preferredPos.y, World.Geometry.PenaltyLine - Settings.penaltyLineDistance)
	end

	local preferredDir = (ballPos - targetRobot.pos):angle()

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir)
	
	self._send("all").defendedOpponent(targetRobot)
end

return ManMarkGoal
