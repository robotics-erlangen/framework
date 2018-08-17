let PathStub = Class("Test.Task.PathStub")

import * as debug from "base/debug";
import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import {MoveToPos} from "glados/task/shared/movetopos";
let Trainer = require "trainer/trainer"


let WAYPOINTS = nil
function PathStub.setWaypoints (waypoints) {
	WAYPOINTS = {}
	for (_, v in ipairs(waypoints)) {
		table.insert(WAYPOINTS, v.copy())
	}
}

// PathStub.setWaypoints( { Vector(1, -1), new Vector(1, 1), new Vector(-2, -2), new Vector(0, 0) })

// PathStub.setWaypoints( { Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0), new Vector(0, 0) })

let wps = {}
let parts = 20
for (i=0,parts) {
	let angle = i / parts * 2 * Math.PI
	table.insert(wps, Vector.fromAngle(angle))
}
PathStub.setWaypoints(wps)

function PathStub.create () {
	return PathStub()
}

function PathStub:init () {
	this._resetPath()
}

let makePoint = function (x, y) {
	return { p_x = x, p_y = y, left = 0, right = 0 }
}

function PathStub:_resetPath () {
	this._waypoints = {}
	for (_, p in ipairs(WAYPOINTS)) {
		table.insert(this._waypoints, makePoint(p.x, p.y))
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
	let robotPos = new Vector(start_x, start_y)

	if (robotPos.distanceTo(new Vector(this._waypoints[1].p_x, this._waypoints[1].p_y)) < 0.04) {
		table.remove(this._waypoints, 1)
	}
	if (#this._waypoints == 0) {
		this._resetPath()
	}

	let waypoints = { makePoint(start_x, start_y) }
	for (_, p in ipairs(this._waypoints)) {
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
	let pos = new Vector(0, 0)
	return MoveToPos, { pos, (-pos).angle() }
}


let PathAgent = Class("Test.Task.PathAgent", require "agent/base/simpleagent")
PathAgent._behaviors = {
	Position
}


let coord = nil

let run = function () {
	if (coord == undefined) {
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
