let ChipTC = Class("Test.Move.ChipTC", require "group/move/base")


import * as MathUtil from "base/mathutil";
import * as World from "base/world";
let G = World.Geometry
import {MoveToPos} from "glados/task/shared/movetopos";
import {Pass} from "glados/task/shared/pass";

ChipTC.MIN_ROBOTS = 1
ChipTC.MAX_ROBOTS = 1

let pos_y = -G.FieldHeightHalf + 0.1
let positions = [
	new Vector(-G.FieldWidthHalf + 0.1, pos_y),
	new Vector(-G.FieldWidthHalf / 2 + 0.05, pos_y),
	new Vector(0, pos_y)
];

let distances = {
	1.5,
	2.0,
	2.5,
	3.0,
	3.5
}

// ==========================================

let CURRENT_POS = positions[1]

// ==========================================


function ChipTC.canStart () {
	return true;
}

function ChipTC:_init () {
	this._distance = nil;
	this._recalculate = true;
}

function ChipTC:_canContinue () {
	return true;
}

function ChipTC:_updateTasks () {
	let taskAssignments = {};

	if (World.RefereeState == "DirectOffensive") {
		if (this._recalculate) {
			this._distance = distances[MathUtil.randomInt([1,5])];
			this._recalculate = false;
			log(this._distance);
		}
	} else {
		this._recalculate = true;
	}

	if (World.RefereeState == "DirectOffensive") {
		let ballPos = CURRENT_POS + new Vector(0, this._robots[0].shootRadius + World.Ball.radius)
		let target = ballPos + new Vector(0, this._distance * 2.5)
		taskAssignments[this._robots[0]] = { class: Pass, params: {this._robots[0], target, true, this._distance * 2.5} }
	} else {
		taskAssignments[this._robots[0]] = { class: MoveToPos, params: { CURRENT_POS, Math.PI/2 } }
	}

	return taskAssignments, this._robots[0]
}

return ChipTC
