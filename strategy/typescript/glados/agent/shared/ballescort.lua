local Base = require "agent/base/behavior"
local BallEscort = Class("Agent.Shared.BallEscort", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local RefereeObs = require "observer/referee"
local Robot = require "observer/robot"
local BallEscortTask = require "task/shared/ballescort"

function BallEscort:_init()
	self._minRobot = nil
end

function BallEscort:_stop()
end

function BallEscort:_checkOpponentTimings()
	local minOppRobot, minOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if minOppTime == math.huge then
		-- firstRobotAtBall calls minTimeToBall which assumes the robot wants to look at it's opponent's goal
		-- This can lead to situations where the function returns math.huge even though it wouldn't if we checked
		-- with a different position (here: the ball position while receiving a pass)
		for _, robot in pairs(World.OpponentRobots) do
			if Ball.receivesPass(robot) then
				local time = Physics.robotTimeToBall(robot, World.Ball, World.Ball.pos, robot.maxSpeed)
				if time < minOppTime then
					minOppRobot = robot
					minOppTime = time
				end
			end
		end
	end

	return minOppRobot, minOppTime
end

function BallEscort:_isReachabilityOk(oppTime, ownTime)
	if not (oppTime < math.huge) then
		return true
	end

	if not self._active then
		return false
	end

	return oppTime - ownTime > 1
end

function BallEscort:check()
	local shotHysteresis = self._active and 0.075 or 0.15

	if not (World.RefereeState == "Game" or World.RefereeState == "GameForce")
			or not Referee.opponentTouchedLast()
			or Ball.wasShot(shotHysteresis) then
		return false
	end

	local ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)

	debug.set("BallEscort/ballOutPos", ballOutPos)

	-- ballOutPos should not be in defense area
	if not ballOutPos or math.abs(ballOutPos.x) <= Field.defenseBaselineIntersectionDistance() then
		return false
	end

	local minOppRobot, minOppTime = self:_checkOpponentTimings()
	local ownTimeToBall = Robot.minTimeToBall(self._robot)

	debug.set("BallEscort/ownTimeToBall", ownTimeToBall)
	debug.set("BallEscort/minRobot", minOppRobot)
	debug.set("BallEscort/minOppTime", minOppTime)

	if minOppRobot then
		self._minRobot = minOppRobot
	end

	if not self:_isReachabilityOk(minOppTime, ownTimeToBall) then
		return false
	end

	local icing = RefereeObs.opponentIcingPredicted(World.Ball)
	debug.set("BallEscort/icing", icing)

	local distToBorder = self._active and 0.7 or 0.5

	-- If we can reach the ball we should try to if we are not already close to the field border
	if not icing and ownTimeToBall < math.huge and math.abs(self._robot.pos.x) < World.Geometry.FieldWidthHalf - distToBorder and math.abs(self._robot.pos.y) < World.Geometry.FieldHeightHalf - distToBorder then
		return false
	end

	self:_applyForMainAttacker()
	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	return true
end

function BallEscort:_updateTask()
	return BallEscortTask, {self._minRobot}
end

return BallEscort
