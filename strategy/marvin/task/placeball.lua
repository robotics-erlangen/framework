local PlaceBall = Class("Task.PlaceBall", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local Direct = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"

local STEP_GO_TO_BALL = "goToBall"
local STEP_ENSURE_CONTACT = "contact"
local STEP_PULL = "pull"
local STEP_MOVE_AWAY = "moveAway"

local BALL_PLACEMENT_RADIUS = 0.1
local MAX_SPEED = 1.5
local MAX_DRIBBLER_SPEED = 0.9

function PlaceBall:_init()
	self._step = STEP_GO_TO_BALL
	self._lastOffset = nil
	self._ballStartPos = nil
	self._positionReachedTime = 0
	self._moveAwayPos = nil
	self._ballNearRobot = false
	self._moveAwayState = "KeepDirection"
end

function PlaceBall:_isBallNearRobot(ball)
	local robot = self._robot
	local dribblerPos = robot.pos + Vector.fromAngle(robot.dir) * robot.shootRadius
	local distToBall = self._ballNearRobot and 0.15 or 0.04

	-- assume that the ball is invisible because it's hidden by the robot
	if not ball:isPositionValid() then
		return self._ballNearRobot
	end


	self._ballNearRobot = ball.pos:distanceTo(dribblerPos) < ball.radius + distToBall
		-- or ball.pos:distanceTo(robot.pos) < robot.shootRadius

	return self._ballNearRobot
end

function PlaceBall:run()
	vis.addCircle("ball placement", World.BallPlacementPos, BALL_PLACEMENT_RADIUS, vis.colors.orangeHalf, true)
	local ball = World.Ball
	local ignoreBall = self._step ~= STEP_MOVE_AWAY and self._step ~= STEP_GO_TO_BALL
	if self._step == STEP_GO_TO_BALL then
		PathHelper.setDefaultObstacles(self._robot.path, self._robot, false, true, true)
	elseif self._step == STEP_MOVE_AWAY then
		PathHelper.setDefaultObstacles(self._robot.path, self._robot, false, true, true, 0.15)
	else
		PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, true, true)
	end
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	debug.set("step", self._step)
	-- offset to ball pos, don't update if near the ball placement pos
	if not self._lastOffset or ball.pos:distanceTo(World.BallPlacementPos) > 0.2 then
		self._lastOffset = (ball.pos - World.BallPlacementPos):setLength(World.Ball.radius + self._robot.shootRadius + 0.05)
	end
	local dir = self._lastOffset:angle()

	if self._step == STEP_GO_TO_BALL then
		local targetPos = ball.pos - self._lastOffset
		-- if ball is on the way, go next to it first
		if self._robot.pos:distanceTo(targetPos) > self._robot.pos:distanceTo(World.Ball.pos)
				and (targetPos-self._robot.pos):absoluteAngleDiff(targetPos-World.Ball.pos) < 35*math.pi/180 then
			targetPos = ball.pos + (ball.pos-self._robot.pos):rotate(math.pi/2):setLength(0.4)
		end

		local maxSpeed = nil
		local dist = targetPos:distanceTo(self._robot.pos)
		if dist < 0.2 then
			self._robot:setDribblerSpeed(MAX_DRIBBLER_SPEED)
			maxSpeed = 0.5
		end
		if dist < 0.04 then
			self._step = STEP_ENSURE_CONTACT
			self._ballStartPos = ball.pos
		end
		self._robot.trajectory:update(ToTarget, targetPos, dir, maxSpeed)

	elseif self._step == STEP_ENSURE_CONTACT then
		self._robot:setDribblerSpeed(MAX_DRIBBLER_SPEED)
		-- Push ball a little bit then move backwards
		local speed = self._lastOffset:copy():setLength(0.3)
		self._robot.trajectory:update(Direct, speed, dir)

		debug.set("ball dist", self._ballStartPos:distanceTo(ball.pos))
		debug.set("ball valid", ball:isPositionValid())

		if not self:_isBallNearRobot(ball) then
			self._step = STEP_GO_TO_BALL
		elseif not ball:isPositionValid() or self._ballStartPos:distanceTo(ball.pos) > 0.03 then
			self._step = STEP_PULL
		end
	elseif self._step == STEP_PULL then
		-- move ball into position
		local targetPos = World.BallPlacementPos - self._lastOffset
		self._robot.trajectory:update(ToTarget, targetPos, dir, MAX_SPEED)

		if self._positionReachedTime == 0 then
			local dribblerSpeed = math.min((ball.pos:distanceTo(World.BallPlacementPos) - 0.02) * 3, MAX_DRIBBLER_SPEED)
			self._robot:setDribblerSpeed(dribblerSpeed)
		end

		if not self:_isBallNearRobot(ball) and self._positionReachedTime == 0 then
			self._step = STEP_GO_TO_BALL
		end

		local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir)*self._robot.shootRadius
		if self:_isBallNearRobot(ball) and
				dribblerPos:distanceTo(World.BallPlacementPos) < BALL_PLACEMENT_RADIUS
				and self._positionReachedTime == 0 then
			self._positionReachedTime = World.Time
		end
		-- wait 1 second for the dribbler and the ball to stop
		if self._positionReachedTime ~= 0 and World.Time - self._positionReachedTime > 1 then
			self._step = STEP_MOVE_AWAY
			-- 20cm away from the ball, keeping current direction
			self._moveAwayPos = self._robot.pos - Vector.fromAngle(self._robot.dir):setLength(0.4)
			self._moveAwayState = "KeepDirection"
		end
	elseif self._step == STEP_MOVE_AWAY then
		if self._moveAwayState == "KeepDirection" then
			self._robot.trajectory:update(ToTarget, self._moveAwayPos, self._robot.dir)
			if self._robot.pos:distanceTo(self._moveAwayPos) < 0.1 then
				self._moveAwayState = "MoveToCenter"
			end
		elseif self._moveAwayState == "MoveToCenter" then
			if World.BallPlacementPos:distanceTo(Vector(0,0)) > 0.7 then
				self._robot.trajectory:update(ToTarget, Vector(0,0), 0)
			else
				self._robot.trajectory:update(ToTarget, Vector(1.3,0), 0)
			end
		end
	end
end

return PlaceBall
