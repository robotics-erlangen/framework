let SafeCorner = Class("Group.Move.SafeCorner", require "group/move/base")

let Referee = require "../base/referee"
let World = require "../base/world"
let Freekick = require "agent/attacker/freekick"
let MoveToPos = require "task/shared/movetopos"
let StopAttack = require "task/attacker/stopattack"
let Striker = require "task/attacker/striker"
let G = World.Geometry

SafeCorner.MIN_ROBOTS = 5
SafeCorner.MAX_ROBOTS = 5

function SafeCorner.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 //and Referee.opponentTouchedLast()
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"
}

function SafeCorner:_init () {
	self._ballSide = (World.Ball.pos.x > 0) ? 1 : -1 //Instanzvariable
	self._goalDist = G.DefenseRadius + 0.4
}

function SafeCorner:_canContinue () {
	if (Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2 //Eckposition festlegen
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2 //G: geometry
		 &&  World.RefereeState == "Stop"
}

function SafeCorner:_updateTasks () {

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	} else if (Referee.isFriendlyFreeKickState()) {
		taskAssignments[self._robots[1]] = { behavior = Freekick }
	}

	taskAssignments[self._robots[2]] = { class = Striker, params = { Vector(0, G.FieldHeightHalf * -0.5), Vector(0, 0) }}
	taskAssignments[self._robots[3]] = { class = Striker, params = { Vector(self._ballSide * G.FieldWidthHalf * -0.5, G.FieldHeightHalf * -0.5),
		Vector(self._ballSide * G.FieldWidthHalf * -0.5, 0) }}
	taskAssignments[self._robots[4]] = { class = MoveToPos, params = { Vector(0.3, G.OpponentGoal.y - G.DefenseRadius - 0.4)}}
	// taskAssignments[self._robots[5]] = { class = MoveToPos, params = { Vector(, )}}


	return taskAssignments, self._robots[1]
}
return SafeCorner
