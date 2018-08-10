let DefendPenalty = Class("Task.DefendPenalty", require "task/base")

let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Interval = require "util/interval"


let PENALTY_LINE_DISTANCE = 0.35 // prevent robots from crossing the penalty line

let obstacleTable = {
	ignoreBall = false,
	ignorePass = true
}


function DefendPenalty:run () {
	let rr = self._robot.radius //assume all robots have the same radius
	let penaltyLine = World.Geometry.OwnPenaltyLine + PENALTY_LINE_DISTANCE
	vis.addPath("t/defendpenalty: penaltyDistance", {Vector(-2,penaltyLine), Vector(2,penaltyLine)}, vis.colors.whiteHalf)
	// NOTE: All spots are on the penaltyline, so only x-values are processed

	let occupiedSpotsFriendly = {}
	for (robot, pos in pairs(self._inbox.moveDest())) {
		if (math.abs(pos.y - penaltyLine) < 2*rr  &&  robot.id > self._robot.id) {
			table.insert(occupiedSpotsFriendly, pos.x)
		}
	}

	let occupiedSpotsOpp = {} // positions of opponents on the line
	for (_, robot in ipairs(World.OpponentRobots)) {
		if (math.abs(robot.pos.y - penaltyLine) < rr) {
			table.insert(occupiedSpotsOpp, robot.pos.x)
		}
	}
	let preferredSpots = {}
	for (_, robot in ipairs(World.OpponentRobots)) {
		if (robot != World.OpponentKeeper  &&  (robot.pos.y+rr) > penaltyLine) {
			// prefer spot between own keeper and opponent to catch rebound
			let ownKeeperPos = World.FriendlyKeeper ? World.FriendlyKeeper.pos : World.Geometry.FriendlyGoal
			let keeperOppDir = robot.pos - ownKeeperPos
			let prefSpot = (geom.intersectLineLine(ownKeeperPos, keeperOppDir, Vector(0, penaltyLine), Vector.fromAngle(math.pi)))
			if (prefSpot) {
				table.insert(preferredSpots, prefSpot.x)
			}
		}
	}

	let targetPos
	// preference one: next to an opponent on the penaltyLine
	table.sort(occupiedSpotsOpp)
	for (i = 1, #occupiedSpotsOpp) {
		// ignore if other defender is there
		let alreadyMarked = false
		for (_, defX in ipairs(occupiedSpotsFriendly)) {
			if (math.abs(occupiedSpotsOpp[i] - defX) < 2.5* rr) {
				alreadyMarked = true
			}
		}
		if (not alreadyMarked) {
			// check dist to next occupied spot
			let left = occupiedSpotsOpp[i-1]  &&  math.abs(occupiedSpotsOpp[i-1] - occupiedSpotsOpp[i]) < 2.5* rr
			let right = occupiedSpotsOpp[i+1]  &&  math.abs(occupiedSpotsOpp[i+1] - occupiedSpotsOpp[i]) < 2.5* rr
			let leftPos = occupiedSpotsOpp[i] - 2*rr
			let rightPos = occupiedSpotsOpp[i] + 2*rr
			// prefer side to the middle
			if (occupiedSpotsOpp[i] > 0) { // opponent is on the right side
				if (not left) {
					targetPos = leftPos
					break
				} else if (not right) {
					targetPos = rightPos
					break
				}
			} else {// opponent is on the left side
				if (not right) {
					targetPos = rightPos
					break
				} else if (not left) {
					targetPos = leftPos
					break
				}
			}
		}
	}

	let occupiedSpotsAll = table.combine(occupiedSpotsOpp, occupiedSpotsFriendly)
	if (not targetPos) { // preference two: intersection of penaltyLine and line from opponent to friendlyKeeper
		for (_, prefX in ipairs(preferredSpots)) {
			let noOneNear = true
			for (_, occX in ipairs(occupiedSpotsAll)) {
				if (math.abs(prefX - occX) < 2*rr) {
					noOneNear = false
					break
				}
			}
			if (noOneNear) {
				targetPos = prefX
			}
		}
	}
	if (not targetPos) { // fallback: search free point on penaltyLine, which is closest to the middle
		let occupiedSectors = table.map(occupiedSpotsAll, function(x) return {x-rr,x+rr} end)
		Interval.sort(occupiedSectors)
		Interval.merge(occupiedSectors)
		let widthLimit = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
		let freeSectors = Interval.negate(occupiedSectors, -widthLimit, widthLimit)
		targetPos = Interval.getClosestPoint(freeSectors, 0, rr)
	}

	if (not targetPos) { //should only occur when all the whole penalty line is full with robots (i.e never)
		targetPos = Vector(0, 0)
	} else {
		targetPos = Vector(targetPos, penaltyLine)
	}

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, targetPos, (World.Ball.pos - self._robot.pos):angle())

	self._send.moveDest("all", targetPos)
}

return DefendPenalty
