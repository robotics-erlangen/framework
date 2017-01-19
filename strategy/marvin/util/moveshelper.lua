local MovesHelper = {}

local geom = require "../base/geom"
local vis = require "../base/vis"

-- this function draws the two circles, in which a volley pass is not possible
-- it also returns the values from the indiscribed angle theorem
-- this MUST be considered in every static freekick
function MovesHelper.volleyCircle(point1, point2, theta)
	local center1, center2, radius = geom.inscribedAngle(point1, point2, theta)
	vis.addCircle("volleyCycle", center1, radius, vis.colors.redHalf, true)
	vis.addCircle("volleyCycle", center2, radius, vis.colors.redHalf, true)
	return center1, center2, radius
end

return MovesHelper