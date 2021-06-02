let BallCycle = Class("Group.Move.BallCycle", require "group/move/base")

let Circuit = require "task/attacker/circuit"
import * as Field from "base/field";
let FreeKick = require "agent/attacker/freekick"
import * as geom from "base/geom";
import * as Attack from "glados/util/attack";
let MovesHelper = require "util/moveshelper"
import {MoveToPos} from "glados/task/shared/movetopos";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as MathUtil from "base/mathutil";

let G = World.Geometry

BallCycle.MIN_ROBOTS = 5
BallCycle.MAX_ROBOTS = 5

let MAX_RANDOM_POSITION_OFFSET = 0.8

function BallCycle.canStart () {
	return World.Ball.pos.y > G.FieldHeightHalf / 5 && BallCycle.Referee.opponentTouchedLast()
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop" && Field.distanceToFieldBorder(World.Ball.pos) >= 0.6
}

// biased random for setting the position backwards
let randomExtension = function (min) {
	return Math.round(min + MAX_RANDOM_POSITION_OFFSET * Math.pow(MathUtil.random(), 2), 1)
}

// calculates good recieving possions for our attackers
let getRandomPosition = function (positions, maxShootingAngle) {
	let extraDistForRobotToShoot = 0.08
	// calculate circle for volley passes
	let center1, center2, radius = geom.inscribedAngle(World.Ball.pos, G.OpponentGoal, maxShootingAngle)
	let circle = center1.y < center2.y ? center1 : center2
	let angle = World.Ball.pos.x < 0 ? Math.PI / 4 : - Math.PI / 4
	// position close to current ball pos
	let firstPointNearBall = circle + (World.Ball.pos - circle).rotated(angle).withLength(randomExtension(radius + extraDistForRobotToShoot))
	// position close to opponent defence area with some distance
	let intersections = Field.intersectCircleDefenseArea(circle, radius, 0.75, false)
	let lastPointNearOppDefenseArea = nil
	for (i = 1, 4) {
		if (lastPointNearOppDefenseArea == undefined) {
			lastPointNearOppDefenseArea = intersections[i]
		} else if (intersections[i] && intersections[i].distanceTo(World.Ball.pos) > lastPointNearOppDefenseArea.distanceTo(World.Ball.pos)) {
			lastPointNearOppDefenseArea = intersections[i]
		}
	}
	// extend the found position backwards
	lastPointNearOppDefenseArea = circle + (lastPointNearOppDefenseArea - circle).withLength(randomExtension(radius + extraDistForRobotToShoot))
	// angleDiff between the found positions
	let angleDiff = ((firstPointNearBall - circle)).angleDiff((lastPointNearOppDefenseArea - circle)) / (BallCycle.MIN_ROBOTS - 2)
	// make sure all positions are inside the field
	firstPointNearBall = Field.limitToAllowedField(firstPointNearBall, -0.3)
	lastPointNearOppDefenseArea = Field.limitToAllowedField(lastPointNearOppDefenseArea, -0.3)
	table.insert(positions, firstPointNearBall)
	table.insert(positions, lastPointNearOppDefenseArea)
	// find positions for the other robots
	for (i = 1, (BallCycle.MIN_ROBOTS - 3)) {
		let pos = circle + (firstPointNearBall - circle).rotated(i * angleDiff).withLength(randomExtension(radius + extraDistForRobotToShoot))
		table.insert(positions, Field.limitToAllowedField(pos, -0.3))
	}
	return
}

function BallCycle:_init () {
	this._circleCenter = World.Ball.pos
	this._circleRadius = 0.6
	this._currentRefereeState = World.RefereeState
	this._maxShootingAngle = 60 / 180 * Math.PI
	this._positions = {}
	this._assignment = {}
}

function BallCycle:_canContinue () {
	if (BallCycle.Referee.isFriendlyFreeKickState() && Field.distanceToFieldBorder(World.Ball.pos) >= this._circleRadius) {
		return true
	}
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop" && Field.distanceToFieldBorder(World.Ball.pos) >= this._circleRadius
}

function BallCycle:_updateTasks () {
	let reload = false
	if ((this._currentRefereeState != World.RefereeState) || World.Ball.pos.distanceTo(this._circleCenter) > 0.05) {
		this._circleCenter = World.Ball.pos
		this._currentRefereeState = World.RefereeState
		reload = true
	}
	// draw circles where robots cannot shoot a volley
	MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, this._maxShootingAngle)

	if (Referee.isStopState()) {
		this._positions = {}
		this._assignment = {}
	} else if (Referee.isFriendlyFreeKickState() && #this._positions == 0) {
		getRandomPosition(this._positions, this._maxShootingAngle)
		this._assignment = MovesHelper.assignRobots(this._robots, this._positions, 1)
	}

	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	let passInfo
	if (passInfoTable) {
		_, passInfo = next(passInfoTable)
	}
	let startMoving = Attack.checkPassInfoFromPosition(this._robots[0], passInfo, this._circleCenter, false)

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[this._robots[0]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.0, this._circleRadius }, restart: reload }
		taskAssignments[this._robots[1]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.4, this._circleRadius }, restart: reload }
		taskAssignments[this._robots[2]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.8, this._circleRadius }, restart: reload }
		taskAssignments[this._robots[3]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.2, this._circleRadius }, restart: reload }
		taskAssignments[this._robots[4]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.6, this._circleRadius }, restart: reload }
	} else if (Referee.isFriendlyFreeKickState() && not startMoving) {
		taskAssignments[this._robots[0]] = { behavior: FreeKick, params: {} }
		taskAssignments[this._robots[1]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.0, this._circleRadius, this._positions[1], true }, restart: reload }
		taskAssignments[this._robots[2]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.5, this._circleRadius, this._positions[2], true }, restart: reload }
		taskAssignments[this._robots[3]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.0, this._circleRadius, this._positions[3], true }, restart: reload }
		taskAssignments[this._robots[4]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.5, this._circleRadius, this._positions[4], true }, restart: reload }
	} else if (Referee.isFriendlyFreeKickState()) {
		taskAssignments[this._robots[0]] = { behavior: FreeKick, params: { } }
		taskAssignments[this._robots[this._assignment[2]]]
				= { class: MoveToPos, params: { this._positions[1] , undefined, true } }
		taskAssignments[this._robots[this._assignment[3]]]
				= { class: MoveToPos, params: { this._positions[2] , undefined, true } }
		taskAssignments[this._robots[this._assignment[4]]]
				= { class: MoveToPos, params: { this._positions[3] , undefined, true } }
		taskAssignments[this._robots[this._assignment[5]]]
				= { class: MoveToPos, params: { this._positions[4] , undefined, true } }
	}
	return taskAssignments, this._robots[0]
}

return BallCycle
