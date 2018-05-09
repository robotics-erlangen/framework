--[[
--- Provides functions to draw on the game field
module "vis"
]]--

--[[***********************************************************************
*   Copyright 2015 Florian Bauer, Michael Eischer, Christian Lobmeier,    *
*       Philipp Nordhus                                                   *
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

local vis = {}

local amun = amun
local Coordinates = require "../base/coordinates"


local gcolor = {}
local gisFilled = true

local ffi = require("ffi")
ffi.cdef[[
typedef struct { const unsigned char red, green, blue, alpha; } RGBA;
]]
local color_type_mt = {}
local color_type = ffi.metatype("RGBA", color_type_mt)

--- Joins rgba-value to a color.
-- Values from 0 to 255
-- @name fromRGBA
-- @param red number
-- @param green number
-- @param blue number
-- @param alpha number
-- @return table color
function vis.fromRGBA(red, green, blue, alpha)
	return color_type(red, green, blue, alpha)
end

--- Implements a red-yellow-green gradient
-- @name fromTemperature
-- @param value a normalized temperature [0, 1]
-- @param alpha the alpha value, default is 127
-- @return table color
function vis.fromTemperature(value, alpha)
	if value < 0 then
		error("vis temperature too low: " .. value)
	end
	if value > 1 then
		error("vis temperature too high: " .. value)
	end
	local red = 1
	local green = 1
	if value < 0.5 then
		red = 2 * value
	else
		green = 2 - 2 * value
	end
	return color_type(255 * red, 255 * green, 0, alpha or 127)
end

--- Modifies alpha value on a copy of the given color
-- @name setAlpha
-- @param color table - source color
-- @param alpha number - new alpha value
-- @return table - color with new alpha
function vis.setAlpha(color, alpha)
	local copy = table.copy(color)
	copy.alpha = alpha
	return copy
end

--- List of predefined colors.
-- with alpha = 255. Colors ending with half have alpha = 127.
-- @class table
-- @name colors
-- @field black (0,0,0)
-- @field white (255,255,255)
-- @field red (255,0,0)
-- @field green (0,255,0)
-- @field blue (0,0,255)
-- @field yellow (255,255,0)
-- @field pink (255,0,255)
-- @field turquoise (0,255,255)
-- @field orange (255, 127, 0)
-- @field magenta (255, 0, 127)
-- @field brown (127, 63, 0)
-- @field skyBlue (127, 191, 255)

-- @field blackHalf (0,0,0)
-- @field whiteHalf (255,255,255)
-- @field redHalf (255,0,0)
-- @field greenHalf (0,255,0)
-- @field blueHalf (0,0,255)
-- @field yellowHalf (255,255,0)
-- @field pinkHalf (255,0,255)
-- @field turquoiseHalf (0,255,255)
-- @field orangeHalf (255, 127, 0)
-- @field magentaHalf (255, 0, 127)
-- @field brownHalf (127, 63, 0)
-- @field skyBlueHalf (127, 191, 255)

vis.colors = {}

vis.colors.black = vis.fromRGBA(0, 0, 0, 255)
vis.colors.blackHalf = vis.fromRGBA(0, 0, 0, 127)
vis.colors.white = vis.fromRGBA(255, 255, 255, 255)
vis.colors.whiteHalf = vis.fromRGBA(255, 255, 255, 127)
vis.colors.grey = vis.fromRGBA(127, 127, 127, 255)
vis.colors.greyHalf = vis.fromRGBA(127, 127, 127, 127)

vis.colors.red = vis.fromRGBA(255, 0, 0, 255)
vis.colors.redHalf = vis.fromRGBA(255, 0, 0, 127)
vis.colors.green = vis.fromRGBA(0, 255, 0, 255)
vis.colors.greenHalf = vis.fromRGBA(0, 255, 0, 127)
vis.colors.blue = vis.fromRGBA(0, 0, 255, 255)
vis.colors.blueHalf = vis.fromRGBA(0, 0, 255, 127)

vis.colors.yellow = vis.fromRGBA(255, 255, 0, 255)
vis.colors.yellowHalf = vis.fromRGBA(255, 255, 0, 127)
vis.colors.pink = vis.fromRGBA(255, 0, 255, 255)
vis.colors.pinkHalf = vis.fromRGBA(255, 0, 255, 127)
vis.colors.turquoise = vis.fromRGBA(0, 255, 255, 255)
vis.colors.turquoiseHalf = vis.fromRGBA(0, 255, 255, 127)

vis.colors.orange = vis.fromRGBA(255, 127, 0, 255)
vis.colors.orangeHalf = vis.fromRGBA(255, 127, 0, 127)
vis.colors.magenta = vis.fromRGBA(255, 0, 127, 255)
vis.colors.magentaHalf = vis.fromRGBA(255, 0, 127, 127)
vis.colors.brown = vis.fromRGBA(127, 63, 0, 255)
vis.colors.brownHalf = vis.fromRGBA(127, 63, 0, 127)
vis.colors.skyBlue = vis.fromRGBA(127, 191, 255, 255)
vis.colors.skyBlueHalf = vis.fromRGBA(127, 191, 255, 127)

vis.colors.slate = vis.fromRGBA(112, 118, 144, 255)
vis.colors.slateHalf = vis.fromRGBA(112, 118, 144, 127)
vis.colors.orchid = vis.fromRGBA(218, 94, 224, 255)
vis.colors.orchidHalf = vis.fromRGBA(218, 94, 224, 127)
vis.colors.gold = vis.fromRGBA(239, 185, 15, 255)
vis.colors.goldHalf = vis.fromRGBA(239, 185, 15, 127)
vis.colors.mediumPurple = vis.fromRGBA(171, 130, 255, 255)
vis.colors.mediumPurpleHalf = vis.fromRGBA(171, 130, 255, 127)
vis.colors.darkPurple = vis.fromRGBA(93, 71, 139, 255)
vis.colors.darkPurpleHalf = vis.fromRGBA(93, 71, 139, 127)


--- Sets line and fill color.
-- If filled is true polygons and circles are filled using color.
-- @name setColor
-- @param color table
-- @param isFilled bool
function vis.setColor(color, isFilled)
	gcolor = color
	gisFilled = isFilled
end

--- Adds a circle.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @name addCircle
-- @param name string - Visualization group
-- @param center Vector - center of the circle
-- @param radius number - radius of the circle
-- @param color table - color (optional)
-- @param isFilled bool - fill circle (optional)
function vis.addCircle(name, center, radius, color, isFilled, background, style, lineWidth)
	assert(radius, "missing radius parameter")
	vis.addCircleRaw(name, Coordinates.toGlobal(center), radius, color, isFilled, background, style, lineWidth)
end

--- Adds a circle. Requires global coordinates.
-- @name addCircleRaw
-- @see addCircle
function vis.addCircleRawGeneric(name, center, radius, color, isFilled, background, style, lineWidth)
	-- if color is set use passed isFilled
	if not color then
		isFilled = gisFilled
		color = gcolor
	end
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		brush = isFilled and color or nil, width = lineWidth or 0.01,
		circle = {p_x = center.x, p_y = center.y, radius = radius},
		background = background
	})
end

if amun.addVisualizationCircle then
	--- Adds a circle. Requires global coordinates.
	-- @name addCircleRaw
	-- @see addCircle
	function vis.addCircleRaw(name, center, radius, color, isFilled, background, style, lineWidth)
		if style ~= nil then
			return vis.addCircleRawGeneric(name, center, radius, color, isFilled, background, style, lineWidth)
		end

		-- if color is set use passed isFilled
		if not color then
			isFilled = gisFilled
			color = gcolor
		end
		amun.addVisualizationCircle(name, center.x, center.y, radius,
				color.red, color.green, color.blue, color.alpha,
				isFilled, background, lineWidth or 0.01)
	end
else
	vis.addCircleRaw = vis.addCircleRawGeneric
end

--- Adds a polygon.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @name addPolygon
-- @param name string - Visualization group
-- @param points Vector[] - Points of the polygon
-- @param color table - color (optional)
-- @param isFilled bool - fill circle (optional)
function vis.addPolygon(name, points, color, isFilled, background, style)
	vis.addPolygonRaw(name, Coordinates.listToGlobal(points), color, isFilled, background, style)
end

--- Adds a polygon. Requires global coordinates.
-- @name addPolygonRaw
-- @see addPolygon
function vis.addPolygonRaw(name, points, color, isFilled, background, style)
	-- if color is set use passed isFilled
	if not color then
		isFilled = gisFilled
		color = gcolor
	end
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		brush = isFilled and color or nil, width = 0.01,
		polygon = {point = points},
		background = background
	})
end


--Paints an axis aligned rectangle
--@name addAxisAlignedRectangle
--@param name string - Visualization group
--@param corner1 Vector - One corner of the rectangle
--@param corner2 Vector - The other corner of the rectangle
--@param color table - see @addPolygon
--@param isFilled bool - see @addPolygon
--@param background - see @addPolygon
--@param style - see @addPolygon
function vis.addAxisAlignedRectangle(name, corner1, corner2, color, isFilled, background, style)
	local minX, minY, maxX, maxY
	minX = math.min(corner1.x, corner2.x)
	minY = math.min(corner1.y, corner2.y)
	maxX = math.max(corner1.x, corner2.x)
	maxY = math.max(corner1.y, corner2.y)
	local path = {}
	table.insert(path, Vector(minX, minY));
	table.insert(path, Vector(minX, maxY));
	table.insert(path, Vector(maxX, maxY));
	table.insert(path, Vector(maxX, minY));
	vis.addPolygon(name, path, color, isFilled, background, style)
end

--- Paints a Pizza where everything outside of [startAngle, endAngle] is filled
--- The shape of the pizza is approximated by a regular hexagon
-- @param name string - Name of the pizza
-- @param center Vectos - center point of the pizza
-- @param radius number - radius of the pizza
-- @param startAngle number - the starting angle of the missing pizza piece
-- @param endAngle number - the end angle of the missing pizza piece
local N_corners = 25
function vis.addPizza(name, center, radius, startAngle, endAngle, color, isFilled, background, style)
	local points = {center + Vector.fromAngle(startAngle)*radius, center, center + Vector.fromAngle(endAngle)*radius}
	if (startAngle - endAngle)%(2*math.pi) < 2*math.pi/N_corners then
		vis.addPolygon(name, points, color, isFilled, background, style)
	else
		local wStart = math.ceil(N_corners*endAngle/(2*math.pi))
		local wEnd = math.floor(N_corners*startAngle/(2*math.pi))
		if wEnd < wStart then
			wEnd = wEnd + N_corners
		end
		for w = wStart, wEnd do
			local angle = w*math.pi*2/N_corners
			table.insert(points, center + Vector.fromAngle(angle)*radius)
		end
		vis.addPolygon(name, points, color, isFilled, background, style)
	end
end

--- Adds a path.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @name addPath
-- @param name string - Visualization group
-- @param points Vector[] - Points of the path
-- @param color table - line color (optional)
function vis.addPath(name, points, color, background, style, lineWidth)
	vis.addPathRaw(name, Coordinates.listToGlobal(points), color, background, style, lineWidth)
end

--- Adds a path. Requires global coordinates.
-- @name addPathRaw
-- @see addPath
function vis.addPathRaw(name, points, color, background, style, lineWidth)
	color = color or gcolor
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		width = lineWidth or 0.01,
		path = {point = points},
		background = background
	})
end

return vis
