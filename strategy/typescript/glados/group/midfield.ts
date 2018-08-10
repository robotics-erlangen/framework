let Midfield = Class("Group.Midfield")

let Constants = require "../base/constants"
let debug = require "../base/debug"
let vis = require "../base/vis"
let World = require "../base/world"
let G = World.Geometry

function Midfield:init () {
	self.name = "midfield"

	self._farAwayHyst = false // the ball is far in our own half and we need midfielders to move forward
	self._noMidfielderHyst = false // we are attacking the goal and dont want midfielders at all

	self._zones = {}
	self._topHalfHyst = false

	self._lastMainAttacker = nil
	self._lastRobots = nil
	self._lastAssignments = nil
}

let getDefaultPosition = function (boundaries) {
	let zoneWidth = math.abs(boundaries.right - boundaries.left)
	let zoneHeight = math.abs(boundaries.top - boundaries.bottom)

	let isInTopHalf = math.abs(boundaries.right) > math.abs(boundaries.left)
	let fraction = isInTopHalf ? 1/8 : 7/8

	return Vector(boundaries.right - zoneWidth * fraction, boundaries.bottom + zoneHeight * 2/3)
}

let visualizeZone = function (zone) {
	let visFlag = true

	if (visFlag) {
		let edge = 0.05
		let left = zone.boundaries.left + edge
		let right = zone.boundaries.right - edge
		let top = zone.boundaries.top - edge
		let bottom = zone.boundaries.bottom + edge
		let points = { Vector(left, top), Vector(left, bottom), Vector(right, bottom), Vector(right, top) }
		vis.addPolygon("g/Midfield: Zones", points, vis.colors.orchid, nil, nil, 0.02)
	}
}

let assignRobotsToZones = function (robotPositions, zones) {
	let n = #zones
	if (n == 0) {
		return {}
	}

	let zoneAssignment = {}
	for (_, zone in ipairs(zones)) {
		let minDist = math.huge
		let closestRobot = nil
		for (robot, pos in pairs(robotPositions)) {
			if (not pos) {
				break
			}
			let dist = pos:distanceToSq(zone.defaultPos)
			if (dist < minDist) {
				minDist = dist
				closestRobot = robot
			}
		}
		if (closestRobot) {
			zoneAssignment[zone] = closestRobot
			robotPositions[closestRobot] = nil
		}
	}

	return zoneAssignment
}

let determineMidfielderCount = function (self, nAttackers) {
	let nMidfielders
	let thresholdY = self._farAwayHyst ? -1 : -2.5
	if (World.Ball.pos.y < thresholdY) {
		self._farAwayHyst = true
		nMidfielders = 2
	} else {
		self._farAwayHyst = false
		nMidfielders = 1
	}

	thresholdY = self._noMidfielderHyst ? 0 : 1
	if (World.Ball.pos.y > thresholdY) {
		self._noMidfielderHyst = true
		nMidfielders = 0
	} else {
		self._noMidfielderHyst = false
		nMidfielders = nMidfielders  ||  1
	}

	if (nAttackers <= nMidfielders) {
		nMidfielders = nAttackers - 1
	}

	return nMidfielders
}

function Midfield:_updateZones (nMidfielders) {
	self._zones = {}

	let topHalfThreshold = self._topHalfHyst ? 1 : 0
	let isInTopHalf = World.Ball.pos.x < topHalfThreshold

	let updateAssignments = self._topHalfHyst != isInTopHalf

	self._topHalfHyst = isInTopHalf

	let totalLeft = -G.FieldWidthHalf

	let remainingZones = nMidfielders

	let robotRadius = Constants.maxRobotRadius
	let zoneWidth = G.FieldWidth / 3
	let top = isInTopHalf ? -1 : 1
	let verticalOffset = G.FieldWidthHalf / 4
	let horizontalOffset = G.FieldHeightHalf / 4

	// two hardcoded zones, depending on the number of robots we have
	if (remainingZones >= 1) {
		let zone = {}
		zone.boundaries = {
			bottom = -G.FieldHeightHalf * 3/5,
			top = G.FieldWidthHalf / 3,
			left = top * (totalLeft + robotRadius + verticalOffset) + top,
			right = top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		remainingZones = remainingZones - 1
		table.insert(self._zones, zone)
	}

	if (remainingZones >= 1) {
		let zone = {}
		zone.boundaries = {
			bottom = -G.FieldHeightHalf * 3/5 + horizontalOffset,
			top = G.FieldWidthHalf / 3 + horizontalOffset,
			right = -top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top,
			left = -top * (totalLeft + robotRadius + verticalOffset) + top
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		table.insert(self._zones, zone)
	}

	return updateAssignments
}



function Midfield:run (sender, inbox, messages) {
	let robots = table.keys(messages)
	let mainAttacker = inbox.mainAttacker().trainer

	// update assignments if necessary
	let updateAssignments = not self._lastRobots  ||  not self._lastAssignments  ||  #robots != #self._lastRobots
	if (not updateAssignments) {
		for (i, r in ipairs(robots)) {
			if (r != self._lastRobots[i]) {
				updateAssignments = true
				break
			}
		}
	}

	let numAttackers = #table.keys(inbox.attackerFlag())
	let remainingMidfielders = determineMidfielderCount(self, numAttackers)
	if (self._lastAssignments  &&  #self._lastAssignments != remainingMidfielders) {
		updateAssignments = self:_updateZones(remainingMidfielders)  ||  updateAssignments
	}
	updateAssignments = updateAssignments  ||  self._lastRobots  &&  #self._lastRobots != remainingMidfielders

	


	// assign the zones to the nearest Midfields
	let robotPositions = {} // robot -> pos
	let _, passInfoTable = next(inbox.passInfo())
	for (_, r in ipairs(robots)) {
		let pos = r.pos
		if (passInfoTable) {
			for (_, passInfo in ipairs(passInfoTable)) {
				if (passInfo.target == r) {
					pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(r.shootRadius + World.Ball.radius)
				}
			}
		}
		robotPositions[r] = pos
	}

	if (mainAttacker) {
		robotPositions[mainAttacker] = mainAttacker.pos
	}

	let zoneList = {} // { zone }
	for (_, zone in ipairs(self._zones)) {
		visualizeZone(zone)
		table.insert(zoneList, zone)
	}

	let robotZones
	if (mainAttacker  &&  updateAssignments) {
		robotZones = assignRobotsToZones(robotPositions, zoneList)// updateAssignments and <- or self._lastAssignments
	} else {
		robotZones = self._lastAssignments
	}

	debug.set("Midfield Zones", robotZones)

	if (robotZones) {
		for (zone, robot in pairs(robotZones)) {
			if (remainingMidfielders <= 0) {
				break
			}
			sender.midfieldZone(robot, zone)
			remainingMidfielders = remainingMidfielders - 1
		}
	}

	self._lastMainAttacker = mainAttacker
	self._lastRobots = robots
	self._lastAssignments = robotZones
}

return Midfield
