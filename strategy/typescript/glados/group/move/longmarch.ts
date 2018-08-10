let LongMarch = Class("Group.Move.LongMarch", require "group/move/base")

let Referee = require "../base/referee"
let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"
let StopAttack = require "task/attacker/stopattack"
let Circuit = require "task/attacker/circuit"
let Pass = require "task/shared/pass"
let Ball = require "observer/ball"
let G = World.Geometry

LongMarch.MIN_ROBOTS = 5
LongMarch.MAX_ROBOTS = 5

let POSITIONS = {
	Vector((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius  , G.FieldHeightHalf-G.DefenseRadius),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf-G.DefenseRadius),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf/3),
	Vector( -((G.FieldWidthHalf-G.DefenseRadius)/4 + G.DefenseRadius)  , G.FieldHeightHalf/3)
}


function LongMarch.canStart () {
	return  World.Ball.pos.y < -G.FieldHeightHalf/4
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4
		 &&  World.RefereeState == "Stop"
}

function LongMarch:_init () {
	self._state = "prepare"
}

function LongMarch:_canContinue () {
	if (Referee.isFriendlyFreeKickState()) {
		return true
	}
	if (World.Ball.pos.y < -G.FieldHeightHalf/4 + 0.2
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4 - 0.2
		 &&  World.RefereeState == "Stop") {
		return true
	}
	if (World.RefereeState == "Game"  &&  Ball.opponentBallOwner() == nil) {
		return true
	}
}

function LongMarch:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { Vector(0, G.FieldHeightHalf/2), math.pi } }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { Vector(0, G.FieldHeightHalf/2), math.pi * 2 } }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { Vector(0, -G.FieldHeightHalf/2), math.pi  } }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { Vector(0, -G.FieldHeightHalf/2), math.pi *2 } }
	} else {//if self._state == "pass1" then
		taskAssignments[self._robots[1]] = { class = Pass, params = { self._robots[2] } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { POSITIONS[1], nil, true} }
		taskAssignments[self._robots[3]] = { class = MoveToPos, params = { POSITIONS[2], nil, true} }
		taskAssignments[self._robots[4]] = { class = MoveToPos, params = { POSITIONS[3], nil, true} }
		taskAssignments[self._robots[5]] = { class = MoveToPos, params = { POSITIONS[4], nil, true} }
	//elseif self._state == "pass2" then
	//elseif self._state == "goal" then
	}

	if (World.RefereeState == "Game") {
		self._state = "pass1"
	}



	return taskAssignments, self._robots[1]
}

return LongMarch
