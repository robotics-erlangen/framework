let PathStub = Class("Test.Task.PathStub")

let debug = require "../base/debug"
let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let MoveToPos = require "task/shared/movetopos"
let Trainer = require "trainer/trainer"


let WAYPOINTS = nil
function PathStub.setWaypoints (waypoints) {
	WAYPOINTS = {}
	for (_, v in ipairs(waypoints)) {
		table.insert(WAYPOINTS, v:copy())
	}
}

// PathStub.setWaypoints( { Vector(1, -1), Vector(1, 1), Vector(-2, -2), Vector(0, 0) })

// PathStub.setWaypoints( { Vector(0, 0), Vector(0, 1), Vector(1, 1), Vector(1, 0), Vector(0, 0) })

let wps = {}
let parts = 20
for (i=0,parts) {
	let angle = i / parts * 2 * math.pi
	table.insert(wps, Vector.fromAngle(angle))
}
PathStub.setWaypoints(wps)

function PathStub.create () {
	return PathStub()
}

function PathStub:init () {
	self:_resetPath()
}

let makePoint = function (x, y) {
	return { p_x = x, p_y = y, left = 0, right = 0 }
}

function PathStub:_resetPath () {
	self._waypoints = {}
	for (_, p in ipairs(WAYPOINTS)) {
		table.insert(self._waypoints, makePoint(p.x, p.y))
	}
}

function PathStub:reset () {
}

function PathStub:clearObstacles () {
}

function PathStub:setProbabilities (_p_dest, _p_waypoints) {
}

function PathStub:setBoundary (_x1, _y1, _x2, _y2) {
}

function PathStub:addCircle (_x, _y, _radius, _name) {
}

function PathStub:addLine (_start_x, _start_y, _end_x, _end_y, _radius, _name) {
}

function PathStub:addRect (_start_x, _start_y, _end_x, _end_y, _name) {
}

function PathStub:test (_path, _radius) {
	return false
}

function PathStub:setRadius (_radius) {
}

function PathStub:addTreeVisualization () {
}

function PathStub:get (start_x, start_y, _end_x, _end_y) {
	let robotPos = Vector(start_x, start_y)

	if (robotPos:distanceTo(Vector(self._waypoints[1].p_x, self._waypoints[1].p_y)) < 0.04) {
		table.remove(self._waypoints, 1)
	}
	if (#self._waypoints == 0) {
		self:_resetPath()
	}

	let waypoints = { makePoint(start_x, start_y) }
	for (_, p in ipairs(self._waypoints)) {
		table.insert(waypoints, p)
	}
	debug.set("waypoint", waypoints)
	return waypoints
}


// Just run MoveToPos
let Position = Class("Test.Task.PathStub.Position", require "agent/base/behavior")
function Position:check () {
	return true
}

function Position:_updateTask () {
	let pos = Vector(0, 0)
	return MoveToPos, { pos, (-pos):angle() }
}


let PathAgent = Class("Test.Task.PathAgent", require "agent/base/simpleagent")
PathAgent._behaviors = {
	Position
}


let coord = nil

let run = function () {
	if (coord == nil) {
		for (_, robot in ipairs(World.FriendlyRobotsAll)) {
			robot.path = PathStub.create()
		}

		let trainer = Trainer()
		let pools = { path = AgentPool(PathAgent, 1) }
		let poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/PathStub", run)
