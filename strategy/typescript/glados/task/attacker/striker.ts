let SuggestPass = require "task/ability/suggestpass"
let StrikerSampling = require "task/ability/strikersampling"
let Striker = Class("Task.Striker", require "task/base", SuggestPass, StrikerSampling)

import * as geom from "base/geom";
import * as Field from "base/field";
import * as Referee from "base/referee";
import * as vis from "base/vis";
import * as World from "base/world";
let G = World.Geometry

import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

import * as Attack from "glados/util/attack";


function Striker:_init (manualDefaultPos, manualPassDest) {
	this._manualDefaultPos = manualDefaultPos
	this._manualPassDest = manualPassDest
	this._passDestSuggestion = manualPassDest

	this._moveDest = nil

	this._zone = nil

	this._revaluateTimestamp = 0

	this._obstacleTable  = {
		ignoreBall = true,
		inbox = this._inbox
	}
}

function Striker:_revaluatePassDest () {
	if (this._manualPassDest) {
		return false
	}

	let timestamps = this._inbox.strikerSamplingTimestamp("broadcast")
	let nextCandidate = nil
	let nextCandidateTimestamp = Infinity
	for (r, time in pairs(timestamps)) {
		if (not nextCandidate || time < nextCandidateTimestamp
				 ||  time == nextCandidateTimestamp && r.id < nextCandidate.id) {
			nextCandidate = r
			nextCandidateTimestamp = time
		}
	}

	let revaluate = this._robot == nextCandidate
	if (revaluate) {
		this._revaluateTimestamp = World.Time
	}

	this._send.strikerSamplingTimestamp("all", this._revaluateTimestamp)

	return revaluate
}

function Striker:_searchForPassDest () {
	this.precalculate()

	let grid_point_count_x = 6
	let grid_point_count_y = 10

	let grid_point_dist_x = G.FieldWidth / grid_point_count_x
	let grid_point_dist_y = G.FieldHeight / grid_point_count_y

	let boundaries = this._zone.boundaries
	let left = boundaries.left
	let right = boundaries.right
	let top = boundaries.top
	let bottom = boundaries.bottom

	// TODO hysteresis
	// TODO only consider well-timed pass positions
	// TODO am strafraum stehen ist geil! -> score anpassen

	let bestPoint = nil
	let bestScore = -Infinity
	for (x = grid_point_dist_x * 0.5 - G.FieldWidthHalf, G.FieldWidthHalf, grid_point_dist_x) {
		if (x > left && x < right) {
			for (y = grid_point_dist_y * 0.5 - G.FieldHeightHalf, G.FieldHeightHalf, grid_point_dist_y) {
				if (y > bottom && y < top) {
					let candidatePoint = new Vector(x, y)
					candidatePoint = Field.limitToAllowedField(candidatePoint, 3 * this._robot.radius + 0.1)
					if (geom.insideRect(new Vector(left, bottom), new Vector(right, top), candidatePoint)) {
						let score = this.evalLocation(candidatePoint, bestScore)
						let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
						if (passInfoTable) {
							for (_, passInfo in pairs(passInfoTable)) {
								if (passInfo.ballPos.distanceToSq(candidatePoint) < 0.01*0.01) {
									score = score + 0.1
								}
							}
						}
						if (score > bestScore) {
							bestScore = score
							bestPoint = candidatePoint
						}
					}
				}
			}
		}
	}

	this._passDestSuggestion = bestPoint
}

function Striker:run () {
	this._send.strikerFlag("all")

	if (this._manualDefaultPos) {
		this._moveDest = this._manualDefaultPos
	} else {
		// participate in the striker group
		let groupApplication = { name = "striker", payload = {} }
		this._send.groupApplication("trainer", groupApplication)

		// retrieve the assigned zone from the striker group
		this._zone = this._inbox.strikerZone().trainer
		if (not this._zone) {
			return
		}
		this._moveDest = this._zone.defaultPos
	}

	// search for a good pass dest
	if (this._revaluatePassDest()) {
		this._searchForPassDest()
	}

	// check whether the agent would change its state to accepting an incoming pass (striker should not be active then)
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	assert(Attack.checkPassInfos(this._robot, passInfoTable, false) == false, "Striker shouldn't accept passes")

	if (passInfoTable) {
		for (_, passInfo in ipairs(passInfoTable)) {
			vis.addCircle("t/striker", this._moveDest, 0.1, vis.colors.slateHalf, true)
			if (this._passDestSuggestion) {
				let color = passInfo.target == this._robot
 ? vis.colors.turquoiseHalf : vis.colors.whiteHalf
				vis.addCircle("t/striker", passInfo.ballPos, 0.1, color, true)
				vis.addCircle("t/striker", this._passDestSuggestion, 0.14,
					vis.colors.whiteHalf, false, undefined, undefined, 0.03)
				vis.addPath("t/striker", {this._moveDest, this._passDestSuggestion},
					vis.colors.slateHalf, undefined, undefined, 0.02)
			}
		}
	}
	// set path obstacles to not interfere with the current attack
	let moveTime = nil
	let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	// send a suggestion for a pass in the run
	if (this._passDestSuggestion && attackPosition) {
		this._suggestPass(this._passDestSuggestion, attackPosition, moveTime)
	}

	// be close to the defense area to catch possible stray shots
	let cbDistToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
	if (this._passDestSuggestion && not Referee.isFriendlyFreeKickState()
			 &&  Field.distanceToDefenseArea(this._passDestSuggestion, cbDistToDefenseArea) < 0.8) {

		let intersection = Field.intersectRayDefenseArea(this._moveDest, G.OpponentGoal - this._moveDest, cbDistToDefenseArea + 0.3, false)
		this._moveDest = intersection || this._moveDest
	}

	this._robot.trajectory.update(ToTarget, this._moveDest, (World.Ball.pos - this._robot.pos).angle())
}


return Striker
