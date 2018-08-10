let SuggestPass = require "task/ability/suggestpass"
let StrikerSampling = require "task/ability/strikersampling"
let Striker = Class("Task.Striker", require "task/base", SuggestPass, StrikerSampling)

let geom = require "../base/geom"
let Field = require "../base/field"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"
let G = World.Geometry

let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let UtilDefense = require "util/defense"

let Attack = require "util/attack"


function Striker:_init (manualDefaultPos, manualPassDest) {
	self._manualDefaultPos = manualDefaultPos
	self._manualPassDest = manualPassDest
	self._passDestSuggestion = manualPassDest

	self._moveDest = nil

	self._zone = nil

	self._revaluateTimestamp = 0

	self._obstacleTable  = {
		ignoreBall = true,
		inbox = self._inbox
	}
}

function Striker:_revaluatePassDest () {
	if (self._manualPassDest) {
		return false
	}

	let timestamps = self._inbox.strikerSamplingTimestamp("broadcast")
	let nextCandidate = nil
	let nextCandidateTimestamp = math.huge
	for (r, time in pairs(timestamps)) {
		if (not nextCandidate  ||  time < nextCandidateTimestamp
				 ||  time == nextCandidateTimestamp  &&  r.id < nextCandidate.id) {
			nextCandidate = r
			nextCandidateTimestamp = time
		}
	}

	let revaluate = self._robot == nextCandidate
	if (revaluate) {
		self._revaluateTimestamp = World.Time
	}

	self._send.strikerSamplingTimestamp("all", self._revaluateTimestamp)

	return revaluate
}

function Striker:_searchForPassDest () {
	self:precalculate()

	let grid_point_count_x = 6
	let grid_point_count_y = 10

	let grid_point_dist_x = G.FieldWidth / grid_point_count_x
	let grid_point_dist_y = G.FieldHeight / grid_point_count_y

	let boundaries = self._zone.boundaries
	let left = boundaries.left
	let right = boundaries.right
	let top = boundaries.top
	let bottom = boundaries.bottom

	// TODO hysteresis
	// TODO only consider well-timed pass positions
	// TODO am strafraum stehen ist geil! -> score anpassen

	let bestPoint = nil
	let bestScore = -math.huge
	for (x = grid_point_dist_x * 0.5 - G.FieldWidthHalf, G.FieldWidthHalf, grid_point_dist_x) {
		if (x > left  &&  x < right) {
			for (y = grid_point_dist_y * 0.5 - G.FieldHeightHalf, G.FieldHeightHalf, grid_point_dist_y) {
				if (y > bottom  &&  y < top) {
					let candidatePoint = Vector(x, y)
					candidatePoint = Field.limitToAllowedField(candidatePoint, 3 * self._robot.radius + 0.1)
					if (geom.insideRect(Vector(left, bottom), Vector(right, top), candidatePoint)) {
						let score = self:evalLocation(candidatePoint, bestScore)
						let _, passInfoTable = next(self._inbox.passInfo())
						if (passInfoTable) {
							for (_, passInfo in pairs(passInfoTable)) {
								if (passInfo.ballPos:distanceToSq(candidatePoint) < 0.01*0.01) {
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

	self._passDestSuggestion = bestPoint
}

function Striker:run () {
	self._send.strikerFlag("all")

	if (self._manualDefaultPos) {
		self._moveDest = self._manualDefaultPos
	} else {
		// participate in the striker group
		let groupApplication = { name = "striker", payload = {} }
		self._send.groupApplication("trainer", groupApplication)

		// retrieve the assigned zone from the striker group
		self._zone = self._inbox.strikerZone().trainer
		if (not self._zone) {
			return
		}
		self._moveDest = self._zone.defaultPos
	}

	// search for a good pass dest
	if (self:_revaluatePassDest()) {
		self:_searchForPassDest()
	}

	// check whether the agent would change its state to accepting an incoming pass (striker should not be active then)
	let _, passInfoTable = next(self._inbox.passInfo())
	assert(Attack.checkPassInfos(self._robot, passInfoTable, false) == false, "Striker shouldn't accept passes")

	if (passInfoTable) {
		for (_, passInfo in ipairs(passInfoTable)) {
			vis.addCircle("t/striker", self._moveDest, 0.1, vis.colors.slateHalf, true)
			if (self._passDestSuggestion) {
				let color = passInfo.target == self._robot
 ? vis.colors.turquoiseHalf : vis.colors.whiteHalf
				vis.addCircle("t/striker", passInfo.ballPos, 0.1, color, true)
				vis.addCircle("t/striker", self._passDestSuggestion, 0.14,
					vis.colors.whiteHalf, false, nil, nil, 0.03)
				vis.addPath("t/striker", {self._moveDest, self._passDestSuggestion},
					vis.colors.slateHalf, nil, nil, 0.02)
			}
		}
	}
	// set path obstacles to not interfere with the current attack
	let moveTime = nil
	let _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	// send a suggestion for a pass in the run
	if (self._passDestSuggestion  &&  attackPosition) {
		self:_suggestPass(self._passDestSuggestion, attackPosition, moveTime)
	}

	// be close to the defense area to catch possible stray shots
	let cbDistToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
	if (self._passDestSuggestion  &&  not Referee.isFriendlyFreeKickState()
			 &&  Field.distanceToDefenseArea(self._passDestSuggestion, cbDistToDefenseArea) < 0.8) {

		let intersection = Field.intersectRayDefenseArea(self._moveDest, G.OpponentGoal - self._moveDest, cbDistToDefenseArea + 0.3, false)
		self._moveDest = intersection  ||  self._moveDest
	}

	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
}


return Striker
