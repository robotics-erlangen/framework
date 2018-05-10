--[[
--- Path module provided by Ra. <br/>
-- As every data value on the path object is set by the strategy, it would be possible to use strategy coordinates. This however would require further coordinate transformations as the generated controller input has to use global coordinates. <br/>
-- Thus it is recommened to use global coordinates for everything stored in a path object.
-- However the functions for adding obstacles require strategy coordinates and handle any neccessary conversions.
module "path"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

--- Creates a new path planner object
-- @class function
-- @name path:create
-- @return path - path object

--[[
separator for luadoc]]--

--- Resets path planner object. Clears obstacles and waypoints. Field boundaries won't be changed
-- @class function
-- @name path:reset

--[[
separator for luadoc]]--

--- Clears obstacles
-- @class function
-- @name path:clearObstacles

--[[
separator for luadoc]]--

--- Set probabilities. Sum should be less or equal to 1
-- @class function
-- @param p_dest number - probability to extend towards destination
-- @param p_waypoints numberr - probability to extend towards a previously generated waypoint
-- @name path:setProbabilities

--[[
separator for luadoc]]--

--- Sets field boundaries.
-- The two points span up a rectangle whose borders are used as field boundaries. The boundaries must be specified in global coordinates.
-- @class function
-- @name path:setBoundary
-- @param x1 number - bottom left
-- @param y1 number
-- @param x2 number - top right
-- @param y2 number

--[[
separator for luadoc]]--

--- Adds a circle as an obstacle.
-- The circle <strong>must</strong> be passed in strategy coordinates!
-- @class function
-- @name path:addCircle
-- @param x number - x coordinate of circle center
-- @param y number - y coordinate of circle center
-- @param radius number
-- @param name string - name of the obstacle

--[[
separator for luadoc]]--

--- Adds a line as an obstacle.
-- The line <strong>must</strong> be passed in strategy coordinates!
-- @class function
-- @name path:addLine
-- @param start_x number - x coordinate of line start point
-- @param start_y number - y coordinate of line start point
-- @param end_x number - x coordinate of line end point
-- @param end_y number - y coordinate of line end point
-- @param radius number - line width and start/end cap radius
-- @param name string - name of the obstacle

--[[
separator for luadoc]]--

--- Adds a rectangle as an obstacle.
-- The rectangle <strong>must</strong> be passed in strategy coordinates!
-- @class function
-- @name path:addRect
-- @param start_x number - x coordinate of bottom left corner
-- @param start_y number - y coordinate of bottom left corner
-- @param end_x number - x coordinate of upper right corner
-- @param end_y number - y coordinate of upper right corner
-- @param name string - name of the obstacle

--[[
separator for luadoc]]--

--- Adds a triangle as an obstacle.
-- The triangle <strong>must</strong> be passed in strategy coordinates!
-- @class function
-- @name path:addTriangle
-- @param x1 number - x coordinate of the first point
-- @param y1 number - y coordinate of the first point
-- @param x2 number - x coordinate of the second point
-- @param y2 number - y coordinate of the second point
-- @param x3 number - x coordinate of the third point
-- @param y3 number - y coordinate of the third point
-- @param lineWidth number - extra distance
-- @param name string - name of the obstacle

--[[
separator for luadoc]]--

--- Tests a given path for collisions with any obstacle.
-- The spline is based on the global coordinate system!
-- @class function
-- @name path:test
-- @param path protobuf.robot.Spline
-- @param radius number - minimum required corridor size
-- @return bool isOk - true if no collision is detected

--[[
separator for luadoc]]--

--- Sets robot radius for obstacle checking
-- @class function
-- @name path:setRadius
-- @param radius number - minimum required corridor size

--[[
separator for luadoc]]--

--- Generates a new path using RRT.
-- Accounts for obstacles. The returned waypoints include the start point. This functions requires and returns global coordinates!
-- @class function
-- @name path:get
-- @param start_x number - x coordinate of start point
-- @param start_y number - y coordinate of start point
-- @param end_x number - x coordinate of end point
-- @param end_y number - y coordinate of end point
-- @return {p_x, p_y, left, right}[] - waypoints and corridor widths for the way to a waypoint

--[[
separator for luadoc]]--

--- Add a new target for seeding the RRT search tree.
-- Seeding is done by rasterizing a path from rrt start to the given point
-- @class function
-- @name path:addSeedTarget
-- @param x number - x coordinate of seed point
-- @param y number - y coordinate of seed point

--[[
separator for luadoc]]--

--- Generates a visualization of the tree.
-- @class function
-- @name path:addTreeVisualization

-- luacheck: globals path
require "path"
local path = path

-- kill all references
_G["path"] = nil
package.preload["path"] = nil
package.loaded["path"] = nil

local vis = require "../base/vis"

local teamIsBlue = amun.isBlue()

-- wrap add obstacle functions for automatic strategy to global coordinates conversion
local _addCircle = path.addCircle
function path:addCircle(x, y, radius, name, prio)
	if teamIsBlue then
		x = -x
		y = -y
	end
	if not amun.isPerformanceMode then
		vis.addCircleRaw("obstacles: "..tostring(path.robotId(self)), Vector(x,y), radius, vis.colors.redHalf, true)
	else
		-- avoid string allocations in ra
		name = nil
	end
	_addCircle(self, x, y, radius, name, prio or 0)
end

local _addLine = path.addLine
function path:addLine(start_x, start_y, stop_x, stop_y, radius, name, prio)
	if start_x == stop_x and start_y == stop_y then
		log("WARNING: start and end points for a line obstacle are the same!")
		return
	end
	if teamIsBlue then
		start_x = -start_x
		start_y = -start_y
		stop_x = -stop_x
		stop_y = -stop_y
	end
	if not amun.isPerformanceMode then
		vis.addPathRaw("obstacles: "..tostring(path.robotId(self)), {Vector(start_x, start_y), Vector(stop_x, stop_y)}, vis.colors.redHalf, nil, nil, 2 * radius)
	else
		-- avoid string allocations in ra
		name = nil
	end
	_addLine(self, start_x, start_y, stop_x, stop_y, radius, name, prio or 0)
end

local _addRect = path.addRect
function path:addRect(start_x, start_y, stop_x, stop_y, name, prio)
	if teamIsBlue then
		start_x = -start_x
		start_y = -start_y
		stop_x = -stop_x
		stop_y = -stop_y
	end
	if not amun.isPerformanceMode then
		vis.addPolygonRaw("obstacles: "..tostring(path.robotId(self)), {Vector(start_x, start_y), Vector(start_x, stop_y), Vector(stop_x, stop_y), Vector(stop_x, start_y)},
			vis.colors.redHalf, true)
	else
		-- avoid string allocations in ra
		name = nil
	end
	_addRect(self, start_x, start_y, stop_x, stop_y, name, prio or 0)
end

local _addTriangle = path.addTriangle
function path:addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, name, prio)
	if teamIsBlue then
		x1 = -x1
		y1 = -y1
		x2 = -x2
		y2 = -y2
		x3 = -x3
		y3 = -y3
	end
	if not amun.isPerformanceMode then
		local p1 = Vector(x1,y1)
		local p2 = Vector(x2,y2)
		local p3 = Vector(x3,y3)
		vis.addPolygonRaw("obstacles: "..tostring(path.robotId(self)), {p1, p2, p3}, vis.colors.redHalf, true)
	else
		-- avoid string allocations in ra
		name = nil
	end
	_addTriangle(self, x1, y1, x2, y2, x3, y3, lineWidth, name, prio or 0)
end

local _addSeedTarget = path.addSeedTarget
if _addSeedTarget then
	path.addSeedTarget = function (self, x, y)
		if teamIsBlue then
			x = -x
			y = -y
		end
		_addSeedTarget(self, x, y)
	end
end

local _create = path.create
local pathToIdMap = {}
setmetatable(pathToIdMap, {__mode = "k"})

path.create = function (robotId)
	local pathInst = _create()
	pathToIdMap[pathInst] = robotId
	return pathInst
end

path.robotId = function (self)
	return pathToIdMap[self]
end

return path
