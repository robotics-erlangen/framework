let Moves = Class("Group.Moves")

import * as debug from "base/debug";

function Moves:init () {
	this.name = "moves"
	this.moveList = {
		require "group/move/kickoff",
		require "group/move/kickoffdefensive",
		require "group/move/mrltestcorner",
		require "group/move/armada",
		require "group/move/fastballplacement",
		// require "group/move/overchip",
		require "group/move/windshieldwiper",
		require "group/move/none"
	}

	for (_,move in ipairs(this.moveList)) {
		if (not move.MIN_ROBOTS || move.MIN_ROBOTS < 0
			 ||  not move.MAX_ROBOTS || move.MAX_ROBOTS < move.MIN_ROBOTS) {
			error("MIN_ROBOTS and/or MAX_ROBOT are invalid || not set!")
		}
	}

	this._numAttackersSent = false
	this._chosenMove = nil
	this._currentMove = nil
	this._participatingRobots = {}
}

let validateAssignment = function (assignment) {
	// don't assing a task and a behavior
	if (assignment.behavior && assignment.class) {
		return false
	}

	//don't assing nothing
	if (not assignment.behavior && not assignment.class) {
		return false
	}

	return true
}

function Moves:run (sender, inbox, messages) {
	// check if all participating robots are still available
	if (this._currentMove) {
		for (_,r in ipairs(this._participatingRobots)) {
			if (not messages[r]) {
				this._currentMove = nil
				this._chosenMove = nil
				break
			}
		}
	}

	// check if current move can be continued
	if (this._currentMove && not this._currentMove:_canContinue()) {
		this._currentMove = nil
		this._chosenMove = nil
		this._numAttackersSent = false
	}

	let n_attackers
	// choose a new move
	if (not this._chosenMove) {
		let candidates = {}
		let numCandidateRobots = 0
		for (_,_ in pairs(inbox.attackerFlag())) {
			numCandidateRobots = numCandidateRobots + 1
		}
		for (_,_ in pairs(inbox.defenderFlag())) {
			numCandidateRobots = numCandidateRobots + 1
		}
		for (_,move in ipairs(this.moveList)) {
			if (move.canStart()) {
				if (numCandidateRobots >= move.MIN_ROBOTS) {
					table.insert(candidates, move)
				}
			}
		}

		if (#candidates > 0) {
			let index = Math.random(#candidates)
			this._chosenMove = candidates[index]
			n_attackers = Math.min(numCandidateRobots, candidates[index].MAX_ROBOTS)
		}
	}

	if (not this._currentMove && this._chosenMove) {
		let availableRobots = {}
		for (r,_ in pairs(messages)) {
			table.insert(availableRobots, r)
		}

		if (#availableRobots >= this._chosenMove.MIN_ROBOTS  &&
			#availableRobots <= this._chosenMove.MAX_ROBOTS  &&
			this._numAttackersSent) {
			table.sort(availableRobots, function(a, b) return a.id < b.id })
			this._currentMove = this._chosenMove(availableRobots, inbox)
			this._participatingRobots = availableRobots
		}
	}


	// reset participating robots
	let prevParticipatingRobots = this._participatingRobots
	this._participatingRobots = {}

	// run
	if (this._currentMove) {
		debug.push("Move")
		let taskAssignments, mainAttacker = this._currentMove:updateTasks()
		for (_, robot in ipairs(prevParticipatingRobots)) {
			let assignment = taskAssignments[robot]
			if (assignment) {
				if (not validateAssignment(assignment)) {
					for (key,value in pairs(assignment)) {
						log(String(key)  +  " -> "  +  String(value))
					}
					error("invalid assignment for robot "  +  String(robot.id))
				}
				assignment.mainAttacker = robot == mainAttacker
				if (assignment.class != "none") {
					sender.moveAssignment(robot, assignment)
				}
				table.insert(this._participatingRobots, robot)
			} else {
				sender.forcePoolChange("trainer", { robot = robot, destPool = "defender" })
			}
		}
		n_attackers = #this._participatingRobots
		debug.pop()
	}

	if (this._chosenMove && n_attackers) {
		assert(n_attackers)
		this._numAttackersSent = true
		sender.moveNumAttackers("trainer", n_attackers)
	}

	debug.push("Move")
	debug.set("ParticipatingRobots", this._participatingRobots)
	if (this._currentMove) {
		debug.set(nil, Class.name(this._currentMove, true))
	}
	debug.pop()
}

return Moves
