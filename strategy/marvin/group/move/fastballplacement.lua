local FastBallPlacement = Class("Test.Move.FastBallPlacement", require "group/move/base")

-- TODO sort alphabetically
local World = require "../base/world"
local vis = require "../base/vis"
local geom = require "../base/geom"
local debug = require "../base/debug"

local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local PlaceBall = require "task/placeball"

FastBallPlacement.MIN_ROBOTS = 2
FastBallPlacement.MAX_ROBOTS = 2

local STATE_MOVE_TO_POS = 0
local STATE_EXECUTE_PASS = 1
local STATE_ACCEPT_PASS = 2
local STATE_FINE_ADJUST = 3

function FastBallPlacement.canStart()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_canContinue()
	return World.RefereeState == "BallPlacementOffensive"
end

function FastBallPlacement:_init()

	-- TODO optimize shooter/receiver selection
	self.SHOOTER = self._robots[1]
	self.RECEIVER = self._robots[2]

	self._state = STATE_MOVE_TO_POS
	self._previousShooterBallDistance = self:_getBallDistance(self.SHOOTER)

	self._mainAttacker = self.SHOOTER

	self:_recomputePositions()

end	

local function stateAsString(state)
	if state == STATE_MOVE_TO_POS then
		return "STATE_MOVE_TO_POS"
	elseif state == STATE_EXECUTE_PASS then
		return "STATE_EXECUTE_PASS"
	elseif state == STATE_ACCEPT_PASS then
		return "STATE_ACCEPT_PASS"
	elseif state == STATE_FINE_ADJUST then
		return "STATE_FINE_ADJUST"
	else
		return "NOT_A_STATE"
	end
end

function FastBallPlacement:_updateTasks()

	local taskAssignments = {}

	vis.addCircle("ball placement", World.BallPlacementPos, 0.07, vis.colors.gold)
	debug.set("placement state", stateAsString(self._state))

	if self._state == STATE_MOVE_TO_POS then

		self._mainAttacker = self.SHOOTER

		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self._computedShooterPos }, restart = true }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._receiverPos }, restart = true } 

		-- We want to recompute positions if the ball moves away from the original position too much
		if self._computedShooterPos:distanceTo(World.Ball.pos) > 0.1 then
			self:_recomputePositions()
		end

		-- We dont care if SHOOTER already arrived at his position as task/pass will move to the ball automatically
		-- His MoveToPos is only for optimization
		if self.RECEIVER.pos:distanceTo(self._receiverPos) < 0.05 then
			--log("Changing state to STATE_EXECUTE_PASS")
			self._state = STATE_EXECUTE_PASS
		end

	elseif self._state == STATE_EXECUTE_PASS then

		self._mainAttacker = self.SHOOTER

		-- Make speed depend on distance
		taskAssignments[self.SHOOTER] = { class = Pass, params = { self.RECEIVER, World.BallPlacementPos, false, nil, nil, 1.2 } }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { self._receiverPos }, restart = true  }

		if World.Ball.speed:length() > 0.5 then
			--log("Changing state to STATE_ACCEPT_PASS")
			self._state = STATE_ACCEPT_PASS
		end

	elseif self._state == STATE_ACCEPT_PASS then

		self._mainAttacker = self.RECEIVER

		local ballSpeed = World.Ball.speed:copy()
		local intersection, ballLambda = geom.intersectLineLine(World.Ball.pos, ballSpeed, self.RECEIVER.pos, ballSpeed:perpendicular())

		vis.addCircle("ball placement", intersection, 0.05, vis.colors.gold)
		vis.addPath("ball placement", { World.Ball.pos, intersection, self.RECEIVER.pos }, vis.colors.red)

		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { self._computedShooterPos }, restart = true  }
		taskAssignments[self.RECEIVER] = { class = MoveToPos, params = { intersection }, restart = true  }

		-- TODO better state change

		-- if ballLambda is negative, the ball is moving away from our receiver
		if ballLambda <= 0 then
			self._state = STATE_MOVE_TO_POS
		end
		-- if the Ball stopped, it should be near enough the receiver, if not start anew
		if ballSpeed:length() < 0.05 then
			if World.Ball.pos:distanceTo(self.RECEIVER.pos) > 0.3 then
				log(tostring(ballSpeed:distanceTo(self.RECEIVER.pos)))
				self._state = STATE_MOVE_TO_POS
			else
				self._state = STATE_FINE_ADJUST
			end
		end

	elseif self._state == STATE_FINE_ADJUST then

		self._mainAttacker = self.RECEIVER

		taskAssignments[self.SHOOTER] = { class = MoveToPos, params = { Vector(0, 0) }, restart = true }
		taskAssignments[self.RECEIVER] = { class = PlaceBall }

		-- TODO failsafe falls sich der Ball schnell wegbewegt (WTF?)
		if World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.4 then
			self._state = STATE_MOVE_TO_POS
		end

	end	
	
	return taskAssignments, self._mainAttacker

end

function FastBallPlacement:_recomputePositions()


	local SHOOTER_RADIUS = self.SHOOTER.shootRadius + World.Ball.radius
	local RECEIVER_RADIUS = self.RECEIVER.shootRadius + World.Ball.radius

	local ballPos = World.Ball.pos:copy()
	local placementPos = World.BallPlacementPos:copy()
	local ballToPlacement = (placementPos - ballPos)

	self._ballToPlacementDir = ballToPlacement:copy():normalize()
	self._computedShooterPos = ballPos - ballToPlacement:copy():setLength(SHOOTER_RADIUS)
	self._receiverPos = placementPos + ballToPlacement:copy():setLength(RECEIVER_RADIUS)

end

function FastBallPlacement:_getBallDistance(robot)
	return robot.pos:distanceTo(World.Ball.pos)
end


return FastBallPlacement