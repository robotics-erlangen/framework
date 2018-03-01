local FastBallPlacement = Class("Test.Move.FastBallPlacement", require "group/move/base")

local debug = require "../base/debug"
local BallObserver = require "observer/ball"
local Field = require "../base/field"
local geom = require "../base/geom"
local Halt = require "task/halt"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local PlaceBall = require "task/placeball"
local World = require "../base/world"
local vis = require "../base/vis"

FastBallPlacement.MIN_ROBOTS = 2
FastBallPlacement.MAX_ROBOTS = 2

local STATE_START = "STATE_START"
local STATE_MOVE_TO_POS = "STATE_MOVE_TO_POS"
local STATE_EXECUTE_PASS = "STATE_EXECUTE_PASS"
local STATE_ACCEPT_PASS = "STATE_ACCEPT_PASS"
local STATE_WAITING_FOR_ADJUST = "STATE_WAITING_FOR_ADJUST"
local STATE_SET_BACK = "STATE_SET_BACK"
local STATE_FINE_ADJUST = "STATE_FINE_ADJUST"
local STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"

local RECOMPUTE_DISTANCE = 0.05
local ARRIVED_DISTANCE = 0.05
local MOVE_VS_ADJUST_DISTANCE = 0.65

local PLACEMENT_RADIUS = 0.1
local ACCEPT_DRIBBLER_SPEED = 0.6

-- Time the robot waits after accepting a task before he moves a bit to the back
local SETBACK_WAIT_TIME = 0.4

local PULL_TO_FIELD_HACK_TIME = 3

function FastBallPlacement.canStart()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_canContinue()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_init()

	self:_determineRoles()
	self:_recomputePositions()

	-- Important for pass accepting
	self._ballReceiverIntersects = true

	self._state = STATE_START
	self._mainAttacker = nil
	self._restartTask = false
	self._stateChangeTime = nil

	self._setBackPosition = nil

	-- For PlaceBall hack
	self._ballInFieldTimer = nil

end

function FastBallPlacement:_updateTasks()

	local taskAssignments = {}

	local oldState = self._state
	self._state = self:_getNextState(self._state)
	self._restartTask = oldState ~= self._state
	if self._restartTask then
		self._stateChangeTime = World.Time
	end

	debug.push("ball placement")
	debug.set("state", self._state)
	debug.set("state change time", self._stateChangeTime)
	debug.set("ball pushable", self:_isBallPushable(World.Ball))
	debug.pop()

	vis.addCircle("ball placement", World.BallPlacementPos, PLACEMENT_RADIUS, vis.colors.orange)

	if self._state == STATE_START then
		self:_determineRoles()
		self:_recomputePositions()

		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._restartTask }
		taskAssignments[self.RECEIVER] = { class = Halt, restart = self._restartTask }
	elseif self._state == STATE_PULL_TO_FIELD then

		local nearestFieldPos = Field.limitToField(World.Ball.pos)
		local placePos = nearestFieldPos + (nearestFieldPos - World.Ball.pos):setLength(2 * World.Ball.radius)

		taskAssignments[self.SHOOTER] = { class = PlaceBall, params = { placePos }, restart = self._restartTask}
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._computedReceiverPos }, restart = self._restartTask }
	elseif self._state == STATE_MOVE_TO_POS then
		self._mainAttacker = self.SHOOTER

		-- We want to recompute positions if the ball moves away from the originally computed position too much
		if self._computedShooterPos:distanceTo(World.Ball.pos) > RECOMPUTE_DISTANCE then
			self:_recomputePositions()
			self._restartTask = true
		end

		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self._computedShooterPos }, restart = self._restartTask }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._computedReceiverPos}, restart = self._restartTask }

	elseif self._state == STATE_EXECUTE_PASS then
		self._mainAttacker = self.SHOOTER

		-- TODO test on 9x12 field
		local dist = (self.SHOOTER.pos - self.RECEIVER.pos):length()

		local ballSpeed = math.max(2, 0.14 * dist + 1.3)

		taskAssignments[self.SHOOTER] = { class = Pass, params = { self.RECEIVER, World.BallPlacementPos, false, nil, nil, ballSpeed}, restart = self._restartTask }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._computedReceiverPos}, restart = self._restartTask }
	elseif self._state == STATE_ACCEPT_PASS then
		self._mainAttacker = self.RECEIVER
		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._restartTask }

		self.RECEIVER:setDribblerSpeed(ACCEPT_DRIBBLER_SPEED)

		local ballSpeed = World.Ball.speed:copy()
		local intersection, ballLambda = geom.intersectLineLine(World.Ball.pos, ballSpeed, self.RECEIVER.pos, ballSpeed:perpendicular());
		self._ballReceiverIntersects = ballLambda > 0

		vis.addPath("ball placement", { self.RECEIVER.pos, intersection, World.Ball.pos }, vis.colors.red)

		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { intersection }, restart = true }
		-- Stop moving if the ball is near the receiver
		if World.Ball.pos:distanceTo(self.RECEIVER.pos) < World.Ball.radius + self.RECEIVER.shootRadius + 0.1 then
			taskAssignments[self.RECEIVER] = {class = MoveToPos, params = { self.RECEIVER.pos, self.RECEIVER.dir }, restart = true }
		end

	elseif self._state == STATE_WAITING_FOR_ADJUST then
		self._mainAttacker = self.RECEIVER

		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._restartTask }
		-- We change after a certain time because we want the ball to stop spinning
		-- See getNextState
		taskAssignments[self.RECEIVER] = { class = Halt, restart = self._restartTask }
	elseif self._state == STATE_SET_BACK then
		self._mainAttacker = self.RECEIVER

		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._restartTask }

		if self._restartTask then
			self._setBackPosition = self.RECEIVER.pos + (self.RECEIVER.pos - World.Ball.pos):setLength(self.RECEIVER.radius * 2)
		end

		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._setBackPosition }, restart = self._restartTask}

	elseif self._state == STATE_FINE_ADJUST then
		self._mainAttacker = self.RECEIVER

		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._restartTask }

		taskAssignments[self.RECEIVER] = { class = PlaceBall }

	end

	if not taskAssignments[self.SHOOTER] then
		error( "No task assigned to shooter (state = " .. self._state .. ")")
	end
	if not taskAssignments[self.RECEIVER] then
		error("No task assigned to receiver (state = " .. self._state .. ")")
	end

	return taskAssignments, self._mainAttacker

end

function FastBallPlacement:_getNextState(currentState)

	local nextState = currentState

	if currentState == STATE_START then
		if World.Ball.pos:distanceTo(World.BallPlacementPos) < MOVE_VS_ADJUST_DISTANCE then
			nextState = STATE_FINE_ADJUST
		elseif not self:_isBallPushable(World.Ball) then
			nextState = STATE_PULL_TO_FIELD
		else
			nextState = STATE_MOVE_TO_POS
		end
	elseif currentState == STATE_PULL_TO_FIELD then
		-- TODO mieser hack, Zeit überprüfen ist unsauber, messaging is better
		if self:_isBallPushable(World.Ball) then
			if not self._ballInFieldTimer then
				self._ballInFieldTimer = World.Time
			end
			if World.Time - self._ballInFieldTimer > PULL_TO_FIELD_HACK_TIME then
				nextState = STATE_START
			end
		else
			self._ballInFieldTimer = nil
		end
	elseif currentState == STATE_MOVE_TO_POS then
		if self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < ARRIVED_DISTANCE
			and self.SHOOTER.pos:distanceTo(self._computedShooterPos) < ARRIVED_DISTANCE then
			nextState = STATE_EXECUTE_PASS
		end
	elseif currentState == STATE_EXECUTE_PASS then
		if BallObserver.isShot() then
			nextState = STATE_ACCEPT_PASS
		end
	elseif currentState == STATE_ACCEPT_PASS then
		local ballDist = World.Ball.pos:distanceTo(self.RECEIVER.pos)

		if World.Ball.speed:length() < 0.05 then
			if ballDist > MOVE_VS_ADJUST_DISTANCE then
				nextState = STATE_MOVE_TO_POS
			else
				nextState = STATE_WAITING_FOR_ADJUST
			end
		elseif not self._ballReceiverIntersects and ballDist > MOVE_VS_ADJUST_DISTANCE then
			nextState = STATE_MOVE_TO_POS
		end

	elseif currentState == STATE_WAITING_FOR_ADJUST then

		local timeInState = World.Time - self._stateChangeTime

		if timeInState > SETBACK_WAIT_TIME then
			nextState = STATE_SET_BACK
		end

	elseif currentState == STATE_SET_BACK then

		if self.RECEIVER.pos:distanceTo(self._setBackPosition) < ARRIVED_DISTANCE then
			nextState = STATE_FINE_ADJUST
		end

	elseif currentState == STATE_FINE_ADJUST then
		nextState = currentState
		if World.Ball.pos:distanceTo(World.BallPlacementPos) > MOVE_VS_ADJUST_DISTANCE then
			nextState = STATE_START
		end
	else
		-- Invalid state
		nextState = nil
	end

	assert(nextState, "nextState can't be nil, currentState is probably invalid")
	return nextState

end

function FastBallPlacement:_determineRoles()
	local posOne = self._robots[1].pos
	local posTwo = self._robots[2].pos

	if math.max(posOne:distanceTo(World.Ball.pos), posTwo:distanceTo(World.BallPlacementPos))
		< math.max(posOne:distanceTo(World.BallPlacementPos), posTwo:distanceTo(World.Ball.pos)) then
		self.SHOOTER = self._robots[1]
		self.RECEIVER = self._robots[2]
	else
		self.SHOOTER = self._robots[2]
		self.RECEIVER = self._robots[1]
	end
end

function FastBallPlacement:_recomputePositions()
	local distanceToPos = self.SHOOTER.shootRadius + World.Ball.radius + 0.03
	local ballToPlacement = (World.BallPlacementPos - World.Ball.pos):setLength(distanceToPos)
	self._computedShooterPos = World.Ball.pos - ballToPlacement
	self._computedReceiverPos = World.BallPlacementPos + ballToPlacement
end

function FastBallPlacement:_isBallPushable(ball)
	return Field.isInField(ball.pos)
end

return FastBallPlacement
