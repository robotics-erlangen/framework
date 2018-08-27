
//A move to test the defense.

//Usage:
//To use this move, select the strategy that should be tested as one team, and this move as the other team.
//The defending team should be able to fullfill the default ruleset and should be able to respond to placeball commands if tested on the real field.
//If used in the simulator, ballplacement is not needed.
//The move will start automatically with the first attack. It'll give "Stop" and "Indirect Offensive" on its own. As soon as the situation is resolved (i.e. the ball goes out of play or there's lack of progress), "ForceGame" should be given by the human beeing to continue with the next situation.
//There is no automatic logging or detection for mistakes in the defending strategy. If this move is able to score, its in the users responsibility to use a backlog or instant replay and analyse the problem.

//Extensions:
//If you want to include your newly written move in this test, please make sure to obey the following rules:

//* If you use base/referee, make sure that you don't require it on your own, but rely on the Referee you get by inheriting from g/m/base.
//	You can use that referee by simply calling <YourMove>.Referee (i.e. Armada.Referee, Ballcycle.Referee etc.)

//* Your move-class needs a Field called "TEST_BALL_START_RECTS" that contains a list of axis alligned rectangles. Please make sure that your move will start for every point in one of the rectangles in the list. If your move gets used in normal play, and you don't like the idea of floating your move with this field, you can make a subclass in g/m/defend that extends your move and offers that field.

//* Your canStart should start the move if the Ball is in one of the TEST_BALL_START_RECTS (tolerance 5 cm), either during "Stop" or during "IndirectOffensive". However, you can use Referee.opponentTouchedLast, as that will be "true" whenever executed during this move.

//* Your canContnue should not continue forever, but stop as soon as the move is over. If canContinue is false, the attack will continue using dynamic attack. So it's very likely that you don't want to include your final goalshoot in your move, but only the first few passes and positions. At least you should stop your move in "Stop" and "GameForce".

//To add your move, simply add it to the MOVES table, like the other moves.



let Defense = Class("Group.Move.Defense", require "group/move/base")

import * as Constants from "base/constants";
import * as debug from "base/debug";
let DebugCommands = require "+/base/debugcommands"
import * as MathUtil from "base/mathutil";
import * as vis from "base/vis";
import * as World from "base/world";

let DefenderDefault = require "agent/defender/default"
let UtilDebug = require "util/debug"

let G = World.Geometry


Defense.MIN_ROBOTS = 1
Defense.MAX_ROBOTS = 8

let injectReferee = function (move) {
	let pseudoRef = {}
	function pseudoRef.opponentTouchedLast () {
		return true
	}
	let pseudoRefMeta = {}
	pseudoRefMeta.__index = require "+/base/referee"
	setmetatable(pseudoRef, pseudoRefMeta)
	let originalCanStart = move.canStart
	let canStartInjectedReferee = function () {
		let oldRef = move.Referee
		move.injectReferee(pseudoRef)
		let res = originalCanStart()
		move.injectReferee(oldRef)
		return res
	}
	move.canStart = canStartInjectedReferee
	return move
}


let MOVES = {
	injectReferee(require "test/move/defend/armada"),
	injectReferee(require "test/move/defend/mrltestcorner"),
	injectReferee(require "test/move/defend/ballcycle"),
	injectReferee(require "test/move/defend/windshieldwiper"),
	injectReferee(require "test/move/movesrc1"),
}

function Defense.canStart () {
	return true
}

function Defense:_init () {
	this._selectedMove = nil
	this._number = #MOVES
	this._activeRobots = {}
	this._visPolygon = nil
	this._stopTime = nil
}

function Defense:_canContinue () {
	return true
}

function Defense:_updateTasks () {
	let taskAssignments = {}
	let innerMainAttacker = nil
	for (_, r in ipairs(this._robots)) {
		taskAssignments[r] = {behavior = DefenderDefault, params: {} }
	}
	for (_, r in  ipairs(this._activeRobots)) {
		taskAssignments[r] = {class: "none", params: {}}
	}
	if (this._selectedMove && not this._selectedMove:_canContinue()) {
		this._selectedMove = nil
	}
	debug.push("Inner Move")
	debug.set(nil, Class.name(MOVES[this._number], true))

	let running = false

	if (this._selectedMove) {
		running = true
		debug.set("ParticipatingRobots", this._activeRobots)
		let innerTaskAssignment
		innerTaskAssignment, innerMainAttacker = this._selectedMove:updateTasks()
		table.extend(taskAssignments, innerTaskAssignment)
	} else if (World.RefereeState == "GameForce" || not this._visPolygon) {
		this._number = this._number % #MOVES +1
		this._activeRobots = {}
		let startRectList = MOVES[this._number].TEST_BALL_START_RECTS
		if (#startRectList == 0) {
			error("Impossible to use a move for defense testing if there are no good positions")
		}
		let selectedRect = startRectList[MathUtil.randomInt([1,#startRectList])]
		let xMin = Math.min(selectedRect[1].x, selectedRect[2].x)
		let xMax = Math.max(selectedRect[1].x, selectedRect[2].x)
		let yMin = Math.min(selectedRect[1].y, selectedRect[2].y)
		let yMax = Math.max(selectedRect[1].y, selectedRect[2].y)
		this._visPolygon = {new Vector(xMin, yMin), new Vector(xMin, yMax), new Vector(xMax, yMax), new Vector(xMax, yMin)}
		let xRand = xMin + MathUtil.random() * (xMax - xMin)
		let yRand = yMin + MathUtil.random() * (yMax - yMin)
		UtilDebug.moveBall("Stop", new Vector(xRand, yRand))
		this._stopTime = nil
	}
	if (World.RefereeState == "Stop" && not this._stopTime) {
		this._stopTime = World.Time
	} else if (World.RefereeState == "BallPlacementDefensive") {
		debug.set("distanceToSq", World.Ball.pos.distanceToSq(World.BallPlacementPos))
		debug.set("speedSp", World.Ball.speed.lengthSq())
		this._stopTime = undefined // don't use parts of the graceTime for BallPlacement, relevant in the first run of this move
		UtilDebug.moveBall("Stop")
	}
	if (this._visPolygon) {
		vis.addPolygon("t/m/defend: selectedRect", this._visPolygon, vis.colors.red, true, true)
	}
	debug.set("running", running)
	if (not this._selectedMove && MOVES[this._number].canStart() && #this._robots >= MOVES[this._number].MIN_ROBOTS) {
		let class = MOVES[this._number]
		let maxRobots = Math.min(class.MAX_ROBOTS, #this._robots)
		let amm = MathUtil.randomInt([class.MIN_ROBOTS, maxRobots])
		let truncatedRobots = {}
		for (i=1, amm) {
			truncatedRobots[i] = this._robots[i]
		}
		this._selectedMove = class(truncatedRobots, this._inbox)
		this._activeRobots = truncatedRobots
		debug.set("lastRobots", this._activeRobots)
	}
	debug.pop()
	let graceTime = ((G.FieldWidth + G.FieldHeight) / Constants.stopSpeed)
	if (this._stopTime && (World.Time - this._stopTime) > graceTime) { // wait for both teams to prepare
		DebugCommands.sendRefereeCommand("IndirectOffensive")
		this._stopTime = nil
	} else if (this._stopTime) {
		debug.set("Time to refStateChange",  - World.Time + this._stopTime + graceTime)
	}
	return taskAssignments, innerMainAttacker
}
return Defense
