let Striker = Class("Group.Striker")

import * as Field from "base/field";
import * as vis from "base/vis";
import {Vector, Position} from "base/vector";
import * as World from "base/world";
let G = World.Geometry
let MovesHelper = require "util/moveshelper"

function Striker:init () {
	this.name = "striker"

	this._strikerCount = 0

	this._zones = {}
	this._emptyZone = nil

	this._lastMainAttacker = nil
	this._lastRobots = nil
	this._lastAssignments = nil
}

function getDefaultPosition (boundaries) {
	let zoneWidth = boundaries.right - boundaries.left
	let zoneHeight = boundaries.top - boundaries.bottom
	let x, y
	do {
		x = (Math.random() * 0.6 + 0.2) * zoneWidth + boundaries.left
		y = (Math.random() * 0.6 + 0.2) * zoneHeight + boundaries.bottom
	while(Field.isInOpponentDefenseArea(new Vector(x, y), 0.2));
	return new Vector(x, y)
}

function visualizeZone (zone) {
	let edge = 0.05;
	let left = zone.boundaries.left + edge;
	let right = zone.boundaries.right - edge;
	let top = zone.boundaries.top - edge;
	let bottom = zone.boundaries.bottom + edge;
	let points = [ new Vector(left, top), new Vector(left, bottom), new Vector(right, bottom), new Vector(right, top) ];
	vis.addPolygon("g/striker: Zones", points, vis.colors.gold, undefined, undefined, 0.02);
}

function assignRobotsToZones (robotPositions, zones) {
	let n = zones.length
	if (n == 0) {
		return {}
	}

	let positions = {}
	let robots = {}
	for (robot, robotPos in pairs(robotPositions)) {
		table.insert(positions, {pos: robotPos})
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
	this._strikerCount = nStrikers

	// reset the zones
	this._zones = {}
	if (remainingZones == 0) {
		return
	}

	// create midfield zone
	do
		let boundaries = { left = totalLeft, right = totalRight, top = G.FieldHeightHalf/4, bottom = totalBottom }
		let defaultPos = getDefaultPosition(boundaries)
		table.insert(this._zones, {boundaries = boundaries, defaultPos = defaultPos})
		remainingZones = remainingZones - 1
	}

	// create offensive zones
	let zoneWidth = (totalRight - totalLeft) / remainingZones
	for (i = 1, remainingZones) {
		let boundaries = { left = totalLeft + (i - 1) * zoneWidth, right = totalLeft + i * zoneWidth,
				top = totalTop, bottom = G.FieldHeightHalf / 4 }
		let defaultPos = getDefaultPosition(boundaries)
		table.insert(this._zones, {boundaries = boundaries, defaultPos = defaultPos})
	}

	// reset empty zone hysteresis
	this._emptyZone = nil
}

function Striker:_chooseEmptyZone (mainAttackerPos) {
	let emptyZoneHysteresis = this._emptyZone ? 0.2 : 0
	if (mainAttackerPos) {
		for (_, zone in ipairs(this._zones)) {
			if (mainAttackerPos.x >= zone.boundaries.left + emptyZoneHysteresis
					 &&  mainAttackerPos.x <= zone.boundaries.right - emptyZoneHysteresis
					 &&  mainAttackerPos.y >= zone.boundaries.bottom + emptyZoneHysteresis
					 &&  mainAttackerPos.y <= zone.boundaries.top - emptyZoneHysteresis) {
				this._emptyZone = zone
				break
			}
		}
	}

	// default: midfield zone is empty
	if (not this._emptyZone && #this._zones > 0) {
		this._emptyZone = this._zones[1]
	}
}

function Striker:run (sender, inbox, messages) {
	let robots = table.keys(messages)
	let mainAttacker = inbox.mainAttacker().trainer
	let prevEmptyZone = this._emptyZone

	// if the mainAttacker changes, assume that the previous mainAttacker becomes a striker instead
	let robotsTmp = {}
	for (let robot of robots) {
		if (robot == mainAttacker && this._lastMainAttacker) {
			table.insert(robotsTmp, this._lastMainAttacker)
		} else {
			table.insert(robotsTmp, robot)
		}
	}
	robots = robotsTmp

	// update assignments if necessary
	let updateAssignments = not this._lastRobots || not this._lastAssignments || #robots != #this._lastRobots
	if (not updateAssignments) {
		for (i, r in ipairs(robots)) {
			if (r != this._lastRobots[i]) {
				updateAssignments = true
				break
			}
		}
	}

	// update zones if necessary
	if (#robots != this._strikerCount) {
		updateAssignments = true
		this._updateZones(robots)
	}

	// choose which zone is occupied by the mainAttacker
	let mainAttackerPos = nil
	if (mainAttacker) {
		mainAttackerPos = inbox.attackPosition()[mainAttacker] || mainAttacker.pos
	}
	this._chooseEmptyZone(mainAttackerPos)

	//update assignments if empty zone changed
	updateAssignments = updateAssignments || this._emptyZone != prevEmptyZone

	// assign the zones to the nearest strikers
	let robotPositions = {} // robot -> pos
	let _, passInfoTable = next(inbox.passInfo())
	for (_, r in ipairs(robots)) {
		let pos = r.pos
		if (passInfoTable) {
			for (_, passInfo in ipairs(passInfoTable)) {
				if (passInfo.target == r) {
					pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).setLength(r.shootRadius + World.Ball.radius)
				}
			}
		}
		robotPositions[r] = pos
	}

	let zoneList = {} // { zone }
	for (_, zone in ipairs(this._zones)) {
		if (zone != this._emptyZone) {
			table.insert(zoneList, zone)
			visualizeZone(zone)
		}
	}

	let robotZones = updateAssignments ? assignRobotsToZones(robotPositions, zoneList) : this._lastAssignments

	for (zone, robot in pairs(robotZones)) {
		sender.strikerZone(robot, zone)
	}


	this._lastMainAttacker = mainAttacker
	this._lastRobots = robots
	this._lastAssignments = robotZones
}

return Striker
