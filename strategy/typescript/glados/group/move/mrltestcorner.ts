let MrlTestCorner = Class("Group.Move.MrlTestCorner", require "group/move/base")

import * as geom from "base/geom";
import * as vis from "base/vis";
import * as World from "base/world";
let Freekick = require "agent/attacker/freekick"
let AcceptPass = require "task/attacker/acceptpass"
import {MoveToPos} from "glados/task/shared/movetopos";
let StopAttack = require "task/attacker/stopattack"
import {Striker} from "glados/task/attacker/striker";
let MovesHelper = require "util/moveshelper"
import * as Attack from "glados/util/attack";
let G = World.Geometry

MrlTestCorner.MIN_ROBOTS = 5
MrlTestCorner.MAX_ROBOTS = 5

function MrlTestCorner.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 && MrlTestCorner.Referee.opponentTouchedLast()
		 && Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 && World.RefereeState == "Stop";
}

function MrlTestCorner:_init () {
	let goalDist = G.DefenseRadius + 0.4
	this._distractorPositions = [
		new Vector(0.3, G.OpponentGoal.y - goalDist),
		new Vector(0.0, G.OpponentGoal.y - goalDist),
		new Vector(-0.3, G.OpponentGoal.y - goalDist)
	];
	this._distractorAttackPos = {}
	for (i=1,3) {
		this._distractorAttackPos[i] = this._distractorPositions[i] - new Vector((i)*0.3 + 0.3, 0.5)
	}

	this._activeRobotInitPos = new Vector(-G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1)
	this._activeRobotShootPos = new Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3)
	this._restart = true
}

function MrlTestCorner:_canContinue () {
	if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"
}

let getRobotsInRect = function (c1, c2, robots, buffer) {
	let r = {}
	vis.addAxisAlignedRectangle("g/m/mrlTestCorner: Rect", c1+Vector(-buffer, buffer), c2+Vector(buffer, -buffer), vis.colors.red);
	for (_,v in ipairs(robots)) {
		if (geom.insideRect(c1 + new Vector(-buffer, buffer), c2 + new Vector(buffer, -buffer), v.pos)) {
			table.insert(r, v)
		}
	}
	return r
}
let taskAssignment = function (passInfoTable, pos1, pos2, robot, enemyAmm) {
	let ballSide = (World.Ball.pos.x > 0) ? 1 : -1
	let acceptPass = Attack.checkPassInfos(robot, passInfoTable, false)
	if (acceptPass) {
		return { class: AcceptPass }
	} else if (enemyAmm > 0) {
		return { class: MoveToPos, params: {new Vector(pos1.x * ballSide, pos1.y)}}
	} else {
		return { class: Striker, params: { Vector(pos1.x * ballSide, pos1.y), new Vector(pos2.x * ballSide, pos2.y) }}
	}
}
function MrlTestCorner:_updateTasks () {

	// draw circles where robots cannot shoot a volley
	let center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * Math.PI)
	let circle = center1.y < center2.y ? center1 : center2

	if (this._activeRobotShootPos.distanceTo(circle) <= radius) {
		let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
		let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, this._activeRobotShootPos - posToShiftFrom, circle, radius)
		this._activeRobotShootPos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom).setLength(intersectionWithCircle.distanceTo(posToShiftFrom) + 0.1)
	}
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		taskAssignments[this._robots[0]] = { class: StopAttack, params: { } }
	} else if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
		taskAssignments[this._robots[0]] = { behavior: Freekick }
		this._restart = false
	}

	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];

	let buffer = 0.1
	taskAssignments[this._robots[1]] = taskAssignment(passInfoTable, this._activeRobotInitPos, this._activeRobotShootPos, this._robots[1], 0)

	let enemyRobots = getRobotsInRect(this._distractorPositions[1], this._distractorPositions[3] + new Vector(-0.6,0.4), World.OpponentRobots, buffer)
	for (i=1,3) {
		taskAssignments[this._robots[i+2]] = taskAssignment(passInfoTable, this._distractorPositions[i], this._distractorAttackPos[i], this._robots[i+2], #enemyRobots)
	}

	return taskAssignments, this._robots[0]
}

return MrlTestCorner
