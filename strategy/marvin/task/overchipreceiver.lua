local SuggestPass = require "task/ability/suggestpass"
local OverchipReceiver = Class("Task.OverchipReceiver", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"
local G = World.Geometry

local DISTANCE_FACTOR = 19 -- used to determine the passSuggestion position
local DISTANCE_TO_DEFENSE_AREA = 1 -- faraway robots and goalie don't interfere with our runup


function OverchipReceiver:_init()
	local goal = G.OpponentGoal - World.Ball.pos
	self._obstacleRobot = nil
	self._pos = goal:setLength(0.5 + 3 * self._robot.radius)
end

function OverchipReceiver:_updateObstacleRobot()
	self._obstacleRobot = nil
	local ballPos = World.Ball.pos
	local goal = G.OpponentGoal
	local boundary = G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA)
	local maxLength = -math.huge

	-- check the distance between enemy robots and the goalVector
	for _, robot in pairs(World.OpponentRobots) do
		local orthogonalProjection = robot.pos:orthogonalProjection(goal, ballPos)
		local projectedVector = orthogonalProjection - ballPos
		if robot.pos.y > ballPos.y and robot.pos.y < boundary 
				and robot.pos.y > ballPos.y and robot.pos.y < boundary
				and (robot.pos - orthogonalProjection):length() < 0.3 then
			if projectedVector:length() > maxLength then
				self._obstacleRobot = robot
				maxLength = projectedVector:length()
			end
		end
	end
end

function OverchipReceiver:_updatePos()
	local goalVector = G.OpponentGoal - World.Ball.pos
	if self._obstacleRobot then
		self._pos = self._obstacleRobot.pos + goalVector:setLength(3 * self._robot.radius)
	else
		self._pos = World.Ball.pos + goalVector:setLength(0.5 + 3 * self._robot.radius)
	end
end

function OverchipReceiver:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self:_updateObstacleRobot()
	self:_updatePos()
	local dir = (G.OpponentGoal - self._pos):angle()
	local ballPos = self._pos + Vector.fromAngle(dir):setLength(DISTANCE_FACTOR * self._robot.radius)
	local _, time = self._robot.trajectory:update(ToTarget, self._pos, dir)
	self:_suggestPass(ballPos, nil, time)
end

return OverchipReceiver