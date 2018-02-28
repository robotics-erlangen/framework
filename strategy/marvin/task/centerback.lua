local ForceShoot = require "task/ability/forceshoot"
local CenterBack = Class("Task.CenterBack", require "task/base", ForceShoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local G = World.Geometry

function CenterBack.distanceToDefenseArea()
	-- 0.18 (robot diameter) + 0.08 (default distance) + 0.50 (stop radius)
	if Referee.isStopState() then
		local dist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)
		return math.bound(0.01, dist - 0.68, 0.08)
	end
	return 0.08
end

CenterBack.defaultPos = Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.09 + 0.02)


function CenterBack:_init(centerbackTarget)
	self._preliminaryCenterbackTarget = centerbackTarget or World.Ball
	self._lookingToGoal = true
	self._obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox
	}
end

function CenterBack:run()
	local groupApplication = { name = "centerback", payload = self._preliminaryCenterbackTarget }
	self._send.groupApplication("trainer", groupApplication)

	local pos_target = self._inbox.centerBackPosTarget().trainer

	local destinationPos = pos_target and pos_target.pos or CenterBack.defaultPos
	local destinationTarget = pos_target and pos_target.target or self._preliminaryCenterbackTarget

	local toBallAngle = (World.Ball.pos - self._robot.pos):angle()
	local toGoalAngle = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	local toCornerLeftAngle = (Vector(-World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	local toCornerRightAngle = (Vector(World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	local fromGoalAngle = (self._robot.pos - World.Geometry.FriendlyGoal):angle()

	local hystAngle = 5 * math.pi/180
	local dir = toBallAngle
	if (self._lookingToGoal and toBallAngle < toCornerLeftAngle + hystAngle and
			toBallAngle > toCornerRightAngle + hystAngle) or
			(toBallAngle < toCornerLeftAngle - hystAngle and
			toBallAngle > toCornerRightAngle - hystAngle) then
		dir = toGoalAngle
		self._lookingToGoal = true
	else
		self._lookingToGoal = false
	end

	local maxAngleTilt = 40 * math.pi / 180
	dir = geom.normalizeAnglePositive(dir + 0.5 * math.pi) - 0.5 * math.pi
	dir = math.bound(fromGoalAngle - maxAngleTilt, dir, fromGoalAngle + maxAngleTilt)

	debug.set("target", destinationTarget)

	if not Robot.hadBall(self._robot, 0) then
		self._forceShootTimer = nil
	end
	local chipActivationAngle = math.pi / 6
	local isGame = World.RefereeState == "Game" or World.RefereeState == "GameForce"
	if isGame and dir > chipActivationAngle and dir < math.pi - chipActivationAngle and
			Vector.fromAngle(dir):absoluteAngleDiff(destinationPos - G.FriendlyGoal) < math.pi
			and World.Ball.pos:distanceTo(self._robot.pos) < 1
			and self._robot.pos:distanceTo(destinationPos) < 1 then
		debug.set("chip", true)
		self:_doForceShoot()
		self._robot:chip(2)
	end

	self._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + self.distanceToDefenseArea() + 0.05

	self._obstacleTable.ignoreFriendlyRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 2 * self._robot.radius + self.distanceToDefenseArea() + 0.05
	self._obstacleTable.ignorePass = self._obstacleTable.ignoreFriendlyRobots
	-- The centerback that is blocking the ball, that is shot towards the goal has to
	-- -fully drive into the shot
	-- -drive as fast as possible, because it doesn't matter if we have an endSpeed when we have blocked the ball
	local endSpeed = nil
	local intersectionWithGoalLine = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, G.FriendlyGoal, Vector(1, 0))
	if intersectionWithGoalLine and math.abs(intersectionWithGoalLine.x) < G.GoalWidth / 2 + 0.1
			and World.Ball.speed:length() > 0.5 and World.Ball.speed.y < 0 and destinationTarget == World.Ball then
		local blockingPos = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, self.distanceToDefenseArea() + self._robot.radius, false)
		--destinationPos = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, destinationPos, (destinationPos - self._robot.pos))
		if blockingPos then
			destinationPos = blockingPos
		end
		local ballTime = Physics.checkedBallRollTime(World.Ball, destinationPos + (World.Ball.pos - destinationPos):setLength(self._robot.shootRadius + World.Ball.radius))

		if ballTime ~= -math.huge then
			endSpeed = Physics.robotMinEndspeed(self._robot, destinationPos, ballTime)
		end
		if endSpeed then
			local phi = (destinationPos - G.FriendlyGoal):angle()
			endSpeed:rotate(-phi)

			if endSpeed.x < 0 then
				endSpeed.x = 0
			end

			endSpeed:rotate(phi)
		end

	end

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	self._robot.trajectory:update(ToTarget, destinationPos, dir, nil, endSpeed)
	self._send.moveDest("all", destinationPos)
end

return CenterBack
