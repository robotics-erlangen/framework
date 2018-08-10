let Striker = Class("Group.Striker")

let Field = require "../base/field"
let vis = require "../base/vis"
let World = require "../base/world"
let G = World.Geometry
let MovesHelper = require "util/moveshelper"

function Striker:init () {
	self.name = "striker"

	self._strikerCount = 0

	self._zones = {}
	self._emptyZone = nil

	self._lastMainAttacker = nil
	self._lastRobots = nil
	self._lastAssignments = nil
}

let getDefaultPosition = function (boundaries) {
	let zoneWidth = boundaries.right - boundaries.left
	let zoneHeight = boundaries.top - boundaries.bottom
	let x, y
	repeat
		x = (math.random() * 0.6 + 0.2) * zoneWidth + boundaries.left
		y = (math.random() * 0.6 + 0.2) * zoneHeight + boundaries.bottom
	until not Field.isInOpponentDefenseArea(Vector(x, y), 0.2)
	return Vector(x, y)
}

let visualizeZone = function (zone) {
	let edge = 0.05
	let left = zone.boundaries.left + edge
	let right = zone.boundaries.right - edge
	let top = zone.boundaries.top - edge
	let bottom = zone.boundaries.bottom + edge
	let points = { Vector(left, top), Vector(left, bottom), Vector(right, bottom), Vector(right, top) }
	vis.addPolygon("g/striker: Zones", points, vis.colors.gold, nil, nil, 0.02)
}

let assignRobotsToZones = function (robotPositions, zones) {
	let n = #zones
	if (n == 0) {
		return {}
	}

	let positions = {}
	let robots = {}
	for (robot, robotPos in pairs(robotPositions)) {
		table.insert(positions, {pos = robotPos})
		table.insert(robots, robot)
	}
	let zonePositions = {}
	for (_, zone in ipairs(zones)) {
		table.insert(zonePositions, zone.defaultPos)
	}
	let assignment = MovesHelper.assignRobots(positions, zonePositions, 0)

	let zoneAssignment = {}
	for (i, zone in ipairs(zones)) {
		zoneAssignment[zone] = robots[assignment[i]]
	}

	// visualize assignments
	if (not amun.isPerformanceMode) {
		for (zone, robot in pairs(zoneAssignment)) {
			vis.addPath("g/striker: zone assignment", {zone.defaultPos, robot.pos}, vis.colors.white)
		}
	}
	return zoneAssignment
}

function Striker:_updateZones (robots) {
	let totalLeft = -G.FieldWidthHalf
	let totalRight = G.FieldWidthHalf
	let totalTop = G.FieldHeightHalf
	let totalBottom = -G.FieldHeightQuarter

	let nStrikers = #robots
	let remainingZones = nStrikers + 1 // one zone will stay empty
	self._strikerCount = nStrikers

	// reset the zones
	self._zones = {}
	if (remainingZones == 0) {
		return
	}

	// create midfield zone
	do
		let boundaries = { left = totalLeft, right = totalRight, top = G.FieldHeightHalf/4, bottom = totalBottom }
		let defaultPos = getDefaultPosition(boundaries)
		table.insert(self._zones, {boundaries = boundaries, defaultPos = defaultPos})
		remainingZones = remainingZones - 1
	}

	// create offensive zones
	let zoneWidth = (totalRight - totalLeft) / remainingZones
	for (i = 1, remainingZones) {
		let boundaries = { left = totalLeft + (i - 1) * zoneWidth, right = totalLeft + i * zoneWidth,
				top = totalTop, bottom = G.FieldHeightHalf / 4 }
		let defaultPos = getDefaultPosition(boundaries)
		table.insert(self._zones, {boundaries = boundaries, defaultPos = defaultPos})
	}

	// reset empty zone hysteresis
	self._emptyZone = nil
}

function Striker:_chooseEmptyZone (mainAttackerPos) {
	let emptyZoneHysteresis = self._emptyZone ? 0.2 : 0
	if (mainAttackerPos) {
		for (_, zone in ipairs(self._zones)) {
			if (mainAttackerPos.x >= zone.boundaries.left + emptyZoneHysteresis
					 &&  mainAttackerPos.x <= zone.boundaries.right - emptyZoneHysteresis
					 &&  mainAttackerPos.y >= zone.boundaries.bottom + emptyZoneHysteresis
					 &&  mainAttackerPos.y <= zone.boundaries.top - emptyZoneHysteresis) {
				self._emptyZone = zone
				break
			}
		}
	}

	// default: midfield zone is empty
	if (not self._emptyZone  &&  #self._zones > 0) {
		self._emptyZone = self._zones[1]
	}
}

function Striker:run (sender, inbox, messages) {
	let robots = table.keys(messages)
	let mainAttacker = inbox.mainAttacker().trainer
	let prevEmptyZone = self._emptyZone

	// if the mainAttacker changes, assume that the previous mainAttacker becomes a striker instead
	let robotsTmp = {}
	for (_, robot in ipairs(robots)) {
		if (robot == mainAttacker  &&  self._lastMainAttacker) {
			table.insert(robotsTmp, self._lastMainAttacker)
		} else {
			table.insert(robotsTmp, robot)
		}
	}
	robots = robotsTmp

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

	// update zones if necessary
	if (#robots != self._strikerCount) {
		updateAssignments = true
		self:_updateZones(robots)
	}

	// choose which zone is occupied by the mainAttacker
	let mainAttackerPos = nil
	if (mainAttacker) {
		mainAttackerPos = inbox.attackPosition()[mainAttacker]  ||  mainAttacker.pos
	}
	self:_chooseEmptyZone(mainAttackerPos)

	//update assignments if empty zone changed
	updateAssignments = updateAssignments  ||  self._emptyZone != prevEmptyZone

	// assign the zones to the nearest strikers
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

	let zoneList = {} // { zone }
	for (_, zone in ipairs(self._zones)) {
		if (zone != self._emptyZone) {
			table.insert(zoneList, zone)
			visualizeZone(zone)
		}
	}

	let robotZones = updateAssignments ? assignRobotsToZones(robotPositions, zoneList) : self._lastAssignments

	for (zone, robot in pairs(robotZones)) {
		sender.strikerZone(robot, zone)
	}


	self._lastMainAttacker = mainAttacker
	self._lastRobots = robots
	self._lastAssignments = robotZones
}

return Striker
