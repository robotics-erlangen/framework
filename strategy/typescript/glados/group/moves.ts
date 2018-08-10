let Moves = Class("Group.Moves")

let debug = require "../base/debug"

function Moves:init () {
	self.name = "moves"
	self.moveList = {
		require "group/move/kickoff",
		require "group/move/kickoffdefensive",
		require "group/move/mrltestcorner",
		require "group/move/armada",
		require "group/move/fastballplacement",
		// require "group/move/overchip",
		require "group/move/windshieldwiper",
		require "group/move/none"
	}

	for (_,move in ipairs(self.moveList)) {
		if (not move.MIN_ROBOTS  ||  move.MIN_ROBOTS < 0
			 ||  not move.MAX_ROBOTS  ||  move.MAX_ROBOTS < move.MIN_ROBOTS) {
			error("MIN_ROBOTS and/or MAX_ROBOT are invalid  ||  not set!")
		}
	}

	self._numAttackersSent = false
	self._chosenMove = nil
	self._currentMove = nil
	self._participatingRobots = {}
}

let validateAssignment = function (assignment) {
	// don't assing a task and a behavior
	if (assignment.behavior  &&  assignment.class) {
		return false
	}

	//don't assing nothing
	if (not assignment.behavior  &&  not assignment.class) {
		return false
	}

	return true
}

function Moves:run (sender, inbox, messages) {
	// check if all participating robots are still available
	if (self._currentMove) {
		for (_,r in ipairs(self._participatingRobots)) {
			if (not messages[r]) {
				self._currentMove = nil
				self._chosenMove = nil
				break
			}
		}
	}

	// check if current move can be continued
	if (self._currentMove  &&  not self._currentMove:_canContinue()) {
		self._currentMove = nil
		self._chosenMove = nil
		self._numAttackersSent = false
	}

	let n_attackers
	// choose a new move
	if (not self._chosenMove) {
		let candidates = {}
		let numCandidateRobots = 0
		for (_,_ in pairs(inbox.attackerFlag())) {
			numCandidateRobots = numCandidateRobots + 1
		}
		for (_,_ in pairs(inbox.defenderFlag())) {
			numCandidateRobots = numCandidateRobots + 1
		}
		for (_,move in ipairs(self.moveList)) {
			if (move.canStart()) {
				if (numCandidateRobots >= move.MIN_ROBOTS) {
					table.insert(candidates, move)
				}
			}
		}

		if (#candidates > 0) {
			let index = math.random(#candidates)
			self._chosenMove = candidates[index]
			n_attackers = math.min(numCandidateRobots, candidates[index].MAX_ROBOTS)
		}
	}

	if (not self._currentMove  &&  self._chosenMove) {
		let availableRobots = {}
		for (r,_ in pairs(messages)) {
			table.insert(availableRobots, r)
		}

		if (#availableRobots >= self._chosenMove.MIN_ROBOTS  &&
			#availableRobots <= self._chosenMove.MAX_ROBOTS  &&
			self._numAttackersSent) {
			table.sort(availableRobots, function(a, b) return a.id < b.id end)
			self._currentMove = self._chosenMove(availableRobots, inbox)
			self._participatingRobots = availableRobots
		}
	}


	// reset participating robots
	let prevParticipatingRobots = self._participatingRobots
	self._participatingRobots = {}

	// run
	if (self._currentMove) {
		debug.push("Move")
		let taskAssignments, mainAttacker = self._currentMove:updateTasks()
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
				table.insert(self._participatingRobots, robot)
			} else {
				sender.forcePoolChange("trainer", { robot = robot, destPool = "defender" })
			}
		}
		n_attackers = #self._participatingRobots
		debug.pop()
	}

	if (self._chosenMove  &&  n_attackers) {
		assert(n_attackers)
		self._numAttackersSent = true
		sender.moveNumAttackers("trainer", n_attackers)
	}

	debug.push("Move")
	debug.set("ParticipatingRobots", self._participatingRobots)
	if (self._currentMove) {
		debug.set(nil, Class.name(self._currentMove, true))
	}
	debug.pop()
}

return Moves
