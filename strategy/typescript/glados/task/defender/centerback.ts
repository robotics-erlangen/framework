let ForceShoot = require "task/ability/forceshoot"
let CenterBack = Class("Task.CenterBack", require "task/base", ForceShoot)

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let Referee = require "../base/referee"
let World = require "../base/world"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let UtilDefense = require "util/defense"

let G = World.Geometry

// centerbackTarget has to be updated by the caller
function CenterBack:_init (centerbackTarget) {
	assert(centerbackTarget, "CB has to be called with a non null centerbackTarget")
	self._preliminaryCenterbackTarget = centerbackTarget

	self._lookingToGoal = true
	self._obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox
	}
}

function CenterBack:run () {
	let groupApplication = { name = "centerback", payload = self._preliminaryCenterbackTarget }
	self._send.groupApplication("trainer", groupApplication)

	let pos_target = self._inbox.centerBackPosTarget().trainer

	let destinationPos = pos_target ? pos_target.pos : UtilDefense.centerBackDefaultPos
	let destinationTime = pos_target ? pos_target.time : math.huge

	let toBallAngle = (World.Ball.pos - self._robot.pos):angle()
	let toGoalAngle = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	let toCornerLeftAngle = (Vector(-World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	let toCornerRightAngle = (Vector(World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	let fromGoalAngle = (self._robot.pos - World.Geometry.FriendlyGoal):angle()

	let hystAngle = 5 * math.pi/180
	let dir = toBallAngle
	if ((self._lookingToGoal  &&  toBallAngle < toCornerLeftAngle + hystAngle  &&
			toBallAngle > toCornerRightAngle + hystAngle)  ||
			(toBallAngle < toCornerLeftAngle - hystAngle  &&
			toBallAngle > toCornerRightAngle - hystAngle)) {
		dir = toGoalAngle
		self._lookingToGoal = true
	} else {
		self._lookingToGoal = false
	}

	let maxAngleTilt = 40 * math.pi / 180
	dir = geom.normalizeAnglePositive(dir + 0.5 * math.pi) - 0.5 * math.pi
	dir = math.bound(fromGoalAngle - maxAngleTilt, dir, fromGoalAngle + maxAngleTilt)

	if (not Robot.hadBall(self._robot, 0)) {
		self._forceShootTimer = nil
	}
	let chipActivationAngle = math.pi / 6
	let isGame = World.RefereeState == "Game"  ||  World.RefereeState == "GameForce"
	if (isGame  &&  dir > chipActivationAngle  &&  dir < math.pi - chipActivationAngle  &&
			Vector.fromAngle(dir):absoluteAngleDiff(destinationPos - G.FriendlyGoal) < math.pi
			 &&  World.Ball.pos:distanceTo(self._robot.pos) < 1
			 &&  self._robot.pos:distanceTo(destinationPos) < 1) {
		debug.set("chip", true)
		self:_doForceShoot()
		self._robot:chip(2)
	}

	self._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05

	self._obstacleTable.ignoreFriendlyRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 2 * self._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05
	self._obstacleTable.ignorePass = self._obstacleTable.ignoreFriendlyRobots

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	let mainAttacker = self._inbox.mainAttacker().trainer
	if (mainAttacker  &&  Referee.isFriendlyFreeKickState()  &&  World.Ball.pos.y < World.Geometry.FieldHeightHalf) {
		let startPos = World.Ball.pos
		let endPos = mainAttacker.pos
		self._robot.path:addLine(startPos.x, startPos.y, endPos.x, endPos.y, mainAttacker.radius * 2 + 0.1, 100)
	}

	self._robot.trajectory:update(ToTarget, destinationPos, dir,nil, Physics.robotMinEndspeed(self._robot, destinationPos, destinationTime))
	self._send.moveDest("all", destinationPos)
}

return CenterBack
