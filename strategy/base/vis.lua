--[[
--- Provides functions to draw on the game field
module "vis"
]]--
local Coordinates = require "../base/coordinates"

local gcolor = {}
local gisFilled = true

local vis = {}

--- Joins rgba-value to a color.
-- Values from 0 to 255
-- @param red number
-- @param green number
-- @param blue number
-- @param alpha number
-- @return table color
function vis.fromRGBA(red, green, blue, alpha)
	return {red = red, green = green, blue = blue, alpha = alpha}
end

--- Modifies alpha value on a copy of the given color
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
-- @field turqouise (0,255,255)
-- @field blackHalf (0,0,0)
-- @field whiteHalf (255,255,255)
-- @field redHalf (255,0,0)
-- @field greenHalf (0,255,0)
-- @field blueHalf (0,0,255)
-- @field yellowHalf (255,255,0)
-- @field pinkHalf (255,0,255)
-- @field turqouiseHalf (0,255,255)

vis.colors = {}

vis.colors.black = vis.fromRGBA(0, 0, 0, 255)
vis.colors.blackHalf = vis.fromRGBA(0, 0, 0, 127)
vis.colors.white = vis.fromRGBA(255, 255, 255, 255)
vis.colors.whiteHalf = vis.fromRGBA(255, 255, 255, 127)

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
vis.colors.turqouise = vis.fromRGBA(0, 255, 255, 255)
vis.colors.turqouiseHalf = vis.fromRGBA(0, 255, 255, 127)

--- Sets line and fill color.
-- If filled is true polygons and circles are filled using color.
-- @param color table
-- @param isFilled bool
function vis.setColor(color, isFilled)
	gcolor = color
	gisFilled = isFilled
end

--- Adds a circle.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @param name string - Visualization group
-- @param center Vector - center of the circle
-- @param radius number - radius of the circle
-- @param color table - color (optional)
-- @param isFilled bool - fill circle (optional)
function vis.addCircle(name, center, radius, color, isFilled, background, style)
	vis.addCircleRaw(name, Coordinates.toGlobal(center), radius, color, isFilled, background, style)
end

--- Adds a circle. Requires global coordinates.
-- @see addCircle
function vis.addCircleRaw(name, center, radius, color, isFilled, background, style)
	isFilled = color and isFilled or gisFilled -- if color is set use passed isFilled
	color = color or gcolor
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		brush = isFilled and color or nil, width = 0.01,
		circle = {p_x = center.x, p_y = center.y, radius = radius},
		background = background
	})
end

--- Adds a polygon.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @param name string - Visualization group
-- @param points Vector[] - Points of the polygon
-- @param color table - color (optional)
-- @param isFilled bool - fill circle (optional)
function vis.addPolygon(name, points, color, isFilled, background, style)
	vis.addPolygonRaw(name, Coordinates.listToGlobal(points), color, isFilled, background, style)
end

--- Adds a polygon. Requires global coordinates.
-- @see addPolygon
function vis.addPolygonRaw(name, points, color, isFilled, background, style)
	isFilled = color and isFilled or gisFilled -- if color is set use passed isFilled
	color = color or gcolor
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		brush = isFilled and color or nil, width = 0.01,
		polygon = {point = points},
		background = background
	})
end

--- Adds a path.
-- If color is given use it instead of the global color and use the passed isFilled.
-- @param name string - Visualization group
-- @param points Vector[] - Points of the path
-- @param color table - line color (optional)
function vis.addPath(name, points, color, background, style)
	vis.addPathRaw(name, Coordinates.listToGlobal(points), color, background, style)
end

--- Adds a path. Requires global coordinates.
-- @see addPath
function vis.addPathRaw(name, points, color, background, style)
	color = color or gcolor
	amun.addVisualization({
		name = name, pen = { color=color, style=style },
		width = 0.01,
		path = {point = points},
		background = background
	})
end

return vis
