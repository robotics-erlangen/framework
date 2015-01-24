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

--- Generates a visualization of the tree.
-- @class function
-- @name path:addTreeVisualization

require "path"

local teamIsBlue = amun.isBlue()

-- wrap add obstacle functions for automatic strategy to global coordinates conversion
local _addCircle = path.addCircle
function path:addCircle(x, y, radius, name)
	if teamIsBlue then
		_addCircle(self, -x, -y, radius, name)
	else
		_addCircle(self, x, y, radius, name)
	end
end

local _addLine = path.addLine
function path:addLine(start_x, start_y, stop_x, stop_y, radius, name)
	if teamIsBlue then
		_addLine(self, -start_x, -start_y, -stop_x, -stop_y, radius, name)
	else
		_addLine(self, start_x, start_y, stop_x, stop_y, radius, name)
	end
end

local _addRect = path.addRect
function path:addRect(start_x, start_y, stop_x, stop_y, name)
	if teamIsBlue then
		_addRect(self, -start_x, -start_y, -stop_x, -stop_y, name)
	else
		_addRect(self, start_x, start_y, stop_x, stop_y, name)
	end
end
