let Dribble = Class("Test.Move.Dribble", require "group/move/base")

let DribbleTask = require "task/attacker/dribble"
import * as World from "base/world";

let G = World.Geometry

Dribble.MIN_ROBOTS = 1
Dribble.MAX_ROBOTS = 1

// the armada has 4 steps to form stairs, depending on ball distance
let POSITIONS_ORIG = [
	new Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	new Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	new Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
	new Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	new Vector(G.FieldWidthHalf * -0.56, G.FieldWidthHalf * -0.225),
];

function Dribble.canStart () {
	return true;
}

function Dribble:_init () {
	this._state = 1;
	this._time = World.Time;
}

function Dribble:_canContinue () {
	return true;
}

function Dribble:_updateTasks () {
	let state_changed = false;
	let delay = false;
	if (World.Time - this._time < 3) {
		delay = true;
	}
	if (not delay && this._state == 5) {
		this._state = 1;
		state_changed = true;
	}
	if (this._robots[0].pos.distanceTo(POSITIONS_ORIG[this._state]) < 0.01 && not delay) {
		if (this._state == 4) {
			this._time = World.Time;
		}
		this._state = this._state + 1;
		state_changed = true;
	}
	let taskAssignments = {};
	taskAssignments[this._robots[0]] = { class: DribbleTask, params: {POSITIONS_ORIG[this._state]}, restart: state_changed };
	return taskAssignments, this._robots[0];
}

return Dribble
