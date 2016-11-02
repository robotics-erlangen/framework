local ForceShoot = require "task/ability/forceshoot"
local CenterBack = Class("Task.CenterBack", require "task/base", ForceShoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
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

	local ignoreOpponents = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + self.distanceToDefenseArea() + 0.05

	local ignoreFriends = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 2 * self._robot.radius + self.distanceToDefenseArea() + 0.05

	-- Quick fix to not interfere with goal shots
	local _, shootDest = next(self._inbox.shootDestination())
	if shootDest then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, shootDest.x, shootDest.y, self._robot.radius)
	end

	--move robot
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
	PathHelper.addRobotObstacles(self._robot.path, self._robot, ignoreFriends, ignoreOpponents)
	self._robot.trajectory:update(ToTarget, destinationPos, dir)
	self._send.moveDest("all", destinationPos)
end

return CenterBack
