let WindshieldWiper = Class("Group.Move.WindshieldWiper", require "group/move/base")

import * as World from "base/world";
let G = World.Geometry

let Freekick = require "agent/attacker/freekick"
let StopAttack = require "task/attacker/stopattack"

let AcceptPass = require "task/attacker/acceptpass"
import {Striker} from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";

let MovesHelper = require "util/moveshelper"
import * as geom from "base/geom";

WindshieldWiper.MIN_ROBOTS = 1
WindshieldWiper.MAX_ROBOTS = 5


function WindshieldWiper.canStart () {
	if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
		return Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			 &&  World.Ball.pos.y > 3 * G.FieldHeightHalf / 5
		//return true
	}
		return false
}

function WindshieldWiper:_canContinue () {
	if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
		return true
	}
		return false
}

let sort = function (distances, ball) {
	let i = 1
	for (_,v in ipairs(distances)) {
		v.distance = v.robot.pos.distanceToSq(ball.pos)
	}
	while (distances[i+1]) {
		if (distances[i].distance > distances[i+1].distance) {
			distances[i],distances[i+1] = distances[i+1],distances[i]
			if (i !=1) {
				i = i-1
			} else {
				i = i+1
			}
		} else {
			i = i+1
		}
	}
}

function WindshieldWiper:_init () {
	this._state = "init"
	this._distances = {}
	for (_,v in ipairs(this._robots)) {
		table.insert(this._distances,{robot=v})
	}
	this._positions = {}
	for (i=1,#this._robots) {
		this._positions[i] = new Vector((MathUtil.sign(World.Ball.pos.x))*(i/WindshieldWiper.MAX_ROBOTS -0.5) * G.FieldWidth * 0.75, G.FieldHeightQuarter*(8/(5+i)))
	}
	sort(this._distances,World.Ball)

}


function WindshieldWiper:_updateTasks () {
	let distances = this._distances
	//sort(distances,World.Ball)
	let mainrobot = distances[1].robot
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		taskAssignments[mainrobot] = { class: StopAttack, params: { } }
	} else if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
		taskAssignments[mainrobot] = { behavior: Freekick }
	}

	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	let nr = false
	let pos = this._positions
		let center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * Math.PI)
		let circle = center1.y < center2.y ? center1 : center2
		let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
	for (i=2,#this._robots) {
		nr = Attack.checkPassInfos(distances[i].robot, passInfoTable, false) ? i : nr
		let acceptPos = geom.intersectLineCircle(posToShiftFrom, pos[i] - posToShiftFrom, circle, radius)
		taskAssignments[distances[i].robot] = {class: Striker, params: {new Vector(-pos[i].x,pos[i].y), acceptPos}}
	}
	if (nr) {
		taskAssignments[distances[nr].robot] = { class: AcceptPass}

		for (i=2,#this._robots) {
			if (i!=nr) {
				let acceptPos = geom.intersectLineCircle(posToShiftFrom, pos[i] - posToShiftFrom, circle, radius)
				taskAssignments[distances[i].robot] = {class: Striker, params: {pos[i], acceptPos}, restart: true}
			}
		}
	}

	return taskAssignments, mainrobot
}
return WindshieldWiper
