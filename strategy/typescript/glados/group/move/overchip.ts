let Overchip = Class("Group.Move.Overchip", require "group/move/base")

let World = require "../base/world"
let G = World.Geometry

let Field = require "../base/field"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let Freekick = require "agent/attacker/freekick"
let MoveToStaticBall = require "task/attacker/movetostaticball"
let OverchipReceiver = require "task/attacker/overchipreceiver"
let Shootgoal = require "task/attacker/shootgoal"
let Striker = require "task/attacker/striker"

// "runway" refers to the way on which we have to accelerate to receive the rolling ball
let MIN_RUNWAY_LENGTH = 1.5 // how much room we need (measured horizontally)
let DISTANCE_TO_DEFENSE_AREA = 1.5 // how far our runway should go, running into the defenders won't help
let MAX_CHIP_DISTANCE = 2 // how far we can (reliably) chip

Overchip.MIN_ROBOTS = 2
Overchip.MAX_ROBOTS = 2

function Overchip.canStart () {
	return Referee.isFriendlyFreeKickState()
			 &&  World.Time - Referee.lastStateChangeTime() < 2 // move should not start if freekick state is already running for some time
			 &&  G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA) - World.Ball.pos.y > MIN_RUNWAY_LENGTH // how much room we need
			 &&  not (World.Ball.pos.y < -G.FieldHeightHalf * 1/3)
			 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf * 3/4
			 &&  not Overchip._runwayObstructed()
}

function Overchip:_init () {

}

function Overchip:_canContinue () {
	if (not Referee.isFriendlyFreeKickState()  ||  World.Time - Referee.lastStateChangeTime() > 6) {
		return false
	}

	for (sender, msg in pairs(self._inbox.passSuggestion())) {
		if (sender == self._robots[2]) {

			// if we can't get the ball before reaching the defense area
			if (Field.isInOpponentDefenseArea(msg.ballPos, 0)) {
				return false
			}
			if (self._runwayObstructed()) {
				return false
			}
			break
		}
	}

	return true
}

function Overchip._runwayObstructed () {
	// if there are robots in the way that we can't overchip
	let goalVector = G.OpponentGoal - World.Ball.pos
	let criticalStart = World.Ball.pos + goalVector:copy():setLength(MAX_CHIP_DISTANCE)
	let distToGoal = G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA
	let criticalEnd = World.Ball.pos + goalVector:copy():setLength(goalVector:length() - distToGoal)
	vis.addCircle("g/m/overchip: critical area", criticalStart, 0.05, vis.colors.red, true)
	vis.addCircle("g/m/overchip: critical area", criticalEnd, 0.05, vis.colors.red, true)
	vis.addPath("g/m/overchip: critical area", {criticalStart, criticalEnd}, vis.colors.red)
	for (_, opp in pairs(World.OpponentRobots)) {
		if (opp.pos:distanceToLineSegment(criticalStart, criticalEnd) < 0.3) {
			return true
		}
	}
	return false
}

function Overchip:_updateTasks () {
	let taskAssignments = {}
	let robotRadius = self._robots[1].radius
	let ballPos = World.Ball.pos
	let goal = G.OpponentGoal

	let closeToBall = self._robots[1].pos:distanceTo(World.Ball.pos) < robotRadius + 0.1
	let closeToPosition = self._robots[2].pos:orthogonalDistance(ballPos, goal) < robotRadius

	if (closeToBall  &&  closeToPosition) {
		taskAssignments[self._robots[1]] = { behavior = Freekick}
		taskAssignments[self._robots[2]] = { class = OverchipReceiver, params = {}}
	} else if (World.Time - Referee.lastStateChangeTime() > 9) {
		taskAssignments[self._robots[1]] = { class = Shootgoal, params = {}}
		taskAssignments[self._robots[2]] = { class = Striker, params = {}}
	} else {
		taskAssignments[self._robots[1]] = { class = MoveToStaticBall, params = {}}
		taskAssignments[self._robots[2]] = { class = OverchipReceiver, params = {}}
	}

	return taskAssignments
}
return Overchip
