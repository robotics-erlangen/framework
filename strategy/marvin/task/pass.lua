local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local ObserverShoot = require "observer/shoot"


function Pass:_init(targetRobot, passSpeed, dontWaitForTarget)
	self._targetRobot = assert(targetRobot, "targetRobot is missing")
	self._linearShoot = true
	self._dontWaitForTarget = dontWaitForTarget
	self._dontShootHysteresis = true
	if passSpeed then
		self._passSpeed = passSpeed
	elseif dontWaitForTarget then
		self._passSpeed = self._targetRobot.constants.passSpeed * 0.9
	else
		self._passSpeed = self._targetRobot.constants.passSpeed
	end
	self._shootPos = nil
end

local MIN_BALL_DIST_FOR_PASS_MSG = 1
local MIN_OPP_CHIP_DIST = 0.35
local ADDITIONAL_TIME = 0.3
local DONT_SHOOT_HYSTERESIS = 0.15 -- must ALWAYS be smaller than ADDITIONAL_TIME
local ADDITIONAL_CORRIDOR_WIDTH_HYSTERESIS = 0.04

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

	-- try to guess a position where we might reach the pass target if we can't wait
	if newSuggestion and newSuggestion.pos and self._dontWaitForTarget then
		local shootBall2 = {pos = Vector(0, 0), speed = Vector(0, shootSpeed), maxSpeed = shootSpeed, radius = World.Ball.radius}
		local ballPosTime = Physics.ballRollTime(shootBall2, newSuggestion.pos:distanceTo(World.Ball.pos))
		local absBallTime = World.Time+ballPosTime
		if absBallTime < newSuggestion.time then
			local moveTime = newSuggestion.time - World.Time
			debug.set("ballPositionTime", ballPosTime)
			debug.set("robotPositionTime", moveTime)

			local dribblerPos = self._targetRobot.pos + Vector.fromAngle(self._targetRobot.dir) * self._targetRobot.shootRadius
			local movePos = newSuggestion.pos
			self._shootPos = dribblerPos + (movePos - dribblerPos) * (ballPosTime / moveTime)
		end
	end

	local linearShootHysteresisFlag = self._linearShoot
	self._linearShoot = true
	for _, opp in ipairs(World.Robots) do
		if opp == World.OpponentKeeper or opp == self._targetRobot or opp == self._robot then
			goto continue
		end

		local widthHalf = World.Ball.radius+opp.radius
		if not linearShootHysteresisFlag then
			widthHalf = widthHalf + ADDITIONAL_CORRIDOR_WIDTH_HYSTERESIS
		end
		local relativeShootPos = self._shootPos - World.Ball.pos

		local point1, _, oppTimeTo1, oppTimeTo2, lambda3, lambda4 = geom.intersectLineCorridor(opp.pos,
				opp.speed, World.Ball.pos, relativeShootPos, widthHalf)

		if lambda3 == nil then
			-- no intersection between future robot and ball
			goto continue
		end

		if point1 == nil then
			--robot is on the future ball line, parallel
			lambda3 = (World.Ball.pos-opp.pos:orthogonalProjection(World.Ball.pos, self._shootPos)):length()/relativeShootPos:length()
			lambda4 = lambda3
			oppTimeTo1 = 0
			oppTimeTo2 = math.huge
		end

		if lambda3 < 0 then
			--robot is behind us
			goto continue
		end

		if lambda3 > 1 and lambda4 > 1 then
			--robot is behind shootpos
			goto continue
		end

		local shootBall = {pos = Vector(0, 0), speed = Vector(0, shootSpeed), maxSpeed = shootSpeed, radius = World.Ball.radius}

		local ballTimeToPos1 = Physics.ballRollTime(shootBall, lambda3 * relativeShootPos:length())
		local ballTimeToPos2 = Physics.ballRollTime(shootBall, lambda4 * relativeShootPos:length())
		local firstBallTime = math.min(ballTimeToPos1, ballTimeToPos2)
		local secondBallTime = math.max(ballTimeToPos1, ballTimeToPos2)
		debug.set("pass interception"..opp.id, {
			robot = opp,
			["first robot time"] = oppTimeTo1,
			["second robot time"] = oppTimeTo2,
			["first ball time"] = firstBallTime,
			["second ball time"] = secondBallTime,
			pos1 = World.Ball.pos + relativeShootPos * lambda3,
			pos2 = World.Ball.pos + relativeShootPos * lambda4
		})
		if not (secondBallTime < oppTimeTo1 or firstBallTime > oppTimeTo2) then
			if not opp.isFriendly then
				vis.addCircle("t/pass: OppInterception", World.Ball.pos + relativeShootPos * lambda3, 0.1, vis.colors.blue, true)
				vis.addCircle("t/pass: OppInterception", World.Ball.pos + relativeShootPos * lambda4, 0.1, vis.colors.blue, true)
			else
				vis.addCircle("t/pass: Friendly conflict", World.Ball.pos + relativeShootPos * lambda3, 0.1, vis.colors.blue, true)
				vis.addCircle("t/pass: Friendly conflict", World.Ball.pos + relativeShootPos * lambda4, 0.1, vis.colors.blue, true)
			end
			-- a chip kick does not help if the interception is close to the target position
			if (1-lambda3)*relativeShootPos:length() > MIN_OPP_CHIP_DIST
					and (1-lambda4)*relativeShootPos:length() > MIN_OPP_CHIP_DIST then
				self._linearShoot = false
				break
			end
		end
::continue::
	end

	local dontShoot = false
	if not self._dontWaitForTarget and newSuggestion and newSuggestion.time then
		--calculate the time the ball would take to the pos where the robot is heading
		local shootBall2 = {pos = Vector(0, 0), speed = Vector(0, shootSpeed), maxSpeed = shootSpeed, radius = World.Ball.radius}
		local ballPosTime = Physics.ballRollTime(shootBall2, newSuggestion.pos:distanceTo(World.Ball.pos))
		debug.set("ballPositionTime",ballPosTime)
		debug.set("ballAcceptTime",newSuggestion.time-World.Time)
		local absBallTime = World.Time+ballPosTime
		-- ensure that we can still pass over short distances
		local lowerTime = newSuggestion.time+math.min(ADDITIONAL_TIME, ballPosTime/2)
		if not self._dontShootHysteresis then
			lowerTime = lowerTime - DONT_SHOOT_HYSTERESIS
		end
		--if the time of the robot arrival (lowerTime) is further in the future than the ball arrival (absBallTime) then dont shoot
		if lowerTime > absBallTime then
			dontShoot = true
		end
		debug.set("dontShoot", dontShoot);
	end
	self._dontShootHysteresis = dontShoot

	self:_shoot(self._shootPos, self._passSpeed, self._linearShoot, 3 * math.pi/180, dontShoot)

	if ObserverShoot.volleyPossible(self._robot, self._shootPos)
		or self._robot.pos:distanceTo(World.Ball.pos) < MIN_BALL_DIST_FOR_PASS_MSG then
		-- only send message when pass is imminent
		self._send.passPos("all", { robot = self._targetRobot, pos = self._shootPos })
	end

	debug.set("targetRobot", self._targetRobot.id)
	debug.set("chip", not self._linearShoot)
	vis.addCircle("t/pass: ShootPos", self._shootPos, 0.1, vis.colors.blue, true)
end

return Pass
