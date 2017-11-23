local FastBallPlacement = Class("Test.Move.FastBallPlacement", require "group/move/base")

local debug = require "../base/debug"
local geom = require "../base/geom"
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

local PASS_SPEED = 1.0
local PLACEMENT_RADIUS = 0.1

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

end

function FastBallPlacement:_updateTasks()

	local taskAssignments = {}

	local oldState = self._state
	self._state = self:_getNextState(self._state)
	self._restartTask = oldState ~= self._state
	debug.push("ball placement")
	debug.set("state", self._state)
	debug.set("state change time", self._stateChangeTime)
	debug.pop()

	vis.addCircle("ball placement", World.BallPlacementPos, PLACEMENT_RADIUS, vis.colors.orange)

	if self._state == STATE_START then
		self:_determineRoles()
		self:_recomputePositions()
	elseif self._state == STATE_MOVE_TO_POS then
		self._mainAttacker = self.SHOOTER

		-- We want to recompute positions if the ball moves away from the originally computed position too much
		if self._computedShooterPos:distanceTo(World.Ball.pos) > 0.1 then
			self:_recomputePositions()
			self._restartTask = true
		end

		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self._computedShooterPos }, restart = self._restartTask }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._computedReceiverPos}, restart = self._restartTask }

	elseif self._state == STATE_EXECUTE_PASS then
		self._mainAttacker = self.SHOOTER
		-- TODO make pass speed depend on distance

		taskAssignments[self.SHOOTER] = { class = Pass, params = { self.RECEIVER, World.BallPlacementPos, false, nil, nil, PASS_SPEED}, restart = self._restartTask }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._computedReceiverPos}, restart = self._restartTask }
	elseif self._state == STATE_ACCEPT_PASS then
		self._mainAttacker = self.RECEIVER
		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self.SHOOTER.pos }, restart = self._restartTask }
		
		self.RECEIVER:setDribblerSpeed(0.6)

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
		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self.SHOOTER.pos }, restart = self._restartTask }
		-- We change after a certain time because we want the ball to stop spinning
		-- See getNextState
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self.RECEIVER.pos, self.RECEIVER.dir }, restart = self._restartTask }
	elseif self._state == STATE_SET_BACK then
		self._mainAttacker = self.RECEIVER

		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self.SHOOTER.pos }, restart = self._restartTask }

		if self._setBackPosition == nil then
			self._setBackPosition = self.RECEIVER.pos + (self.RECEIVER.pos - World.Ball.pos):setLength(self.RECEIVER.radius * 2)
		end

		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._setBackPosition }, restart = self._restartTask}

	elseif self._state == STATE_FINE_ADJUST then
		self._mainAttacker = self.RECEIVER

		-- Ignore shooter
		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self.SHOOTER.pos }, restart = self._restartTask }

		taskAssignments[self.RECEIVER] = { class = PlaceBall }

	end

	assert(taskAssignments[self.SHOOTER], "No task assigned to shooter (state = " .. self._state .. ")")
	assert(taskAssignments[self.RECEIVER], "No task assigned to receiver (state = " .. self._state .. ")")

	return taskAssignments, self._mainAttacker

end

function FastBallPlacement:_getNextState(currentState)

	local nextState = currentState

	-- state is nil after init
	if currentState == STATE_START then
		self._stateChangeTime = World.Time
		if World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.5 then
			nextState = STATE_MOVE_TO_POS
		else
			nextState = STATE_FINE_ADJUST
		end
	elseif currentState == STATE_MOVE_TO_POS then
		-- We dont care if SHOOTER already arrived at his position as task/pass will move to the ball automatically
		-- His MoveToPos is only for optimization
		if self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < 0.05 then
			self._stateChangeTime = World.Time
			nextState = STATE_EXECUTE_PASS
		end
	elseif currentState == STATE_EXECUTE_PASS then
		if World.Ball.speed:length() > 0.5 then
			self._stateChangeTime = World.Time
			nextState = STATE_ACCEPT_PASS
		end
	elseif currentState == STATE_ACCEPT_PASS then

		if not self._ballReceiverIntersects then
			self._stateChangeTime = World.Time
			nextState = STATE_MOVE_TO_POS
		end

		-- TODO better state change
		if World.Ball.speed:length() < 0.05 then
			self._stateChangeTime = World.Time
			if World.Ball.pos:distanceTo(self.RECEIVER.pos) > 0.5 then
				nextState = STATE_MOVE_TO_POS
			else
				nextState = STATE_WAITING_FOR_ADJUST
			end
		end

	elseif currentState == STATE_WAITING_FOR_ADJUST then

		local timeInState = World.Time - self._stateChangeTime

		if timeInState > 2 then
			self._stateChangeTime = World.Time
			nextState = STATE_SET_BACK
		end

	elseif currentState == STATE_SET_BACK then

		if self.RECEIVER.pos:distanceTo(self._setBackPosition) < 0.05 then
			self._setBackPosition = nil
			self._stateChangeTime = World.Time
			nextState = STATE_FINE_ADJUST
		end

	elseif currentState == STATE_FINE_ADJUST then
		-- TODO change back to STATE_START if the ball moves to far away
	else
		-- Invalid state
		nextState = nil
	end

	assert(nextState, "nextState can't be nil, currentState is probably invalid")
	return nextState

end

function FastBallPlacement:_determineRoles()

	local robotOnePos = self._robots[1].pos
	local robotOneBallDistance = robotOnePos:distanceTo(World.Ball.pos)
	local robotOnePlacementDistance = robotOnePos:distanceTo(World.BallPlacementPos)

	local robotTwoPos = self._robots[2].pos
	local robotTwoBallDistance = robotTwoPos:distanceTo(World.Ball.pos)
	local robotTwoPlacementDistance = robotTwoPos:distanceTo(World.BallPlacementPos)

	-- TODO distance vergleich
	self.SHOOTER = self._robots[1]
	self.RECEIVER = self._robots[2]

end

function FastBallPlacement:_recomputePositions()
	local distanceToPos = self.SHOOTER.shootRadius + World.Ball.radius
	local ballToPlacement = (World.BallPlacementPos - World.Ball.pos):setLength(distanceToPos)
	self._computedShooterPos = World.Ball.pos - ballToPlacement
	self._computedReceiverPos = World.BallPlacementPos + ballToPlacement
end

return FastBallPlacement