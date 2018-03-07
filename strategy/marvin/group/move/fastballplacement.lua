local FastBallPlacement = Class("Group.Move.FastBallPlacement", require "group/move/base")

local BallObserver = require "observer/ball"
local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Halt = require "task/halt"
local MoveToPos = require "task/movetopos"
local Physics = require "observer/physics"
local Pass = require "task/pass"
local PlaceBall = require "task/placeball"
local vis = require "../base/vis"
local World = require "../base/world"

FastBallPlacement.MIN_ROBOTS = 2
FastBallPlacement.MAX_ROBOTS = 2

local STATE_WAIT_FOR_BALL_STOP = "STATE_WAIT_FOR_BALL_STOP"
local STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
local STATE_GET_INTO_POSITION = "STATE_GET_INTO_POSITION"
local STATE_EXECUTE_PASS = "STATE_EXECUTE_PASS"
local STATE_ACCEPT_PASS = "STATE_ACCEPT_PASS"
local STATE_WAIT_FOR_SET_BACK = "STATE_WAIT_FOR_SET_BACK"
local STATE_SET_BACK = "STATE_SET_BACK"
local STATE_FINE_ADJUST = "STATE_FINE_ADJUST"

-- Tolerance according to the rules
local TOLERANCE = 0.1


local ARRIVED_DISTANCE = 0.05
local BALL_STOP_SPEED = 0.2
local MAX_BALL_DISTANCE = 0.25
local FINE_ADJUST_ZONE = 2
local MAX_DRIBBLER_SPEED = 0.8
local SETBACK_WAIT_TIME = 0.4

function FastBallPlacement.canStart()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_canContinue()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_init()
	self._state = STATE_WAIT_FOR_BALL_STOP
	self._stateChanged = true
	self._stateChangeTime = World.Time

	self._ballStartPos = World.Ball.pos

	self._ballReceiverIntersects = false

	self:_determineRoles()
	self:_determinePositions()
	self._mainAttacker = self.SHOOTER
end

function FastBallPlacement:_updateTasks()
	local taskAssignments = {}

	local SHOOTER_OBSTACLES = {
		{
			type = "circle",
			x = World.Ball.pos.x,
			y = World.Ball.pos.y,
			radius = World.Ball.radius,
			name = "g/m/fastballplacement Ball"
		},
		{
			type = "circle",
			x = World.BallPlacementPos.x,
			y = World.BallPlacementPos.y,
			radius = FINE_ADJUST_ZONE,
			name = "g/m/fastballplacement Receiver Zone"
		}
	}


	local oldState = self._state
	self._state = self:_getNextState(self._state)
	self._stateChanged = self._state ~= oldState
	if self._stateChanged then
		self._stateChangeTime = World.Time
	end

	debug.push("Ball Placement")
	debug.set("State", self._state)
	debug.pop()

	vis.addCircle("g/m/fastballplacement", World.BallPlacementPos, TOLERANCE, vis.colors.red, true)
	vis.addCircle("g/m/fastballplacement", World.BallPlacementPos, FINE_ADJUST_ZONE, vis.colors.orange)

	if self._state == STATE_WAIT_FOR_BALL_STOP then
		self:_determinePositions()
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos },
			restart = true
		}
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { Field.limitToField(self._computedShooterPos), nil, nil, nil, true, SHOOTER_OBSTACLES },
			restart = true
		}
	elseif self._state == STATE_PULL_TO_FIELD then
		self._mainAttacker = self.SHOOTER
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos },
			restart = self._stateChanged
		}
		taskAssignments[self.SHOOTER] = {
			class = PlaceBall,
			params = { Field.limitToField(World.Ball.pos, -0.05) },
			restart = self._stateChanged
		}
	elseif self._state == STATE_GET_INTO_POSITION then
		self._mainAttacker = self.SHOOTER
		self:_determinePositions()
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos },
			restart = true
		}
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { self._computedShooterPos, nil, nil, nil, true, SHOOTER_OBSTACLES },
			restart = true
		}
	elseif self._state == STATE_EXECUTE_PASS then
		self._mainAttacker = self.SHOOTER

		local dist = (self.SHOOTER.pos - self.RECEIVER.pos):length()
		local ballSpeed = math.max(2, 0.14 * dist + 1.3)

		-- TODO fix in defense area
		taskAssignments[self.SHOOTER] = {
			class = Pass,
			params = { self.RECEIVER, World.BallPlacementPos, false, nil, nil, ballSpeed},
			restart = self._stateChanged
		}
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos},
			restart = self._stateChanged
		}
	elseif self._state == STATE_ACCEPT_PASS then
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }

		self.RECEIVER:setDribblerSpeed(MAX_DRIBBLER_SPEED)

		local ballSpeed = World.Ball.speed
		local intersection, ballLambda = geom.intersectLineLine(World.Ball.pos, ballSpeed, self.RECEIVER.pos, ballSpeed:perpendicular());
		self._ballReceiverIntersects = ballLambda > 0

		vis.addPath("g/m/fastballplacement", { self.RECEIVER.pos, intersection, World.Ball.pos }, vis.colors.red)

		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { intersection }, restart = true }
		-- Stop moving if the ball is near the receiver
		-- TODO maybe use Halt
		if World.Ball.pos:distanceTo(self.RECEIVER.pos) < World.Ball.radius + self.RECEIVER.shootRadius + 0.1 then
			taskAssignments[self.RECEIVER] = {
				class = MoveToPos,
				params = { self.RECEIVER.pos, self.RECEIVER.dir },
				restart = true
			}
		end
	elseif self._state == STATE_WAIT_FOR_SET_BACK then
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }
		taskAssignments[self.RECEIVER] = { class = Halt, restart = self._stateChanged }
	elseif self._state == STATE_SET_BACK then
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }
		if self._stateChanged then
			self._computedReceiverPos = self.RECEIVER.pos + (self.RECEIVER.pos - World.Ball.pos):setLength(2 * self.RECEIVER.radius)
		end
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos },
			restart = self._stateChanged
		}
	elseif self._state == STATE_FINE_ADJUST then
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.RECEIVER] = {
			class = PlaceBall,
			restart = self._stateChanged
		}
		local shooterTargetPos = self.SHOOTER.pos
		if self.SHOOTER.pos:distanceTo(World.BallPlacementPos) < FINE_ADJUST_ZONE then
			shooterTargetPos = World.Geometry.FriendlyGoal
		end
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { shooterTargetPos, nil, nil, nil, nil, SHOOTER_OBSTACLES },
			restart = true
		}
	end

	if not taskAssignments[self.SHOOTER] then
		error("SHOOTER has no task assigned in state=" .. self._state)
	end
	if not taskAssignments[self.RECEIVER] then
		error("RECEIVER has not task assigned in state=" .. self._state)
	end
	return taskAssignments, self._mainAttacker
end

function FastBallPlacement:_getNextState(currentState)
	local nextState

	if currentState == STATE_WAIT_FOR_BALL_STOP then
		nextState = STATE_WAIT_FOR_BALL_STOP
		if World.Ball.speed:length() < BALL_STOP_SPEED then
			self._ballStartPos = World.Ball.pos
			if World.Ball.pos:distanceTo(World.BallPlacementPos) < FINE_ADJUST_ZONE then
				nextState = STATE_FINE_ADJUST
			elseif not Field.isInField(World.Ball.pos) then
				nextState = STATE_PULL_TO_FIELD
			else
				nextState = STATE_GET_INTO_POSITION
			end
		end
	elseif currentState == STATE_PULL_TO_FIELD then
		nextState = STATE_PULL_TO_FIELD
		if Field.isInField(World.Ball.pos)
			and self.SHOOTER.pos:distanceTo(World.Ball.pos) > Constants.stopBallDistance / 3 then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end
	elseif currentState == STATE_GET_INTO_POSITION then
		nextState = STATE_GET_INTO_POSITION
		if World.Ball.speed:length() > BALL_STOP_SPEED
			or World.Ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		elseif self.SHOOTER.pos:distanceTo(self._computedShooterPos) < ARRIVED_DISTANCE
			and self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < ARRIVED_DISTANCE then
			nextState = STATE_EXECUTE_PASS
		end
	elseif currentState == STATE_EXECUTE_PASS then
		nextState = STATE_EXECUTE_PASS
		if BallObserver.isShot() then
			nextState = STATE_ACCEPT_PASS
		elseif World.Ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end
	elseif currentState == STATE_ACCEPT_PASS then
		nextState = STATE_ACCEPT_PASS

		-- TODO Add additional states (because of wiggling after changing to fine adjust)
		local ballDist = World.Ball.pos:distanceTo(self.RECEIVER.pos)
		if (not self._ballReceiverIntersects and ballDist > MAX_BALL_DISTANCE)
				or World.Ball.speed:length() < BALL_STOP_SPEED then
			nextState = STATE_WAIT_FOR_SET_BACK
		end
	elseif currentState == STATE_WAIT_FOR_SET_BACK then
		nextState = STATE_WAIT_FOR_SET_BACK
		if World.Time - self._stateChangeTime > SETBACK_WAIT_TIME then
			nextState = STATE_SET_BACK
		end
	elseif currentState == STATE_SET_BACK then
		nextState = STATE_SET_BACK
		if self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < ARRIVED_DISTANCE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end
	elseif currentState == STATE_FINE_ADJUST then
		nextState = STATE_FINE_ADJUST
		if World.Ball.pos:distanceTo(World.BallPlacementPos) > FINE_ADJUST_ZONE then
			nextState = STATE_WAIT_FOR_BALL_STOP
		end
	end

	if not nextState then
		error("nextState not set, currentState=" .. currentState .. " is probably invalid")
	end
	return nextState
end

local function estimateBallStopPosition(ball)
	local stopTime = Physics.ballStopTime(ball)
	return Physics.ballAtTime(ball, stopTime).pos
end

function FastBallPlacement:_determineRoles()
	local ballStopPos = estimateBallStopPosition(World.Ball)
	local oneBallDist = self._robots[1].pos:distanceToSq(ballStopPos)
	local twoBallDist = self._robots[2].pos:distanceToSq(ballStopPos)
	local onePlacementDist = self._robots[1].pos:distanceToSq(World.BallPlacementPos)
	local twoPlacementDist = self._robots[2].pos:distanceToSq(World.BallPlacementPos)

	local firstIsReceiver = oneBallDist < twoBallDist
	if ballStopPos:distanceTo(World.BallPlacementPos) > FINE_ADJUST_ZONE then
		firstIsReceiver = math.max(twoBallDist, onePlacementDist) < math.max(oneBallDist, twoPlacementDist)
	end

	if firstIsReceiver then
		self.RECEIVER = self._robots[1]
		self.SHOOTER = self._robots[2]
	else
		self.RECEIVER = self._robots[2]
		self.SHOOTER = self._robots[1]
	end
end

function FastBallPlacement:_determinePositions()
	local offset = (World.Ball.pos - World.BallPlacementPos):setLength(self.RECEIVER.shootRadius + World.Ball.radius + 0.05)
	self._computedShooterPos = World.Ball.pos + offset
	self._computedReceiverPos = World.BallPlacementPos - offset
end

return FastBallPlacement
