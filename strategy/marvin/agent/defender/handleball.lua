local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local DefUtil = require "util/defense"
local Duel = require "task/duel"
local InterceptPass = require "task/interceptpass"
local debug = require "../base/debug"

--[[
	timeAdvance ist doof, weil
		- geht kaputt, wenn wir knapp vor dem gegner in der ballinie stehen
			-> kleiner advance, interceptPass wird aktiv :(
		- beachtet nicht die zeit die wir zum ball überhaupt brauchen
		- man sollte sich auch mal für MA bewerben, wenn man nicht unbedingt schneller da ist (zB force duel)

	stattdessen
		- MA bewerbung schicken, falls
			- ManMark
			- CenterBack
				- nicht falls ein Gegner den Ball früher abfangen wird
					-> winkel zwischen ballrichtung und gegner-tor beachten
					-> ballgeschwindigkeit beachten
				- falls wir den Ball locker abfangen können
				- falls wir einen gefährlichen Querpass ablenken können
]]

function HandleBall:_stop()
	self._mainAttackerApplicationSent = false
end

function HandleBall:_shouldSendMAApplication()
	local role = self._inbox.roleAssignment().trainer

	-- Manmarks should always apply for MA
	if role and role.name == "ManMark" then
		return true
	end

	local interceptionTime = math.huge
	local interceptionDist = math.huge
	if Ball.receivesPass(self._robot) then
		local posOnLine = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		local timeToLine = Physics.robotTimeToPos(self._robot, posOnLine, Vector(0, 0), false)
		local dist = World.Ball.pos:distanceTo(posOnLine)
		if timeToLine < 0.4 or timeToLine + 0.1 < Physics.ballRollTime(World.Ball, dist) then
			interceptionTime = timeToLine
			interceptionDist = dist
		end
	end

	-- if we cannot reach the ball in a reasonable time, we stay CB
	if interceptionTime > 0.7 then
		return false
	end

	-- if an opponent robot will catch the ball before us, we stay CB
	for _,r in ipairs(World.OpponentRobots) do
		if r.pos.y > -1 and Ball.receivesPass(r) then
			local posOnLine = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed)
			local timeToLine = Physics.robotTimeToPos(self._robot, posOnLine, 
				(World.Geometry.FriendlyGoal - r.pos):setLength(r.maxSpeed), false)
			local dist = World.Ball.pos:distanceTo(posOnLine)
			if dist < interceptionDist + self._robot.radius and timeToLine < 1
					and (r.pos - World.Geometry.FriendlyGoal):absoluteAngleDiff(World.Ball.speed) < 10 * math.pi/360 then
				return false
			end
		end
	end

	return true
end

function HandleBall:check()
	if Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState()
			or Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) then
		return false
	end

	local mainAttacker = self._inbox.mainAttacker().trainer

	if mainAttacker == self._robot or self:_shouldSendMAApplication() then
		self:_applyForMainAttacker()
		self._mainAttackerApplicationSent = true
	else
		self._mainAttackerApplicationSent = false
	end

	return mainAttacker == self._robot
end

function HandleBall:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ManMark" and not DefUtil.dangerousBallTowardsDefense() then
		self._send.poolChangeRequest("trainer")
	end

	return Duel
end

return HandleBall