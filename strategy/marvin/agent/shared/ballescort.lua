local Base = require "agent/base/behavior"
local BallEscort = Class("Agent.Shared.BallEscort", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local BallEscortTask = require "task/ballescort"


function BallEscort:_init()
	self._ownTask = nil
	self._maxDistanceToBall = 0.2 + self._robot.radius
	self._lastballOutPos = nil
	self._ballOutDistance = 0.3
	self._minRobot = nil
	self._counter = 0
end

function BallEscort:_stop()
	self._ownTask = nil
end

function BallEscort:check()

	if (World.RefereeState == "Game" or World.RefereeState == "GameForce") and self._inbox.mainAttacker().trainer == self._robot then

		local ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed, 0)

		-- hysteresis
		if self._ownTask == "BallEscort" then
			self._maxDistanceToBall = 0.10 + self._robot.radius
			self._ballOutDistance = 0.4
		end

		-- don't if ballOutPos flickers
		if self._lastballOutPos and ballOutPos and self._lastballOutPos:distanceTo(ballOutPos) > self._ballOutDistance then
			self._counter = 0
			self._lastballOutPos = ballOutPos
			return false
		end

		self._lastballOutPos = ballOutPos

		debug.push("BallEscort")
		debug.set("touchedLast", Referee.opponentTouchedLast())
		debug.set("receivesPass", Ball.receivesPass(self._robot))
		debug.pop()

		if Referee.opponentTouchedLast() and not Ball.receivesPass(self._robot) then

			if ballOutPos then
				
				local oppTimeToPos = math.huge
				for _, oppRobots in ipairs(World.OpponentRobots) do
					
					-- don't if opponent can reach the ball
					if Physics.robotTimeToBall(oppRobots, World.Ball, World.Geometry.OpponentGoal, 0) ~= math.huge or Ball.receivesPass(oppRobots) then
						self._counter = 0
						return false
					end

					if Physics.robotTimeToPos(oppRobots, ballOutPos, Vector(0,0)) < oppTimeToPos then
						oppTimeToPos = Physics.robotTimeToPos(oppRobots, ballOutPos, Vector(0,0))
						self._minRobot  = oppRobots
					end

				end

				debug.push("BallEscort")
				debug.set("robotTimeToBall", Physics.robotTimeToBall(self._robot, World.Ball, World.Geometry.OpponentGoal, 0))
				debug.pop()

				if Physics.robotTimeToBall(self._robot, World.Ball, World.Geometry.OpponentGoal, 0) == math.huge then 

					-- ballOutPos should not be in penalty area
					if Referee.opponentTouchedLast() and (math.abs(ballOutPos.x) > World.Geometry.DefenseStretch/2 + World.Geometry.DefenseRadius) then

						local minRobotDistanceToBall = self._minRobot.pos:distanceTo(World.Ball.pos)
						local ownDistanceToBall = self._robot.pos:distanceTo(World.Ball.pos)
						local opponentMaxDistanceToBall = 0.2 + self._robot.radius*3

						debug.push("BallEscort")
						debug.set("ownDistanceToBall", ownDistanceToBall > self._maxDistanceToBall)
						debug.set("oppDistanceToBall", minRobotDistanceToBall > opponentMaxDistanceToBall)
						debug.pop()

						-- both robots should not be too close
						if ownDistanceToBall > self._maxDistanceToBall and minRobotDistanceToBall > opponentMaxDistanceToBall then

							self._counter = self._counter + 1
							debug.push("BallEscort")
							debug.set("counter", self._counter)
							debug.pop()

							-- to make sure the decision is not too early
							if self._counter > 5 then
								self._ownTask = "BallEscort"
								return true	
							end
						end
					end
				end
			end
		end
	end
	return false 
end

function BallEscort:_updateTask()
	return BallEscortTask, {self._minRobot}
end

return BallEscort
