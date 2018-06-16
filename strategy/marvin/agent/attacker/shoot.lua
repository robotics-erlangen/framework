local Base = require "agent/base/behavior"
local Shoot = Class("Agent.Attacker.Shoot", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local Pass = require "task/shared/pass"
local ShootGoal = require "task/attacker/shootgoal"

local Attack = require "util/attack"
local ShootGoalUtil = require "util/shootgoal"

local G = World.Geometry


function Shoot:_stop()
	self._nextDecisionTime = World.Time
	self._decision = { task = "none" }

	self._prevPassPos = nil

	self._attackPosition = nil
	self._prevAttackPosition = nil

	self._activeFrames = 0

	self._lastIncomingPassInfoPos = nil

	self._hadBallCounter = 0
	self._touchedBall = false

	self._wasPressed = false

	self._manualFlag = false
end

function Shoot:check()
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_shootGoalPossible(robot, attackPosition)
	local sg_target, angle, sg_dirty = ShootGoalUtil.updateTarget(robot, nil, false, attackPosition)

	if sg_dirty then
		return false, angle
	end

	if World.Ball.speed:length() > 1.2 then
		return ObserverShoot.volleyPossible(robot, sg_target)
	end

	if attackPosition and Field.distanceToOpponentDefenseArea(attackPosition, 0) > 1 and Robot.isPressed(robot, attackPosition) then
		return false, angle
	end

	return true, angle
end

function Shoot:_checkForManualAlly()
	self._manualFlag = false
	for sender, passSuggestion in pairs(self._inbox.passSuggestion()) do
		if passSuggestion.manual then
			self._manualFlag = true
			self._decision = {
				task = "pass",
				target = sender,
				pos = passSuggestion.ballPos,
				time = passSuggestion.time,
				quality = "clean"
			}
		end
	end
end

local MIN_PASS_RATING = 0.3
local ENABLE_PSEUDO_PASS = true
function Shoot:_decide()
	self._wasPressed = Robot.isPressed(self._robot)

	-- perform clean goal shots if possible
	if self:_shootGoalPossible(self._robot, self._attackPosition) then
		return {
			task = "shootgoal",
			pos = World.Geometry.OpponentGoal,
			quality = "clean"
		}
	end

	local pass = Attack.choosePassFromSuggestions(self._robot,
		self._inbox.passSuggestion(), self._prevPassPos, true)

	-- consider chipping forward
	local passRating = pass and Attack.ratePass(self._robot, pass, true) or 0
	if ENABLE_PSEUDO_PASS and self._attackPosition and passRating < MIN_PASS_RATING 
			and Field.distanceToDefenseAreaSq(self._attackPosition) > 2
			and World.Ball.speed:length() < 1 then

		local MIN_DISTANCE = 0.2
		local MAX_DISTANCE = 1
		local DISTANCE_STEP = 0.2

		local CONE_WIDTH = 90 / 180 * math.pi
		local ANGLE_STEP = 15 / 180 * math.pi

		local OPPONENT_DISTANCE_THRESHOLD = 1.5

		-- look for close opponents
		local closestOppDist = math.huge
		for _, opp in pairs(World.OpponentRobots) do
			local toGoal = (G.OpponentGoal - self._attackPosition):setLength((MAX_DISTANCE-MIN_DISTANCE)/2 + MIN_DISTANCE)
			local newAttackPosition = self._attackPosition + toGoal
			local oppDist = opp.pos:distanceToSq(newAttackPosition)
			if oppDist < closestOppDist then
				closestOppDist = oppDist
			end
		end

		if closestOppDist < OPPONENT_DISTANCE_THRESHOLD then
			goto continue
		end

		local attackAngle = (G.OpponentGoal - self._attackPosition):angle()
		local bestRating = passRating

		local bestFreeAngle = 0
		local bestAttackPosition = nil
		for dist = MIN_DISTANCE, MAX_DISTANCE, DISTANCE_STEP do
			for angle = -CONE_WIDTH/2, CONE_WIDTH/2, ANGLE_STEP do

				-- check for possible goalshot opportunity
				local newAttackPosition = self._attackPosition + Vector.fromAngle(attackAngle + angle):setLength(dist)
				local possible, freeAngle = self:_shootGoalPossible(self._robot, newAttackPosition)
				if possible and freeAngle and freeAngle > bestFreeAngle then
					bestFreeAngle = freeAngle
					bestAttackPosition = newAttackPosition
				end

				-- look for better pass opportunities
				local newPass = Attack.choosePassFromSuggestions(self._robot,
					self._inbox.passSuggestion(), self._prevPassPos, true)
				local newPassRating = newPass and Attack.ratePass(self._robot, newPass, true) or 0

				if newPassRating > bestRating and newPassRating > MIN_PASS_RATING then
					bestRating = newPassRating
					pass = {target = self._robot, pos = newAttackPosition, time = World.Time}
				end
			end
		end

		-- goalshot opportunity
		if bestAttackPosition ~= nil then
			local passVector = bestAttackPosition - self._attackPosition
			return {
				task = "pass",
				target = self._robot,
				pos = self._attackPosition + passVector:setLength(0.5),
				time = World.Time,
				quality = "clean"
			}
		end

		-- short chip forward
		if not pass or Attack.ratePass(self._robot, pass, true) < MIN_PASS_RATING then
			local newAttackPosition = self._attackPosition + Vector.fromAngle(attackAngle):setLength((MAX_DISTANCE-MIN_DISTANCE)/2 + MIN_DISTANCE)
			local passVector = newAttackPosition - self._attackPosition
			return {
				task = "pass",
				target = self._robot,
				pos = self._attackPosition + passVector:setLength(0.5),
				time = World.Time,
				quality = "clean"
			}
		end
		::continue::
	end

	if pass then
		return {
			task = "pass",
			target = pass.target,
			pos = pass.ballPos,
			time = pass.time,
			quality = "clean"
		}
	end

	-- fallback to shoot goal
	return {
		task = "shootgoal",
		pos = World.Geometry.OpponentGoal,
		quality = "fallback"
	}
end

function Shoot:_redeciding()

	if Ball.wasShot(0.25) then
		self._hadBallCounter = 0
	end

	if Robot.touchedBall(self._robot, 0) then
		self._touchedBall = true
	end

	if self._manualFlag then
		debug.set("redeciding", "FALSE (manual)")
		return false
	end

	-- always redecide if no decision has been made yet
	if self._activeFrames < 2 or self._decision.task == "none" then
		debug.set("redeciding", "TRUE (initial)")
		return true
	end

	-- never redecide if the ball is imminent
	local dribblerPos = self._robot.pos + (World.Ball.pos - self._robot.pos):setLength(
		World.Ball.radius + self._robot.shootRadius)
	if Ball.receivesPass(self._robot) and Physics.checkedBallRollTime(World.Ball, dribblerPos) < 0.5 then
		debug.set("redeciding", "FALSE (imminent)")
		return false
	end

	-- redecide if rebound
	if self._touchedBall and self._hadBallCounter > 5 and self._robot.pos:distanceTo(World.Ball.pos) > 0.13 then
		debug.set("redeciding", "TRUE (rebound)")
		self._hadBallCounter = 0
		return true
	end

	-- never redecide if the ball is being shot (but isShot did not trigger yet)
	if Robot.hadBall(self._robot, 0.25) then
		self._hadBallCounter = self._hadBallCounter + 1
		debug.set("redeciding", "FALSE (hadBall)")
		return false
	end

	-- redecide if the ball is still accelerating due to the tracking
	if Ball.isAccelerating() then
		debug.set("redeciding", "TRUE (accelerating)")
		return true
	end

	-- redecide if the attackPosition changed a lot
	if self._attackPosition and self._prevAttackPosition
			and self._attackPosition:distanceTo(self._prevAttackPosition) > 0.3 then
		debug.set("redeciding", "TRUE (attackPosition)")
		return true
	end

	-- redecide if the last decision was the fallback one
	if self._decision.quality == "fallback" then
		debug.set("redeciding", "TRUE (fallback)")
		return true
	end

	-- redecide if after a certain time
	if World.Time >= self._nextDecisionTime then
		debug.set("redeciding", "TRUE (nextDecisionTime)")
		return true
	end

	if self._decision.pos and Ball.receivesPass(self._robot) then
		local shootAngle = World.Ball.speed:absoluteAngleDiff(self._robot.pos - self._decision.pos)
		if shootAngle > 75 * math.pi / 180 then
			debug.set("redeciding", "TRUE (large angle)")
			return true
		end
	end

	if not self._wasPressed and Robot.isPressed(self._robot) then
		debug.set("redeciding", "TRUE (pressed)")
		return true
	end

	debug.set("redeciding", "FALSE (default)")
	return false
end

function Shoot:_updateTask()
	local pressed = Robot.isPressed(self._robot)
	local color = pressed and vis.colors.redHalf or vis.colors.greenHalf
	vis.addCircle("a/a/shoot: pressed", self._robot.pos, 0.3, color, true)


	local lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())
	if lastIncomingPassInfo then
		self._lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	end
	debug.set("last incoming passInfo", self._lastIncomingPassInfoPos)

	self._forceKeepingInPool = true
	self._activeFrames = self._activeFrames + 1

	-- update attack position
	self._prevAttackPosition = self._attackPosition
	local _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	self._attackPosition = attackPosition

	self:_checkForManualAlly()

	-- redecide if necessary
	local redeciding = self:_redeciding()
	if redeciding then
		self._decision = self:_decide()
		self._nextDecisionTime = World.Time + 1.5
	end

	-- visualize decision
	if self._decision.pos then
		Attack.visualizeAttack(self._robot.pos, self._decision.pos)
	end

	-- write decision to debug tree
	debug.set("decision", self._decision.task)
	for k, v in pairs(self._decision) do
		if k ~= "task" then
			local value = tostring(v)
			if k == "time" then
				value = tostring(value - World.Time) .. " (" .. value .. ")"
			end
			debug.set("decision/" .. tostring(k), value)
		end
	end

	-- return shoot goal if the decision says so
	if self._decision.task == "shootgoal" then
		return ShootGoal, { self._lastIncomingPassInfoPos }
	end

	-- time the pass
	if self._decision.task == "pass" then
		local suggestedTime = self._decision.time
		local target = self._decision.target
		local ballPos = self._decision.pos

		local chipOverride = nil
		local targetSpeed = nil
		if target == self._robot then
			chipOverride = true
			targetSpeed = 0.1
		end

		-- update target if the decision changed
		-- creating a new task instance would mess up catchBall
		if self._task and Class.instanceOf(self._task, Pass)
				and self._decision.pos ~= self._prevPassPos then
			self._task:updateTarget(self._decision.target, self._decision.pos, chipOverride, self._decision.time, targetSpeed)
		end
		self._prevPassPos = self._decision.pos

		local _, attackTime = next(self._inbox.attackTime("broadcast"))
		local shootTime = attackTime and attackTime - World.Time or Robot.minShootTime(self._robot, ballPos)
		local shootPos = Physics.ballAtTime(World.Ball, shootTime).pos
		local ballTravelTime = ObserverShoot.ballPassTime(shootPos, ballPos, target, nil, self._robot)
		local passReceiveTime = math.max(suggestedTime, shootTime + ballTravelTime + World.Time)

		self._send.passInfo("all", {{ target = target,
			ballPos = ballPos, time = passReceiveTime }})

		return Pass, { target, ballPos, chipOverride, self._lastIncomingPassInfoPos, self._decision.time, targetSpeed}
	end

	-- error: invalid decision
end

return Shoot
