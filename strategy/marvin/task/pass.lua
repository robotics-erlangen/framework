local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"


function Pass:_init(targetRobot, shootPos, passSpeed)
	self._targetRobot = assert(targetRobot, "targetRobot is missing")
	self._linearShoot = true
	self._dontShootHysteresis = true
	if passSpeed then
		self._passSpeed = passSpeed
	else
		self._passSpeed = self._targetRobot.constants.passSpeed
	end
	self._shootPos = shootPos
end

local MIN_BALL_DIST_FOR_PASS_MSG = 1
local MIN_OPP_CHIP_DIST = 0.35
local ADDITIONAL_TIME = 0.2
local DONT_SHOOT_HYSTERESIS = 0.15 --should ALWAYS be smaller than ADDITIONAL_TIME

function Pass:run()
	local newSuggestion = self._inbox.passSuggestion()[self._targetRobot]
	--a passSuggestion provides the position
	if newSuggestion and newSuggestion.pos then
		debug.set("passSuggestion 1", newSuggestion.pos)
		self._shootPos = newSuggestion.pos
	else  -- direct pass
		-- shoot ball into robot dribbler
		debug.set("passSuggestion 1", -1)

		self._shootPos = self._targetRobot.pos + Vector.fromAngle(self._targetRobot.dir) * self._targetRobot.shootRadius
	end

	local shootSpeed = self._robot:calculateShootSpeed(self._passSpeed,
		World.Ball.pos:distanceTo(self._shootPos))

	local corridorWidthHalfInner = 0.04
	local corridorWidthHalfOuter = 0.08
	local opponentReactionTime = 0.15
	local linearShootHysteresisFlag = true
	for _, opp in ipairs(World.OpponentRobots) do
		if opp == World.OpponentKeeper then
			goto continue
		end

		-- extrapolate the opponent for its reaction time
		local futureOppPos = opp.pos + opp.speed * opponentReactionTime
		local futureOpp = table.copy(opp)
		futureOpp.pos = futureOppPos

		-- if an opponent robot is already blocking a direct pass
		-- (does also return false if an opponent rushes through)
		local pointOfImpact = futureOppPos:nearestPosOnLine(World.Ball.pos, self._shootPos)
		if futureOppPos:distanceTo(pointOfImpact) < corridorWidthHalfInner then
			self._linearShoot = false
			linearShootHysteresisFlag = false
			break
		end
		if futureOppPos:distanceTo(pointOfImpact) < corridorWidthHalfOuter then
			linearShootHysteresisFlag = false
		end

		-- calculate interception times of the robot
		local pointNearImpactInner = pointOfImpact +
			(futureOppPos - pointOfImpact):setLength(corridorWidthHalfInner)
		local robotTimeInner = Physics.robotTimeToPos(futureOpp, pointNearImpactInner,
			(pointNearImpactInner - futureOppPos):setLength(futureOpp.maxSpeed)) + opponentReactionTime
		local pointNearImpactOuter = pointOfImpact +
			(futureOppPos - pointOfImpact):setLength(corridorWidthHalfOuter)
		local robotTimeOuter = Physics.robotTimeToPos(futureOpp, pointNearImpactOuter,
			(pointNearImpactOuter - futureOppPos):setLength(futureOpp.maxSpeed)) + opponentReactionTime


		-- calculate the ball time
		local shootBall = {pos = Vector(0, 0), speed = Vector(0, shootSpeed), maxSpeed = shootSpeed, radius = World.Ball.radius}
		local ballTime = Physics.ballRollTime(shootBall, pointOfImpact:distanceTo(World.Ball.pos))

		debug.set("pass interception"..opp.id, {
			opponent = opp,
			["robot time inner"] = robotTimeInner,
			["robot time outer"] = robotTimeOuter,
			["ball time"] = ballTime,
		})
		vis.addCircle("t/pass: OppInterception", pointOfImpact, 0.1, vis.colors.blue, true)
		-- a chip kick does not help if the interception is close to the target position
		if robotTimeInner < ballTime and self._shootPos:distanceTo(pointOfImpact) > MIN_OPP_CHIP_DIST then
			self._linearShoot = false
			linearShootHysteresisFlag = false
			break
		end
		if robotTimeOuter < ballTime then
			linearShootHysteresisFlag = false
		end
::continue::
	end
	
	local dontShoot = false
	if newSuggestion and newSuggestion.time then
		--calculate the time the ball would take to the pos where the opponent robot is heading
		local shootBall2 = {pos = Vector(0, 0), speed = Vector(0, shootSpeed), maxSpeed = shootSpeed, radius = World.Ball.radius}
		local ballPosTime = Physics.ballRollTime(shootBall2, newSuggestion.pos:distanceTo(World.Ball.pos))
		
		local absBallTime = World.Time+ballPosTime
		local lowerTime = newSuggestion.time+ADDITIONAL_TIME
		if self._dontShootHysteresis then
			lowerTime = lowerTime - DONT_SHOOT_HYSTERESIS
		end
		--if the time of the robot arrival (lowerTime) is further in the future than the ball arrival (absBallTime) then dont shoot
		if lowerTime > absBallTime then
			dontShoot = true
		end
	end
	self._dontShootHysteresis = dontShoot

	if linearShootHysteresisFlag then
		self._linearShoot = true
	end
	
	self:_shoot(self._shootPos, self._passSpeed, self._linearShoot, 3 * math.pi/180, dontShoot)
	if self._robot.pos:distanceTo(World.Ball.pos) < MIN_BALL_DIST_FOR_PASS_MSG then
		-- only send message when pass is imminent
		self._send.passPos(self._targetRobot, self._shootPos)
	end

	debug.set("targetRobot", self._targetRobot.id)
	debug.set("chip", not self._linearShoot)
	vis.addCircle("t/pass: ShootPos", self._shootPos, 0.1, vis.colors.blue, true)
end

return Pass
