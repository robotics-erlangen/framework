local Base = require "agent/base/behavior"
local Stop = Class("Agent.Attacker.Stop", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local StopAttack = require "task/stopattack"
local PlaceBall = require "task/placeball"


function Stop:_stop()
	self._placeTimer = nil
end

function Stop:check()
	return Referee.isStopState() and self._inbox.mainAttacker().trainer == self._robot
end

function Stop:_updateTask()
	if World.RefereeState == "BallPlacementOffensive" then -- ball not in position yet
		-- ball not in position or is moving (this is also true while the ball is pulled)
		local placingRequired = (World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.1 or World.Ball.speed:length() > 0.1)
		local assumedBallPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.shootRadius + World.Ball.radius)
		local dribblerAtTarget = not World.Ball:isPositionValid() and assumedBallPos:distanceTo(World.BallPlacementPos) < 0.05
		if placingRequired and not dribblerAtTarget then
			self._placeTimer = World.Time
		end
		-- wait once second after placing is finished before moving away
		if self._placeTimer and self._placeTimer + 1 > World.Time then
			return PlaceBall
		end
	end
	self._placeTimer = nil
	return StopAttack
end

return Stop
