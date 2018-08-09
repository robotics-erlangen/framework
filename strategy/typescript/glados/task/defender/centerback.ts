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
local UtilDefense = require "util/defense"

local G = World.Geometry

// centerbackTarget has to be updated by the caller
function CenterBack:_init(centerbackTarget)
	assert(centerbackTarget, "CB has to be called with a non null centerbackTarget")
	self._preliminaryCenterbackTarget = centerbackTarget

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

	local destinationPos = pos_target and pos_target.pos or UtilDefense.centerBackDefaultPos
	local destinationTime = pos_target and pos_target.time or math.huge

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
		< 4 * self._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05

	self._obstacleTable.ignoreFriendlyRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 2 * self._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05
	self._obstacleTable.ignorePass = self._obstacleTable.ignoreFriendlyRobots

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker and Referee.isFriendlyFreeKickState() and World.Ball.pos.y < World.Geometry.FieldHeightHalf then
		local startPos = World.Ball.pos
		local endPos = mainAttacker.pos
		self._robot.path:addLine(startPos.x, startPos.y, endPos.x, endPos.y, mainAttacker.radius * 2 + 0.1, 100)
	end

	self._robot.trajectory:update(ToTarget, destinationPos, dir,nil, Physics.robotMinEndspeed(self._robot, destinationPos, destinationTime))
	self._send.moveDest("all", destinationPos)
end

return CenterBack
