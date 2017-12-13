local PlaceBall = Class("Task.PlaceBall", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local Direct = require "trajectory/direct"
local Field = require "../base/field"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"

local STATE_START = "STATE_START"
local STATE_GO_TO_PULL = "STATE_GO_TO_PULL"
local STATE_ENSURE_PULL_CONTACT = "STATE_ENSURE_PULL_CONTACT"
local STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
local STATE_WAIT_FOR_STOP = "STATE_WAIT_FOR_STOP"
local STATE_BACK_UP = "STATE_BACK_UP"
local STATE_GO_TO_PUSH = "STATE_GO_TO_PUSH"
local STATE_PUSH_TO_POS = "STATE_PUSH_TO_POS"
local STATE_END = "STATE_END"

local TOLERANCE = 0.1
local MAX_BALL_SPEED = 0.2
local MAX_DRIBBLER_SPEED = 0.8

-- during ENSURE_CONTACT, if robot:hasBall, this is the timespan after which the state is changed to pull 
local HAS_BALL_MIN_TIME = 2

function PlaceBall:_init(placementPos)
	self._placementPos = placementPos or World.BallPlacementPos

	self._state = STATE_START
	self._stateChanged = true
	self._stateChangeTime = World.Time
	
	self._placementOffset = nil
	self._borderOffset = nil
	self._ballStartPos = World.Ball.pos:copy()
	
	self._currentTargetPos = nil
	self._hasBallTime = nil
end

function PlaceBall:run()

	local ball = World.Ball
	local robot = self._robot

	local offsetLen = ball.radius + robot.shootRadius + 0.05
	if not self._placementOffset or ball.pos:distanceTo(self._placementPos) > TOLERANCE then
		self._placementOffset = (ball.pos - self._placementPos):setLength(offsetLen)
	end
	local nearestFieldPos = Field.limitToField(ball.pos)
	if not self._borderOffset or ball.pos:distanceTo(nearestFieldPos) > TOLERANCE then
		self._borderOffset = (ball.pos - nearestFieldPos):setLength(offsetLen)
	end
	vis.addCircle("PlaceBall", self._placementPos, TOLERANCE, vis.colors.orange)
	vis.addCircle("PlaceBall", nearestFieldPos, TOLERANCE, vis.colors.orange)
	vis.addPath("PlaceBall", { self._placementPos, self._placementPos + self._placementOffset }, vis.colors.black)
	vis.addPath("PlaceBall", { nearestFieldPos, nearestFieldPos + self._borderOffset }, vis.colors.black)

	local oldState = self._state
	self._state = self:_getNextState(oldState)
	self._stateChanged = self._state ~= oldState
	if self._stateChanged then
		self._stateChangeTime = World.Time
	end
	debug.set("state", self._state)

	local ignoreBall = self._state == STATE_ENSURE_PULL_CONTACT 
					or self._state == STATE_PULL_TO_FIELD 
					or self._state == STATE_WAIT_FOR_STOP 
					or self._state == STATE_PUSH_TO_POS
	PathHelper.setDefaultObstacles(robot.path, robot, ignoreBall, false, true)
	PathHelper.addRobotObstacles(robot.path, robot)

	if self._state == STATE_START then

		robot.trajectory:update(ToTarget, robot.pos, robot.dir)

	elseif self._state == STATE_GO_TO_PULL then

		self._currentTargetPos = ball.pos - self._borderOffset
		local maxSpeed = nil
		if robot.pos:distanceTo(self._currentTargetPos) < 2 * TOLERANCE then
			maxSpeed = 0.5
		end
		robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffset:angle(), maxSpeed)

	elseif self._state == STATE_ENSURE_PULL_CONTACT then

		robot:setDribblerSpeed(MAX_DRIBBLER_SPEED)

		local speed = self._borderOffset:copy():setLength(0.1)
		robot.trajectory:update(Direct, speed, speed:angle())

	elseif self._state == STATE_PULL_TO_FIELD then

		robot:setDribblerSpeed(MAX_DRIBBLER_SPEED)

		local speed = -self._borderOffset:copy():setLength(0.1)
		robot.trajectory:update(Direct, speed, self._borderOffset:angle())

	elseif self._state == STATE_WAIT_FOR_STOP then
		robot:halt()
	elseif self._state == STATE_BACK_UP then

		self._currentTargetPos = ball.pos + (robot.pos - ball.pos):setLength(ball.radius + robot.shootRadius + 0.2)
		-- TODO fix at placement pos
		robot.trajectory:update(ToTarget, self._currentTargetPos, robot.dir, 0.4)

	elseif self._state == STATE_GO_TO_PUSH then

		self._currentTargetPos = ball.pos + self._placementOffset
		robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffset):angle())

	elseif self._state == STATE_PUSH_TO_POS then
		-- TODO Faster push at higher distance
		robot:setDribblerSpeed(MAX_DRIBBLER_SPEED)
		self._currentTargetPos = ball.pos - self._placementOffset

		robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffset):angle(), MAX_BALL_SPEED)

	elseif self._state == STATE_END then
		robot:halt()
	end

end

function PlaceBall:_getNextState(currentState)

	local ball = World.Ball
	local robot = self._robot

	local nextState = currentState

	if currentState == STATE_START then
		-- TODO Change to end state if the ball is at the placement pos
		if ball.pos:distanceTo(self._placementPos) < 0.25 * TOLERANCE then
			nextState = STATE_END
		elseif self:_isBallPushable(ball) then
			nextState = STATE_GO_TO_PUSH
		else
			nextState = STATE_GO_TO_PULL
		end
	elseif currentState == STATE_GO_TO_PULL then
		local dist = robot.pos:distanceTo(self._currentTargetPos)
		local angleDiff = math.abs(robot.dir - self._borderOffset:angle())
		debug.set("dist", dist)
		debug.set("angleDiff", angleDiff)
		-- pi/36 = 5 degree
		if dist < 0.01 and angleDiff < math.pi / 36 then
			nextState = STATE_ENSURE_PULL_CONTACT
		end
	elseif currentState == STATE_ENSURE_PULL_CONTACT then

		if robot:hasBall(ball) then
			if not self._hasBallTime then
				self._hasBallTime = World.Time
			elseif World.Time - self._hasBallTime > HAS_BALL_MIN_TIME then
				nextState = STATE_PULL_TO_FIELD
			end
		else
			self._hasBallTime = nil
		end

	elseif currentState == STATE_PULL_TO_FIELD then

		if not robot:hasBall(ball)
			or ball.pos:distanceTo(robot.pos) > robot.shootRadius + ball.radius + 0.05 then
			nextState = STATE_START
		elseif self:_isBallPushable(ball) then
			nextState = STATE_WAIT_FOR_STOP
		end

	elseif currentState == STATE_WAIT_FOR_STOP then

		if World.Time - self._stateChangeTime > 2 then
			nextState = STATE_BACK_UP
		end

	elseif currentState == STATE_BACK_UP then

		if robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_START
		end

	elseif currentState == STATE_GO_TO_PUSH then
		if robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_PUSH_TO_POS
		end
	elseif currentState == STATE_PUSH_TO_POS then
		if ball.pos:distanceTo(self._placementPos) < 0.25 * TOLERANCE then
			nextState = STATE_WAIT_FOR_STOP
		elseif ball.pos:distanceTo(robot.pos) > 2 * TOLERANCE then
			nextState = STATE_START
		end
	elseif currentState == STATE_END then
		nextState = STATE_END
	else
		nextState = nil
	end

	assert(nextState, "nextState can't be nil, currentState=" .. currentState .. " is probably invalid")
	return nextState

end

function PlaceBall:_isBallPushable(ball)
	return Field.isInField(ball.pos)
end

return PlaceBall