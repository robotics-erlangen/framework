require "../base/base"
local World = require "../base/world"
local vis = require "../base/vis"
World._init()
local geometry = World.Geometry
Entrypoints = {}
local p = path.create()
p:setBoundary(  -geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
				-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
				 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
				 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)


--declare start, end and obstacles here
local pointA = Vector.create(0,-1)
local pointB = Vector.create(0, 2)
local obstacles = {}
table.insert(obstacles, {type='Circle', pos=Vector.create(0,0), radius=0.1})
table.insert(obstacles, {type='Line',
	posStart=Vector.create(-0.5,0.1), posEnd=Vector.create(1,0.1), radius=0.02})
table.insert(obstacles, {type='Circle', pos=Vector.create(0,-0.5), radius=0.3})
table.insert(obstacles, {type='Line',
	posStart=Vector.create(-0.5,-0.5), posEnd=Vector.create(0.5,-0.5), radius=0.02})


for _,obstacle in pairs(obstacles) do
	if obstacle.type == 'Circle' then
		p:addCircle(obstacle.pos.x, obstacle.pos.y, obstacle.radius, false)
	elseif obstacle.type == 'Line' then
		p:addLine(obstacle.posStart.x, obstacle.posStart.y, 
			obstacle.posEnd.x, obstacle.posEnd.y, obstacle.radius, false, "bla")
	end
end

local function calculateWaypoints ()
	-- FIXME Bug in Ra: Wegfindungsobjekt ohne Hindernisse, wenn automatisch neu geladen,
	-- nach einem Reload gehts dann

	local waypoints = p:get(pointA.x, pointA.y, pointB.x, pointB.y, 0.09)
	local prev = pointA
	local dist = 0
	for i=1,#waypoints do
		local cur = Vector.create(waypoints[i].p_x, waypoints[i].p_y)
		vis.addPathRaw("waypoints", {prev, cur}, vis.colors.yellow)
		dist = dist + cur:distanceTo(prev)
		prev = cur
	end
end

Entrypoints["main"] = function ()
	World._update()
	calculateWaypoints()
	p:addTreeVisualization()
	for _,obstacle in pairs(obstacles) do
		if obstacle.type == "Circle" then
			vis.addCircleRaw("obstacles", obstacle.pos, obstacle.radius, vis.colors.blue)
		elseif obstacle.type == "Line" then
			vis.addPathRaw("obstacles", {obstacle.posStart, obstacle.posEnd}, vis.colors.blue)
		end
	end
end


return {name = "path-test", entrypoints = Entrypoints}