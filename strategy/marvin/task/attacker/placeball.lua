local PlaceBall = Class("Task.PlaceBall", require "task/base")

-- Requires
local Constants = require "../base/constants"
local debug = require "../base/debug"
local Direct = require "trajectory/direct"
local Field = require "../base/field"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"
local World = require "../base/world"

-- States
local STATE_WAIT_FOR_BALL_STOP = "STATE_WAIT_FOR_BALL_STOP"
local STATE_GO_TO_PULL = "STATE_GO_TO_PULL"
local STATE_ENSURE_PULL_CONTACT = "STATE_ENSURE_PULL_CONTACT"
local STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
local STATE_GO_TO_PUSH = "STATE_GO_TO_PUSH"
local STATE_PUSH_TO_POS = "STATE_PUSH_TO_POS"
local STATE_BACK_UP_WAIT = "STATE_BACK_UP_WAIT"
local STATE_BACK_UP = "STATE_BACK_UP"
local STATE_MOVE_AWAY = "STATE_MOVE_AWAY"

-- Other constants

-- Maximum final distance from ball to placement pos
local END_DISTANCE = 0.1
local BALL_STOP_SPEED = 0.2
local MAX_BALL_DISTANCE = 0.25

-- If ball distance is larger than this, the corresponding offset gets recalculated
local OFFSET_DISTANCE = 0.07
local OFFSET_FRAME_COUNT = 50
local OFFSET_SHOOT_LENGTH
local OFFSET_EXTRA_LENGTH

local ENSURE_CONTACT_TIME = 0.5
local ENSURE_CONTACT_MAX_TIME = 2
local ENSURE_CONTACT_DRIBBLER_SPEED = 0.4
local ENSURE_CONTACT_DIRECT_SPEED = 0.12

local PULL_DRIBBLER_SPEED = 0.8
local MAX_PULL_SPEED = 0.15
local MAX_PULL_ACCEL = 0.15
local PULL_LOST_BALL_HYSTERESIS = 1

-- TODO test max speeds for push
local PUSH_DRIBBLER_SPEED = 0.8
local MAX_PUSH_SPEED = 4
local PUSH_ACCEL_SCALE = 0.5625
local PUSH_LOST_BALL_HYSTERESIS = 1

local BACK_UP_WAIT_TIME = 1
local BACK_UP_SPEED = 0.4


function PlaceBall:_init(placementPos)
	self._placementPos = placementPos or World.BallPlacementPos

	self._ball = World.Ball

	self._state = STATE_WAIT_FOR_BALL_STOP
	self._stateChanged = true
	self._stateChangeTime = World.Time
	self._ballStartPos = self._ball.pos

	self._currentTargetPos = nil

	OFFSET_SHOOT_LENGTH = self._robot.shootRadius + self._ball.radius
	OFFSET_EXTRA_LENGTH = OFFSET_SHOOT_LENGTH + 0.1

	-- See _calculateOffsets()
	self._placementOffsets = {}
	self._placementOffsetAverage = -self._robot.pos:copy():setLength(OFFSET_EXTRA_LENGTH)
	self._placementOffsetFrame = 1

	self._nearestFieldPos = nil
	self._borderOffsets = {}
	self._borderOffsetAverage = self._robot.pos:copy():setLength(OFFSET_EXTRA_LENGTH)
	self._borderOffsetFrame = 1

	self._barrierDetects = false
	self._ballInDribbler = false
	self._hasBallTime = nil
	self._lostBallTime = nil

	-- Needed for back up
	-- True if the previous ball moving state was STATE_PUSH_TO_POS, false otherwise
	-- If additional ball moving states are to be added in the future, this boolean probably won't be enough
	self._pushedBefore = false
end

function PlaceBall:run()

	self:_calculateOffsets()
	vis.addCircle("PlaceBall Placement Pos", self._placementPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Placement Pos", { self._placementPos, self._placementPos + self._placementOffsetAverage }, vis.colors.black)
	vis.addCircle("PlaceBall Border Pos", self._nearestFieldPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Border Pos", { self._nearestFieldPos, self._nearestFieldPos + self._borderOffsetAverage }, vis.colors.black)

	local oldState = self._state
	self._state = self:_getNextState(self._state)
	self._stateChanged = self._state ~= oldState
	if self._stateChanged then
		self._stateChangeTime = World.Time
	end
	debug.set("state", self._state)

	-- Path helping
	local obstacleTable = {
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
		ignorePass = true,
        ignoreBallPlacementObstacle = true
	}
	obstacleTable.ignoreBall = self._state == STATE_ENSURE_PULL_CONTACT
					or self._state == STATE_PULL_TO_FIELD
					or self._state == STATE_BACK_UP_WAIT
					or self._state == STATE_PUSH_TO_POS
	obstacleTable.extraBallDistance = (self._state == STATE_GO_TO_PUSH or self._state == STATE_MOVE_AWAY or self._state == STATE_WAIT_FOR_BALL_STOP)
		and self._ball.radius
		or nil
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	-- Extend field boundary so that the robot can pull the ball to the field from further out
	self._robot.path:setBoundary(
		-(World.Geometry.FieldWidthHalf + 5),
		-(World.Geometry.FieldHeightHalf + 5),
		World.Geometry.FieldWidthHalf + 5,
		World.Geometry.FieldHeightHalf + 5
	)

	if self._state == STATE_WAIT_FOR_BALL_STOP then

		local ballVisible = self._ball:isPositionValid()

		local specificOffset = self._placementOffsetAverage:copy():setLength(0.5)
		if ballVisible then
			self._currentTargetPos = self._ball.pos - specificOffset
		else
			self._currentTargetPos = self._robot.pos - specificOffset
		end
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, specificOffset:angle())

	elseif self._state == STATE_GO_TO_PULL then

		self._currentTargetPos = self._ball.pos - self._borderOffsetAverage
		-- TODO max speed based on distance?
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffsetAverage:angle())

	elseif self._state == STATE_ENSURE_PULL_CONTACT then

		self._robot:setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED)

		local speed = self._borderOffsetAverage:copy():setLength(ENSURE_CONTACT_DIRECT_SPEED)
		self._robot.trajectory:update(Direct, speed, speed:angle())

	elseif self._state == STATE_PULL_TO_FIELD then

		self._robot:setDribblerSpeed(PULL_DRIBBLER_SPEED)
		-- For _nearestFieldPos, see in calculateOffset
		if self._stateChanged then
			self._currentTargetPos = self._nearestFieldPos - self._borderOffsetAverage:copy():scaleLength(1.5)
		end
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffsetAverage:angle(), MAX_PULL_SPEED, nil, MAX_PULL_ACCEL)

	elseif self._state == STATE_GO_TO_PUSH then

		self._currentTargetPos = self._ball.pos + self._placementOffsetAverage
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffsetAverage):angle())

	elseif self._state == STATE_PUSH_TO_POS then

		--TODO faster push at higher distance
		self._robot:setDribblerSpeed(PUSH_DRIBBLER_SPEED)
		self._currentTargetPos = self._placementPos + self._placementOffsetAverage:copy():setLength(OFFSET_SHOOT_LENGTH)

		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffsetAverage):angle(), MAX_PUSH_SPEED, nil, PUSH_ACCEL_SCALE)

	elseif self._state == STATE_BACK_UP_WAIT then

		self._robot:halt()

	elseif self._state == STATE_BACK_UP then

        if self._stateChanged then
            local offset
            if self._ball:isPositionValid() then
                offset = self._robot.pos - self._ball.pos
            else
                -- Normally backup in direction where we came from
                offset = self._ballStartPos - self._robot.pos
                -- Backup in reverse direction if the ball was pulled
                if not self._pushedBefore then
                    offset = -offset
                end
            end
            offset:setLength(OFFSET_EXTRA_LENGTH)
            self._currentTargetPos = self._robot.pos + offset
        end
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._robot.dir, BACK_UP_SPEED)

	elseif self._state == STATE_MOVE_AWAY then

		local offset = (World.Geometry.FriendlyGoal - self._ball.pos):setLength(Constants.stopBallDistance + 0.1)
		self._currentTargetPos = self._ball.pos + offset
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, -offset:angle())

	end

end

function PlaceBall:_getNextState(currentState)

	local nextState

	if currentState == STATE_WAIT_FOR_BALL_STOP then

		nextState = STATE_WAIT_FOR_BALL_STOP

		if self._ball.speed:length() < BALL_STOP_SPEED then

            self._ballStartPos = self._ball.pos

			if self._ball.pos:distanceTo(self._placementPos) < END_DISTANCE then
				nextState = STATE_MOVE_AWAY
			elseif not Field.isInField(self._ball.pos)
					or Field.isInFriendlyGoal(self._ball.pos)
					or Field.isInOpponentGoal(self._ball.pos) then
				nextState = STATE_GO_TO_PULL
			else
				nextState = STATE_GO_TO_PUSH
			end

		end

	elseif currentState == STATE_GO_TO_PULL then

		nextState = STATE_GO_TO_PULL

		if self._ball.speed:length() > BALL_STOP_SPEED
                or self._ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		elseif self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_ENSURE_PULL_CONTACT
		end

	elseif currentState == STATE_ENSURE_PULL_CONTACT then

		nextState = STATE_ENSURE_PULL_CONTACT

		if World.Time - self._stateChangeTime > ENSURE_CONTACT_MAX_TIME then
			self._hasBallTime = nil
			nextState = STATE_PULL_TO_FIELD
		elseif self._barrierDetects then
			if not self._hasBallTime then
				self._hasBallTime = World.Time
			elseif World.Time - self._hasBallTime > ENSURE_CONTACT_TIME then
				self._hasBallTime = nil
				nextState = STATE_PULL_TO_FIELD
			end
		else
			self._hasBallTime = nil
		end

	elseif currentState == STATE_PULL_TO_FIELD then

		self._pushedBefore = false

		nextState = STATE_PULL_TO_FIELD
		local ballVisible = self._ball:isPositionValid()

		if ballVisible and self._ball.pos:distanceTo(self._robot.pos) > self._robot.radius + 0.1 then
			if not self._lostBallTime then
				self._lostBallTime = World.Time
			elseif World.Time - self._lostBallTime > PULL_LOST_BALL_HYSTERESIS then
				self._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			end
		else
			self._lostBallTime = nil
			if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
				nextState = STATE_BACK_UP_WAIT
			end
		end

	elseif currentState == STATE_GO_TO_PUSH then

		nextState = STATE_GO_TO_PUSH
		if self._ball.speed:length() > BALL_STOP_SPEED
                or self._ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		elseif self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_PUSH_TO_POS
		end

	elseif currentState == STATE_PUSH_TO_POS then

		self._pushedBefore = true

		nextState = STATE_PUSH_TO_POS
		local ballVisible = self._ball:isPositionValid()

		if ballVisible and self._ball.pos:distanceTo(self._robot.pos) > self._robot.radius + 0.1 then
			if not self._lostBallTime then
				self._lostBallTime = World.Time
			elseif World.Time - self._lostBallTime > PUSH_LOST_BALL_HYSTERESIS then
				self._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			end
		else
			self._lostBallTime = nil
			if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
				nextState = STATE_BACK_UP_WAIT
			end
		end

	elseif currentState == STATE_BACK_UP_WAIT then

		nextState = STATE_BACK_UP_WAIT
		if World.Time - self._stateChangeTime > BACK_UP_WAIT_TIME then
			nextState = STATE_BACK_UP
		end

	elseif currentState == STATE_BACK_UP then

		nextState = STATE_BACK_UP
		if self._robot.pos:distanceTo(self._currentTargetPos) < 0.01 then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end

	elseif currentState == STATE_MOVE_AWAY then

		nextState = STATE_MOVE_AWAY
		if self._ball.pos:distanceTo(self._placementPos) > END_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end

	end

	if not nextState then
		error("nextState can't be nil, currentState=" .. currentState .. " is probably invalid")
	end
	return nextState

end

local function vectorAverage(array, indexStart, indexEnd)
	local sum = Vector(0, 0)
	local n
	if indexStart then
		indexEnd = indexEnd or #array
		for i = indexStart, indexEnd do
			sum = sum + array[i]
		end
		n = indexEnd - indexStart + 1
	else
		for _, v in ipairs(array) do
			sum = sum + v
		end
		n = #array
	end
	return sum/n
end

function PlaceBall:_calculateOffsets()

	local ballVisible = self._ball:isPositionValid()

	self._nearestFieldPos = Field.limitToField(self._ball.pos)

	if (not self._placementOffsetAverage or self._ball.pos:distanceTo(self._placementPos) > OFFSET_DISTANCE) and ballVisible then
		self._placementOffsets[self._placementOffsetFrame] = (self._ball.pos - self._placementPos):setLength(OFFSET_EXTRA_LENGTH)
		self._placementOffsetFrame = (self._placementOffsetFrame % OFFSET_FRAME_COUNT) + 1
		self._placementOffsetAverage = vectorAverage(self._placementOffsets)
	end

	if (not self._borderOffsetAverage or self._ball.pos:distanceTo(self._nearestFieldPos) > OFFSET_DISTANCE) and ballVisible then
		self._borderOffsets[self._borderOffsetFrame] = (self._ball.pos - self._nearestFieldPos):setLength(OFFSET_EXTRA_LENGTH)
		self._borderOffsetFrame = (self._borderOffsetFrame % OFFSET_FRAME_COUNT) + 1
		self._borderOffsetAverage = vectorAverage(self._borderOffsets)
	end

end


function PlaceBall:_updateBallStatus()

	if self._robot.radioResponse then
		self._barrierDetects = self._robot.radioResponse.ball_detected
	end
	debug.set("barrier detects", self._barrierDetects)
end

return PlaceBall
