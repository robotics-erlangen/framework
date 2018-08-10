let debugtree = require "../base/debug"
let debugcommands = require "../base/debugcommands"
let Entrypoints = require "../base/entrypoints"
let vis = require "../base/vis"
let World = require "../base/world"

let Coordinator = require "control/maincoordinator"
let Messaging = require "control/messaging"
let MoveToPos = require "task/shared/movetopos"
let TestHelper = require "test/helper/agent"

let situations = {
	Duel = require "test/situation/duel",
	goalKick = require "test/situation/goalkick",
	Pass = require "test/situation/pass",
	ShootOnEmptyGoal = require "test/situation/shootonemptygoal"
}


let positionThreshold = 0.1 // the precision for considering a position to be occupied
let angleThreshold = math.pi / 18
let goalies = { blue = nil, yellow = nil }
let destinations = { yellow = {}, blue = {} } // for setup, inner objects indexed by robot
let messaging = nil
let setupAgents = {}
let state // can be one of "prepare", "arrived", "waitForForce", "game"
let situation, initialized

let invertCoordinates = function () {
	situation.ball.pos = -situation.ball.pos
	situation.ball.speed = -situation.ball.speed
	for (_, dest in pairs(situation.yellowRobots  ||  {})) {
		dest.pos = -dest.pos
		dest.dir = -dest.dir
		dest.speed = -dest.speed
		dest.angularSpeed = -dest.angularSpeed
	}
	for (_, dest in pairs(situation.blueRobots  ||  {})) {
		dest.pos = -dest.pos
		dest.dir = -dest.dir
		dest.speed = -dest.speed
		dest.angularSpeed = -dest.angularSpeed
	}
}

let checkNumberOfRobots = function () {
	let ownColor = World.TeamIsBlue ? "blue" : "yellow"
	let otherColor = World.TeamIsBlue ? "yellow" : "blue"
	let ownRequired = table.count(situation[ownColor  +  "Robots"]  ||  {})
	let otherRequired = table.count(situation[otherColor  +  "Robots"]  ||  {})
	let ownRobotCount = #World.FriendlyRobotsAll
	if (ownRobotCount < ownRequired) {
		let num = (ownRequired - ownRobotCount)
		let robot_s = num == 1 ? " robot" : " robots"
		error("this situation needs "  +  num  +  " more "  +  ownColor  +  robot_s)
	} else if (ownRobotCount > ownRequired) {
		let robot_s = ownRequired == 1 ? " robot" : " robots"
		log("this situation is encoded for "  +  ownRequired  +  " "  +  ownColor  +  robot_s)
	}
	if (#World.OpponentRobots != otherRequired) {
		let robot_s = otherRequired == 1 ? " robot" : " robots"
		log("this situation is encoded for "  +  otherRequired  +  " "  +  otherColor  +  robot_s)
	}
}

let computeDestinations = function () {
	let fieldRobots = {
		blue = World.TeamIsBlue ? World.FriendlyRobots : World.OpponentRobots,
		yellow = World.TeamIsBlue ? World.OpponentRobots : World.FriendlyRobots
	}
	for (color, robots in pairs(fieldRobots)) {
		let index = 1
		for (id, dest in pairs(situation[color  +  "Robots"]  ||  {})) {
			if (robots[index]) {
				destinations[color][robots[index]] = dest
				if (id == situation[color  +  "Goalie"]) {
					goalies[color] = robots[index].id
				}
				index = index + 1
			}
		}
	}
}

let createAgentsAndMoveTasks = function () {
	for (robot, destination in pairs(destinations[World.TeamIsBlue ? "blue" : "yellow"])) {
		table.insert(setupAgents, TestHelper.staticAgent(robot,
			TestHelper.staticBehavior(MoveToPos, { destination.pos, destination.dir:angle() }),
			messaging)
		)
	}
}

let haveRobotsArrived = function () {
	for (robot, destination in pairs(destinations[World.TeamIsBlue ? "blue" : "yellow"])) {
		if (robot.pos:distanceTo(destination.pos) > positionThreshold  ||
				destination.dir:angleDiff(Vector.fromAngle(robot.dir)) > angleThreshold) {
			return false
		}
	}
	return true
}

let ballMessagePrinted = false
let ballThanksMessagePrinted = true // don't print if ball is already there
let isBallPositioned = function () {
	if (not World.TeamIsBlue) {
		return true // blue team cares about ball
	}
	if (World.Ball.pos:distanceTo(situation.ball.pos) > positionThreshold) {
		vis.addCircle("test: Manual Ball Position", situation.ball.pos, 0.05, vis.colors.red, true)
		if (not ballMessagePrinted) {
			log("Please place the ball at "  +  String(situation.ball.pos)
				 +  " (Visualization \"Manual Ball Position\")")
			ballMessagePrinted = true
			ballThanksMessagePrinted = false
		}
		return false
	}
	if (not ballThanksMessagePrinted) {
		log("thanks") // for placing the ball
		ballThanksMessagePrinted = true
		ballMessagePrinted = false // print again if ball moves
	}
	return true
}

let init = function (situation_) {
	situation = situation_
	assert(amun.isDebug, "only works in debug mode")
	if (World.TeamIsBlue) {
		invertCoordinates() // situation is saved from yellow's point of view
	}
	messaging = Messaging()
	checkNumberOfRobots()
	computeDestinations()
	if (World.gameStageMapping[situation.gameStage]) { // support Protobuf and Strategy stage names
		situation.gameStage = World.gameStageMapping[situation.gameStage]
	}
	createAgentsAndMoveTasks()
	debugcommands.sendRefereeCommand("GameForce", nil, goalies.blue, goalies.yellow)
	state = "prepare"
	messaging:deliverMessages() // initialize the module
	initialized = true
}

let coordinator, arrivedTime
let run = function () {
	debugtree.set("situation state", state)
	if (state == "prepare") {
		if (World.RefereeState != "GameForce") {
			debugcommands.sendRefereeCommand("GameForce", nil)
		}
		for (_, agent in ipairs(setupAgents)) {
			agent:run()
		}
		if (isBallPositioned()  &&  haveRobotsArrived()) {
			state = "arrived"
			arrivedTime = World.Time
			debugcommands.sendRefereeCommand("Halt", nil)
		}
	} else if (state == "arrived") {
		if (not (isBallPositioned()  &&  haveRobotsArrived())) {
			state = "prepare"
		}
		if (World.RefereeState == "Halt") {
			// if other team is still in prepare, it sets "GameForce"
			// which should take less than 0.2 seconds
			if (World.Time - arrivedTime > 0.2) {
				state = "waitForForce"
			}
		} else {
			arrivedTime = World.Time
		}
	} else if (state == "waitForForce") {
		if (not (haveRobotsArrived()  &&  isBallPositioned())) {
			state = "prepare"
		}
		if (World.RefereeState == "GameForce") {
			state = "game"
			messaging:deliverMessages() // clear testagent messages
			debugcommands.sendRefereeCommand(situation.refereeState, situation.gameStage)
		}
	} else if (state == "game") {
		if (situation.observe) { situation.observe() }
		if (not coordinator) { coordinator = Coordinator() }
		coordinator:run()
	} else {
		error("invalid game state "  +  state)
	}
}

for (name, situation in pairs(situations)) {
	Entrypoints.add("Situations/"..name, function()
		if (not initialized) {
			init(situation)
		} else {
			run()
		}
	end)
}
