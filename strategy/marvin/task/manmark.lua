local ManMark = (require "../base/class").new("Task.ManMark", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"
local Referee = require "../base/referee"

ManMark.priority = 3

function ManMark:_init(targetRobot)
	assert(targetRobot, "ManMark task needs a target robot")
	self._targetRobot = targetRobot
	self._orientation = World.Ball.pos
end

function ManMark:run()
	if World.Ball.pos.y < -World.Geometry.FieldHeight / 6 then
		self._orientation = World.Geometry.FriendlyGoal
	end
	if World.Ball.pos.y > 0 then
		self._orientation = World.Ball.pos
	end
	local midpointDistance = (self._targetRobot.radius or 0.09) + self._robot.radius + Settings.markingDistance
	local preferredPos = self._targetRobot.pos + (self._orientation - self._targetRobot.pos):setLength(midpointDistance)
	preferredPos = Field.limitToAllowedField(preferredPos, self._robot.radius, true)

	if Referee.isStopState() then
		local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
		if preferredPos:distanceTo(World.Ball.pos) < minDist then
			preferredPos = World.Ball.pos + (preferredPos - World.Ball.pos):setLength(minDist)
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		self._preferredPos.y = math.min(preferredPos.y, World.Geometry.PenaltyLine - Settings.penaltyLineDistance)
	end

	local preferredDir = (World.Ball.pos - self._targetRobot.pos):angle()

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir)
	self._send("all").moveDest(preferredPos)
end

return ManMark
