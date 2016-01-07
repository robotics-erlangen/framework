local PathTest = {}

local World = require "../base/world"
local vis = require "../base/vis"
local Coordinates = require "../base/coordinates"


--declare start, end and obstacles here
local pointStart = Coordinates.toGlobal(Vector.create(0,-1))
local pointEnd = Coordinates.toGlobal(Vector.create(0, 2))
local obstacles = {}
table.insert(obstacles, {type='Circle', pos=Vector.create(0,0), radius=0.1})
table.insert(obstacles, {type='Line',
	posStart=Vector.create(-0.5,0.1), posEnd=Vector.create(1,0.1), radius=0.02})
table.insert(obstacles, {type='Circle', pos=Vector.create(0,-0.5), radius=0.3})
table.insert(obstacles, {type='Line',
	posStart=Vector.create(-0.5,-0.5), posEnd=Vector.create(0.5,-0.5), radius=0.02})


local pathInstance = nil

local function setupPath()
	if pathInstance ~= nil then
		return
	end

	local geometry = World.Geometry
	pathInstance = path.create()
	pathInstance:setBoundary(
					-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
					-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
					 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
					 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)

	for _,obstacle in pairs(obstacles) do
		if obstacle.type == 'Circle' then
			pathInstance:addCircle(obstacle.pos.x, obstacle.pos.y, obstacle.radius)
		elseif obstacle.type == 'Line' then
			pathInstance:addLine(obstacle.posStart.x, obstacle.posStart.y,
				obstacle.posEnd.x, obstacle.posEnd.y, obstacle.radius)
		end
	end

	pathInstance:setRadius(0.09)
end

local function drawObstacles()
	for _,obstacle in pairs(obstacles) do
		if obstacle.type == "Circle" then
			vis.addCircle("obstacles", obstacle.pos, obstacle.radius, vis.colors.blue)
		elseif obstacle.type == "Line" then
			vis.addPath("obstacles", {obstacle.posStart, obstacle.posEnd}, vis.colors.blue)
		end
	end
end

local function drawWaypoints(waypoints)
	local prev = pointStart
	local dist = 0
	for i=1,#waypoints do
		local cur = Vector.create(waypoints[i].p_x, waypoints[i].p_y)
		vis.addPathRaw("waypoints", {prev, cur}, vis.colors.yellow)
		dist = dist + cur:distanceTo(prev)
		prev = cur
	end
	return dist
end


function PathTest.testFixedObstacles()
	setupPath()
	drawObstacles()
	local waypoints = pathInstance:get(pointStart.x, pointStart.y, pointEnd.x, pointEnd.y)
	drawWaypoints(waypoints)
	pathInstance:addTreeVisualization()
end

function PathTest.testStartEqualsEnd()
	setupPath()
	drawObstacles()
	local waypoints = pathInstance:get(pointStart.x, pointStart.y, pointStart.x, pointStart.y)
	drawWaypoints(waypoints)
	pathInstance:addTreeVisualization()
end

return PathTest
