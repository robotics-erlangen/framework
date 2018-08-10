let CommChallengeSlave = Class("Test.Move.CommChallengeSlave", require "group/move/base")

let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"
let vis = require "../base/vis"
let Field = require "../base/field"
let Ball = require "observer/ball"
let ShootGoal = require "task/attacker/shootgoal"

CommChallengeSlave.MIN_ROBOTS = 1
CommChallengeSlave.MAX_ROBOTS = 6

function CommChallengeSlave.canStart () {
	return true
}

function CommChallengeSlave:_init () {
}

function CommChallengeSlave:_canContinue () {
	return true
}

let wayLength = 2.7 // meters, only correct for official field
let defAreaPos = function (robotId, opponentGoal) {
	let pos = Field.defenseIntersectionByWay(wayLength*((robotId+1)/8), 0.23, not opponentGoal)
	vis.addCircle("defAreaPos", pos, 0.1, vis.colors.orangeHalf, true)
	return pos
}

let ballWasShot = false
let passReceiver = nil
function CommChallengeSlave:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		ballWasShot = false
		passReceiver = nil
	}

	if (Ball.isShot()) {
		ballWasShot = true
	}

	if (World.MixedTeam) {


		for (robotId, msg in pairs(World.MixedTeam)) {
			let robot = World.FriendlyRobotsById[robotId]
			if (robot  &&  robot.generation == robot.GENERATION_2014_ID) {
				let pos
				if (msg.shootPos) {
					passReceiver = robot
					log(robot.id)
				}
				if (msg.targetPos) {
					pos = msg.targetPos
				} else {
					pos = defAreaPos(robotId, msg.role == "Offense")
				}


				taskAssignments[robot] =  { class = MoveToPos,
					params = {pos}, restart = true }

			}
		}
	}

	if (ballWasShot  &&  passReceiver) {
		taskAssignments[passReceiver] = { class = ShootGoal }
	}

	for (_, robot in pairs(World.FriendlyRobots)) {
		if (World.RefereeState == "Stop"  ||  not taskAssignments[robot]) {
			let pos = Vector(
				-World.Geometry.FieldWidthHalf+1+robot.id*0.4,
				-0.7)
			taskAssignments[robot] = { class = MoveToPos, params = {pos}, restart=true }
		}
	}

	return taskAssignments
}

return CommChallengeSlave
