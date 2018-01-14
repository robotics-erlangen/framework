local PlaceBall = Class("Task.PlaceBall", require "task/base")

-- Requires
local debug = require "../base/debug"
local Direct = require "trajectory/direct"
local Field = require "../base/field"
local geom = require "../base/geom"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"
local World = require "../base/world"

-- States
local STATE_START = "STATE_START"
local STATE_GO_TO_PULL = "STATE_GO_TO_PULL"
local STATE_ENSURE_PULL_CONTACT = "STATE_ENSURE_PULL_CONTACT"
local STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
local STATE_WAIT_FOR_STOP = "STATE_WAIT_FOR_STOP"
local STATE_BACK_UP = "STATE_BACK_UP"
local STATE_GO_TO_PUSH = "STATE_GO_TO_PUSH"
local STATE_PUSH_TO_POS = "STATE_PUSH_TO_POS"
local STATE_END = "STATE_END"

-- Other constants

-- Maximum final distance from ball to placement pos
local END_DISTANCE = 0.07

-- If ball distance is larger than this, the corresponding offset gets recalculated
local OFFSET_DISTANCE = 0.07

local BACK_TO_START_DISTANCE = 0.2

local STOP_WAIT_TIME = 0.4

local ENSURE_CONTACT_DRIBBLER_SPEED = 0.4
local ENSURE_CONTACT_DIRECT_SPEED = 0.05
local ENSURE_CONTACT_TIME = 0.5
local ENSURE_CONTACT_MAX_TIME = 1.7

local PULL_DRIBBLER_SPEED = 0.8
local MAX_PULL_SPEED = 0.15
local MAX_PULL_ACCEL = 0.15
local PULL_LOST_BALL_HYSTERESIS = 1.0

local PUSH_DRIBBLER_SPEED = 0.8
-- TODO test max speeds for push
local MAX_PUSH_SPEED = 0.2
local MAX_PUSH_ACCEL = 0.2

local BACK_UP_SPEED = 0.4

function PlaceBall:_init(placementPos)
	self._placementPos = placementPos or World.BallPlacementPos

	self._ball = World.Ball

	self._state = STATE_START
	self._stateChanged = true
	self._stateChangeTime = World.Time

	self._currentTargetPos = nil

	-- Computed in calculateOffsets()
	self._nearestFieldPos = nil
	self._placementOffset = nil
	self._borderOffset = nil

	self._barrierDetects = false
	self._ballInDribbler = false
	self._hasBallTime = nil
	self._lostBallTime = nil
end

function PlaceBall:run()

	self:_calculateOffsets()
	vis.addCircle("PlaceBall Placement Pos", self._placementPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Placement Pos", { self._placementPos, self._placementPos + self._placementOffset }, vis.colors.black)
	vis.addCircle("PlaceBall Border Pos", self._nearestFieldPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Border Pos", { self._nearestFieldPos, self._nearestFieldPos + self._borderOffset }, vis.colors.black)

	self:_updateBallStatus()

	local oldState = self._state
	self._state = self:_getNextState(oldState)
	self._stateChanged = self._state ~= oldState
	if self._stateChanged then
		self._stateChangeTime = World.Time
	end
	debug.set("state", self._state)

	-- Path helping
	local ignoreBall = self._state == STATE_ENSURE_PULL_CONTACT
					or self._state == STATE_PULL_TO_FIELD
					or self._state == STATE_WAIT_FOR_STOP
					or self._state == STATE_PUSH_TO_POS
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, ignoreBall, false, true)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	if self._state == STATE_START then
		self._robot:halt()
	elseif self._state == STATE_GO_TO_PULL then

		self._currentTargetPos = self._ball.pos - self._borderOffset
		-- TODO max speed based on distance?
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffset:angle())

	elseif self._state == STATE_ENSURE_PULL_CONTACT then

		self._robot:setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED)

		local speed = self._borderOffset:copy():setLength(ENSURE_CONTACT_DIRECT_SPEED)
		self._robot.trajectory:update(Direct, speed, speed:angle())

	elseif self._state == STATE_PULL_TO_FIELD then

		self._robot:setDribblerSpeed(PULL_DRIBBLER_SPEED)
		-- For _nearestFieldPos, see in calculateOffset
		if not Field.isInField(self._nearestFieldPos, -0.01) then
			self._currentTargetPos = self._nearestFieldPos - self._borderOffset:copy():scaleLength(1.5)
		end
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffset:angle(), MAX_PULL_SPEED, nil, MAX_PULL_ACCEL)

	elseif self._state == STATE_GO_TO_PUSH then
	
		self._currentTargetPos = self._ball.pos + self._placementOffset
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffset):angle())

	elseif self._state == STATE_PUSH_TO_POS then

		--TODO faster push at higher distance
		self._robot:setDribblerSpeed(PUSH_DRIBBLER_SPEED)
		self._currentTargetPos = self._placementPos + self._placementOffset:copy():setLength(self._robot.shootRadius + self._ball.radius)

		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffset):angle(), MAX_PUSH_SPEED, nil, MAX_PUSH_ACCEL)

	elseif self._state == STATE_WAIT_FOR_STOP then

		self._robot:halt()

	elseif self._state == STATE_BACK_UP then

		if self._stateChanged then
			if self._ball:isPositionValid() then
				self._currentTargetPos = self._robot.pos - (self._ball.pos - self._robot.pos):setLength(self._robot.shootRadius + self._ball.radius + 0.05)
			else
				self._currentTargetPos = self._robot.pos - self._placementOffset
			end
		end

		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._robot.dir, BACK_UP_SPEED)

	elseif self._state == STATE_END then

		self._robot:halt()

	end

end

function PlaceBall:_getNextState(currentState)

	local nextState = currentState

	if currentState == STATE_START then

		if self._ball.pos:distanceTo(self._placementPos) < END_DISTANCE then
			nextState = STATE_END
		elseif self:_isBallPushable() then
			nextState = STATE_GO_TO_PUSH
		else
			nextState = STATE_GO_TO_PULL
		end

	elseif currentState == STATE_GO_TO_PULL then

		if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01
				and math.abs(geom.getAngleDiff(self._robot.dir, self._borderOffset:angle())) < math.pi / 36 then
			nextState = STATE_ENSURE_PULL_CONTACT
		end

	elseif currentState == STATE_ENSURE_PULL_CONTACT then

		if World.Time - self._stateChangeTime > ENSURE_CONTACT_MAX_TIME then
			nextState = STATE_PULL_TO_FIELD

		elseif self._barrierDetects then
			if not self._hasBallTime then
				self._hasBallTime = World.Time
			elseif World.Time - self._hasBallTime > ENSURE_CONTACT_TIME then
				nextState = STATE_PULL_TO_FIELD
			end
		else
			self._hasBallTime = nil
		end

	elseif currentState == STATE_PULL_TO_FIELD then

		local ballVisible = self._ball:isPositionValid()

		-- TODO hysteresis
		if ballVisible and self._ball.pos:distanceTo(self._robot.pos) > self._robot.radius + 0.1 then
			if not self._lostBallTime then
				self._lostBallTime = World.Time
			elseif World.Time - self._lostBallTime > PULL_LOST_BALL_HYSTERESIS then
				nextState = STATE_START
			end
		elseif self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_WAIT_FOR_STOP
		end

	elseif currentState == STATE_GO_TO_PUSH then
		if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_PUSH_TO_POS
		end

	elseif currentState == STATE_PUSH_TO_POS then
		
		--TODO test in indirect situation
		if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_WAIT_FOR_STOP
		elseif self._ball.pos:distanceTo(self._robot.pos) > BACK_TO_START_DISTANCE then
			nextState = STATE_START
		end

	elseif currentState == STATE_WAIT_FOR_STOP then

		if World.Time - self._stateChangeTime > STOP_WAIT_TIME then
			nextState = STATE_BACK_UP
		end

	elseif currentState == STATE_BACK_UP then

		if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
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

function PlaceBall:_updateBallStatus()

	if self._robot.radioResponse then
		self._barrierDetects = self._robot.radioResponse.ball_detected
	end
	debug.set("barrier detects", self._barrierDetects)

end

function PlaceBall:_calculateOffsets()

	local ballVisible = self._ball:isPositionValid()

	self._nearestFieldPos = Field.limitToField(self._ball.pos)
	local offsetLen = self._ball.radius + self._robot.shootRadius + 0.05

	if (not self._placementOffset or self._ball.pos:distanceTo(self._placementPos) > OFFSET_DISTANCE) and ballVisible then
		self._placementOffset = (self._ball.pos - self._placementPos):setLength(offsetLen)
	end

	if (not self._borderOffset or self._ball.pos:distanceTo(self._nearestFieldPos) > OFFSET_DISTANCE) and ballVisible then
		self._borderOffset = (self._ball.pos - self._nearestFieldPos):setLength(offsetLen)
	end

end

function PlaceBall:_isBallPushable()
	return Field.isInField(self._ball.pos)
end

return PlaceBall