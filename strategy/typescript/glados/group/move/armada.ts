let Armada = Class("Group.Move.Armada", require "group/move/base")

let Circuit = require "task/attacker/circuit"
import * as Field from "base/field";
let FreeKick = require "agent/attacker/freekick"
import * as geom from "base/geom";
let AcceptPass = require "task/attacker/acceptpass"
import {MoveToPos} from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
let MovesHelper = require "util/moveshelper"
let StopAttack = require "task/attacker/stopattack"
import * as World from "base/world";

let G = World.Geometry

Armada.MIN_ROBOTS = 5
Armada.MAX_ROBOTS = 5

// the armada has 4 steps to form stairs, depending on ball distance
let POSITIONS_ORIG = [
	new Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	new Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	new Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	new Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
];

let MAX_RANDOM_POSITION_OFFSET = 0.8

let getRandomOffsetVector = function () {
	let result = new Vector(0,0);
	result.x = (Math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5);
	result.y = (Math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5);
	return result;
}

// biased random for setting the position backwards
let randomExtension = function (min) {
	return Math.round(min + MAX_RANDOM_POSITION_OFFSET * Math.pow(Math.random(), 2), 1);
}

function Armada.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 && Armada.Referee.opponentTouchedLast()
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"
}

function Armada:_init () {
	this._circleCenter = new Vector(0,0) + getRandomOffsetVector()
	this._positions = {}
	this._maxShootingAngle = 60 / 180 * Math.PI
	this._assignment = {}
	this._startedSendPassPos = false
}

function Armada:_canContinue () {
	if (Armada.Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"
}

function Armada:_updateTasks () {
	// draw circles where robots cannot shoot a volley
	let center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, this._maxShootingAngle)
	let circle = center1.y < center2.y ? center1 : center2
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	let passInfo
	if (passInfoTable) {
		_, passInfo = next(passInfoTable)
	}
	let startMoving = Attack.checkPassInfoFromPosition(this._robots[0], passInfo, this._circleCenter, false)
	if (World.RefereeState == "Stop") {
		this._positions = {}
		this._assignment = nil
	} else if (Armada.Referee.isFriendlyFreeKickState() && #this._positions == 0) {
		// calculate position
		for (i = 1, 4) {
			let pos = POSITIONS_ORIG[i].copy()
			if (World.Ball.pos.x > 0) {
				pos.x = -pos.x
			}
			pos = pos + getRandomOffsetVector()
			// shift positions to make volley possible
			if (pos.distanceTo(circle) <= radius) {
				let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
				let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, pos - posToShiftFrom, circle, radius)
				pos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom).setLength(randomExtension(intersectionWithCircle.distanceTo(posToShiftFrom) + 0.1))
			}
			table.insert(this._positions, Field.limitToAllowedField(pos, 0.3))
		}
	}
	if (startMoving && not this._assignment) {
		// assign robots to positions
		this._assignment = MovesHelper.assignRobots(this._robots, this._positions, 1)
	}

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[this._robots[0]] = { class: StopAttack, params: { } }
		taskAssignments[this._robots[1]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.0 }, restart: this._startedSendPassPos }
		taskAssignments[this._robots[2]] = { class: Circuit, params: { this._circleCenter, Math.PI * 0.5 }, restart: this._startedSendPassPos }
		taskAssignments[this._robots[3]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.0 }, restart: this._startedSendPassPos }
		taskAssignments[this._robots[4]] = { class: Circuit, params: { this._circleCenter, Math.PI * 1.5 }, restart: this._startedSendPassPos }
		this._startedSendPassPos = false
	} else if (startMoving) {
		taskAssignments[this._robots[0]] = { behavior: FreeKick, params: { } }
		for (i = 2,5) {
			if (this._positions[i-1].distanceTo(passInfo.ballPos) < 0.1) {
				taskAssignments[this._robots[this._assignment[i]]]
				= {class: AcceptPass, params: {this._positions[i-1], 0.1}}
			} else {
			taskAssignments[this._robots[this._assignment[i]]]
				= {class: MoveToPos, params: { this._positions[i-1], undefined, true } } //offer other positions for redeciding
			}
		}
	} else {
		taskAssignments[this._robots[0]] = { behavior: FreeKick, params: { } }
		for (i = 2,5) {
			taskAssignments[this._robots[i]] = { class: Circuit, params: { this._circleCenter,
				Math.PI * 0.5 * (i-2), undefined, this._positions[i-1], true }, restart: not this._startedSendPassPos }
		}
		this._startedSendPassPos = true
	}
	return taskAssignments, this._robots[0]
}

return Armada
