local PathStub = Class("Test.Task.PathStub")

local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local MoveToPos = require "task/shared/movetopos"
local Trainer = require "trainer/trainer"


local WAYPOINTS = nil
function PathStub.setWaypoints(waypoints)
	WAYPOINTS = {}
	for _, v in ipairs(waypoints) do
		table.insert(WAYPOINTS, v:copy())
	end
end

-- PathStub.setWaypoints( { Vector(1, -1), Vector(1, 1), Vector(-2, -2), Vector(0, 0) })

-- PathStub.setWaypoints( { Vector(0, 0), Vector(0, 1), Vector(1, 1), Vector(1, 0), Vector(0, 0) })

local wps = {}
local parts = 20
for i=0,parts do
	local angle = i / parts * 2 * math.pi
	table.insert(wps, Vector.fromAngle(angle))
end
PathStub.setWaypoints(wps)

function PathStub.create()
	return PathStub()
end

function PathStub:init()
	self:_resetPath()
end

local function makePoint(x, y)
	return { p_x = x, p_y = y, left = 0, right = 0 }
end

function PathStub:_resetPath()
	self._waypoints = {}
	for _, p in ipairs(WAYPOINTS) do
		table.insert(self._waypoints, makePoint(p.x, p.y))
	end
end

function PathStub:reset()
end

function PathStub:clearObstacles()
end

function PathStub:setProbabilities(_p_dest, _p_waypoints)
end

function PathStub:setBoundary(_x1, _y1, _x2, _y2)
end

function PathStub:addCircle(_x, _y, _radius, _name)
end

function PathStub:addLine(_start_x, _start_y, _end_x, _end_y, _radius, _name)
end

function PathStub:addRect(_start_x, _start_y, _end_x, _end_y, _name)
end

function PathStub:test(_path, _radius)
	return false
end

function PathStub:setRadius(_radius)
end

function PathStub:addTreeVisualization()
end

function PathStub:get(start_x, start_y, _end_x, _end_y)
	local robotPos = Vector(start_x, start_y)

	if robotPos:distanceTo(Vector(self._waypoints[1].p_x, self._waypoints[1].p_y)) < 0.04 then
		table.remove(self._waypoints, 1)
	end
	if #self._waypoints == 0 then
		self:_resetPath()
	end

	local waypoints = { makePoint(start_x, start_y) }
	for _, p in ipairs(self._waypoints) do
		table.insert(waypoints, p)
	end
	debug.set("waypoint", waypoints)
	return waypoints
end


-- Just run MoveToPos
local Position = Class("Test.Task.PathStub.Position", require "agent/base/behavior")
function Position:check()
	return true
end

function Position:_updateTask()
	local pos = Vector(0, 0)
	return MoveToPos, { pos, (-pos):angle() }
end


local PathAgent = Class("Test.Task.PathAgent", require "agent/base/simpleagent")
PathAgent._behaviors = {
	Position
}


local coord = nil

local function run()
	if coord == nil then
		for _, robot in ipairs(World.FriendlyRobotsAll) do
			robot.path = PathStub.create()
		end

		local trainer = Trainer()
		local pools = { path = AgentPool(PathAgent, 1) }
		local poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/PathStub", run)
