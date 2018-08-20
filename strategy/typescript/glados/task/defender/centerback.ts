let ForceShoot = require "task/ability/forceshoot"
let CenterBack = Class("Task.CenterBack", require "task/base", ForceShoot)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

let G = World.Geometry

// centerbackTarget has to be updated by the caller
function CenterBack:_init (centerbackTarget) {
	assert(centerbackTarget, "CB has to be called with a non null centerbackTarget")
	this._preliminaryCenterbackTarget = centerbackTarget

	this._lookingToGoal = true
	this._obstacleTable = {
		ignoreBall = true,
		inbox = this._inbox
	}
}

function CenterBack:run () {
	let groupApplication = { name = "centerback", payload = this._preliminaryCenterbackTarget }
	this._send.groupApplication("trainer", groupApplication)

	let pos_target = this._inbox.centerBackPosTarget().trainer

	let destinationPos = pos_target ? pos_target.pos : UtilDefense.centerBackDefaultPos
	let destinationTime = pos_target ? pos_target.time : Infinity

	let toBallAngle = (World.Ball.pos - this._robot.pos).angle()
	let toGoalAngle = (World.Geometry.OpponentGoal - this._robot.pos).angle()
	let toCornerLeftAngle = (new Vector(-World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - this._robot.pos).angle()
	let toCornerRightAngle = (new Vector(World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - this._robot.pos).angle()
	let fromGoalAngle = (this._robot.pos - World.Geometry.FriendlyGoal).angle()

	let hystAngle = 5 * Math.PI/180
	let dir = toBallAngle
	if ((this._lookingToGoal && toBallAngle < toCornerLeftAngle + hystAngle  &&
			toBallAngle > toCornerRightAngle + hystAngle)  ||
			(toBallAngle < toCornerLeftAngle - hystAngle  &&
			toBallAngle > toCornerRightAngle - hystAngle)) {
		dir = toGoalAngle
		this._lookingToGoal = true
	} else {
		this._lookingToGoal = false
	}

	let maxAngleTilt = 40 * Math.PI / 180
	dir = geom.normalizeAnglePositive(dir + 0.5 * Math.PI) - 0.5 * Math.PI
	dir = MathUtil.bound(fromGoalAngle - maxAngleTilt, dir, fromGoalAngle + maxAngleTilt)

	if (not Robot.hadBall(this._robot, 0)) {
		this._forceShootTimer = nil
	}
	let chipActivationAngle = Math.PI / 6
	let isGame = World.RefereeState == "Game" || World.RefereeState == "GameForce"
	if (isGame && dir > chipActivationAngle && dir < Math.PI - chipActivationAngle  &&
			Vector.fromAngle(dir).absoluteAngleDiff(destinationPos - G.FriendlyGoal) < Math.PI
			 &&  World.Ball.pos.distanceTo(this._robot.pos) < 1
			 &&  this._robot.pos.distanceTo(destinationPos) < 1) {
		debug.set("chip", true)
		this._doForceShoot()
		this._robot.chip(2)
	}

	this._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
		< 4 * this._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05

	this._obstacleTable.ignoreFriendlyRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
		< 2 * this._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05
	this._obstacleTable.ignorePass = this._obstacleTable.ignoreFriendlyRobots

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	let mainAttacker = this._inbox.mainAttacker().trainer
	if (mainAttacker && Referee.isFriendlyFreeKickState() && World.Ball.pos.y < World.Geometry.FieldHeightHalf) {
		let startPos = World.Ball.pos
		let endPos = mainAttacker.pos
		this._robot.path.addLine(startPos.x, startPos.y, endPos.x, endPos.y, mainAttacker.radius * 2 + 0.1, 100)
	}

	this._robot.trajectory.update(ToTarget, destinationPos, dir,nil, Physics.robotMinEndspeed(this._robot, destinationPos, destinationTime))
	this._send.moveDest("all", destinationPos)
}

return CenterBack
