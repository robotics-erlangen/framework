let MoveSRC1 = Class("Group.Move.MoveSRC1", require "group/move/base")

import {MoveToPos} from "glados/task/shared/movetopos";
import {Pass} from "glados/task/shared/pass";
import * as Ball from "glados/tobserver/ball";
import {ShootGoal} from "glados/task/attacker/shootgoal";
import * as Referee from "base/referee";
let World =   require "+/base/world"
import * as debug from "base/debug";

let G = World.Geometry;

let XFACTOR = G.FieldWidthHalf / 3;
let YFACTOR = G.FieldHeightHalf / 4.5;

let POS1 = [new Vector(-1.5 * XFACTOR, 3.5 * YFACTOR), new Vector(-1.5 * XFACTOR, 3.5 * YFACTOR), new Vector(-1.4 * XFACTOR, 2.9 * YFACTOR), new Vector(-1.01 * XFACTOR, 1.47 * YFACTOR), new Vector(0.6 * XFACTOR, -3.4 * YFACTOR)];
let POS2 = [new Vector(-0.7 * XFACTOR, 2.5 * YFACTOR), new Vector(-0.7 * XFACTOR, 2.5 * YFACTOR), new Vector(-1.7 * XFACTOR, 3.6 * YFACTOR), new Vector(-2.7 * XFACTOR, 2.0 * YFACTOR), new Vector(0.3 * XFACTOR, -2.9 * YFACTOR)];
let POS3 = [new Vector(0.5 * XFACTOR, 0.9 * YFACTOR), new Vector(2.5 * XFACTOR, 2.7 * YFACTOR), new Vector(2.5 * XFACTOR, 2.7 * YFACTOR), new Vector(0.6 * XFACTOR, 3.0 * YFACTOR), new Vector(0.4 * XFACTOR, 3.0 * YFACTOR)];
let POS4 = [new Vector(3.0 * XFACTOR, 3.8 * YFACTOR), new Vector(3.0 * XFACTOR, 4.5 * YFACTOR), new Vector(3.0 * XFACTOR, 4.5 * YFACTOR), new Vector(3.0 * XFACTOR, 4.5 * YFACTOR), new Vector(3.0 * XFACTOR, 4.5 * YFACTOR)];
let POS5 = [new Vector(0.4 * XFACTOR, -3.4 * YFACTOR), new Vector(0.4 * XFACTOR, -3.4 * YFACTOR), new Vector(0.14 * XFACTOR, 1.2 * YFACTOR), new Vector(-0.04 * XFACTOR, 1.7 * YFACTOR), new Vector(-0.04 * XFACTOR, 1.7 * YFACTOR)];

MoveSRC1.MIN_ROBOTS = 5;
MoveSRC1.MAX_ROBOTS = 5;


MoveSRC1.TEST_BALL_START_RECTS = {
		{new Vector(4*G.FieldWidthHalf / 5,4*G.FieldHeightHalf / 5), new Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
}

function MoveSRC1.canStart () {
	return World.RefereeState == "Stop" || Referee.isFriendlyFreeKickState()
}

function MoveSRC1:_init () {
	this._state = 0
	this._stopStart = Referee.lastStateChangeTime()
}


function MoveSRC1:_canContinue () {
	return this._state < 5 ? (World.RefereeState == "Stop" && Referee.lastStateChangeTime() == this._stopStart : Referee.isFriendlyFreeKickState() || World.RefereeState == "Game")
}

function MoveSRC1:_updateTasks () {
	let taskAssignments = {}
	let changed = false
	debug.set("state", this._state)
	
	if (this._robots[0].pos.distanceTo(POS1[(this._state % 5) +1]) < 0.1 ? this._robots[1].pos.distanceTo(POS2[(this._state % 5) +1]) < 0.1 && this._robots[2].pos.distanceTo(POS3[(this._state % 5) +1]) < 0.1 && this._robots[3].pos.distanceTo(POS4[(this._state % 5) +1]) < 0.1 && this._robots[4].pos.distanceTo(POS5[(this._state % 5) +1]) < 0.1 && (Referee.isFriendlyFreeKickState() : this._state != 0) 
		 ||  Ball.isShot()) {
		this._state = (this._state + 1 )
		changed = true
	}
	taskAssignments[this._robots[0]] = {class: MoveToPos, params: {POS1[(this._state % 5) +1]}, restart: changed}
	taskAssignments[this._robots[1]] = {class: MoveToPos, params: {POS2[(this._state % 5) +1]}, restart: changed}
	taskAssignments[this._robots[2]] = {class: MoveToPos, params: {POS3[(this._state % 5) +1]}, restart: changed}
	if ((this._state%5) == 3) {
		taskAssignments[this._robots[3]] = {class: Pass, params: {this._robots[4]}, restart: changed}
		
	} else {
		taskAssignments[this._robots[3]] = {class: MoveToPos, params: {POS4[(this._state % 5) +1]}, restart: changed}
	}
	if ((this._state %5) == 4) {
		taskAssignments[this._robots[4]] = {class: ShootGoal, params: {}, restart: changed}
		
	} else {
		taskAssignments[this._robots[4]] = {class: MoveToPos, params: {POS5[(this._state % 5) +1]}, restart: changed}
	}

	if (this._state%5 == 3) {
		return taskAssignments, this._robots[3]
	}
	if (this._state%5 == 4) {
		return taskAssignments, this._robots[4]
	}
	return taskAssignments
}
return MoveSRC1
