--[[
--- Provides several useful geometric functions
module "geom"
]]--
local geom = {}

--- Intersects two circles.
-- Returns up to two intersections or nothing if no intersections exist.
-- @name intersectCircleCircle
-- @param c1 Vector - Center of first circle
-- @param r1 number - Radius of first circle
-- @param c2 Vector - Center of second circle
-- @param r2 number - Radius of second circle
-- @return [Vector] - first intersection if exists
-- @return [Vector] - second intersection if exists
function geom.intersectCircleCircle(c1, r1, c2, r2)
	local dist = c1:distanceTo(c2)
	if dist > r1 + r2 then return nil
	elseif dist == r1 + r2 then return c1 + (c1-c2):scaleLength(0.5)
	elseif dist < r1 + r2 then
		local a1 = (r1*r1 - r2*r2 - c1.x*c1.x + c2.x*c2.x - c1.y*c1.y + c2.y*c2.y) / (2*c2.x - 2*c1.x)
		local a2 = (c1.y - c2.y) / (c2.x - c1.x)
		local k1 = 1 + (1 / (a2*a2))
		local k2 = 2*c1.x + (2*c1.y)/a2 + (2*a1)/(a2*a2)
		local k3 = c1.x*c1.x + (a1*a1)/(a2*a2) + (2*c1.y*a1)/a2 + (c1.y*c1.y) - (r1*r1)

		local finalX1 = ((k2/k1) / 2) + math.sqrt( ((k2/k1)*(k2/k1) / 4) - (k3/k1) )
		local finalX2 = ((k2/k1) / 2) - math.sqrt( ((k2/k1)*(k2/k1) / 4) - (k3/k1) )
		local finalY1 = 1 / a2 * finalX1 - (a1/a2)
		local finalY2 = 1 / a2 * finalX2 - (a1/a2)

		return Vector.create(finalX1, finalY1), Vector.create(finalX2, finalY2)
	end
end

--- Intersects a line with a circle.
-- Returns up to two intersections or nothing if no intersections exist.
-- @name intersectLineCircle
-- @param offset Vector - Start point of the line
-- @param dir Vector - Direction of the line
-- @param center Vector - Center of circle
-- @param radius number - Radius of circle
-- @return [Vector] - first intersection if exists
-- @return [Vector] - second intersection if exists
function geom.intersectLineCircle(offset, dir, center, radius)
	dir = dir:copy():normalize()
	local const = offset - center
	-- |offset + lambda*dir - center| = radius
	-- l^2 VxV + l 2(CxV) + CxC == R^2

	local a = dir:dot(dir)
	local b = 2 * dir:dot(const)
	local c = const:dot(const) - radius * radius

	local det = b * b - 4 * a * c

	if det < 0 then
		return
	end

	if det < 0.00001 then
		return offset + dir * (-b)/(2*a)
	end

	local point1 = offset + dir * (-b + math.sqrt(det))/(2*a)
	local point2 = offset + dir * (-b - math.sqrt(det))/(2*a)
	return point1, point2
end

--- Calcualtes tangents to circle.
-- Returns tangents on circle for point.
-- @name getTangentsToCircle
-- @param point Vector - Point for which the tangents are calculated
-- @param centerpoint Vector - Center of circle
-- @param radius number - Radius of circle
-- @return [Vector] - first tangent point on the circle if exists
-- @return [Vector] - second tangent point on the circle if exists
function geom.getTangentsToCircle(point, centerpoint, radius)
	return geom.intersectCircleCircle(centerpoint, radius, centerpoint+(point-centerpoint):scaleLength(0.5), 0.5*(centerpoint):distanceTo(point))
end

--- Intersects two lines.
-- Returns intersection and lambdas for each line. If no intersection exists return nothing!
-- @name intersectLineLine
-- @param pos1 Vector - Start point of line 1
-- @param dir1 Vector - Direction of line 1
-- @param pos2 Vector - Start point of line 2
-- @param dir2 Vector - Direction of line 2
-- @return [Vector - intersection
-- @return number - lambda1, intersection = pos1 + lambda1*dir1
-- @return number] - lambda2, intersection = pos2 + lambda2*dir2
function geom.intersectLineLine(pos1, dir1, pos2, dir2)
	if dir1 == dir2 then
		if pos1 == pos2 then
			return pos1, 0, 0
		else
			return
		end
	end

	local normal1 = dir1:perpendicular()
	local normal2 = dir2:perpendicular()
	local diff = pos2 - pos1
	local t1 = normal2:dot(diff) / normal2:dot(dir1)
	local t2 = normal1:dot(diff) / normal1:dot(dir2)

	return pos1 + dir1:copy():scaleLength(t1), t1, t2
end

--- Intersects two lines given as points.
-- @name intersectLinesByPoints
-- @see intersectLineLine
-- @param p1 Vector - point on line 1
-- @param p2 Vector - point on line 1
-- @param q1 Vector - point on line 2
-- @param q2 Vector - point on line 2
function geom.intersectLinesByPoints(p1, p2, q1, q2)
	return geom.intersectLineLine(p1, p2-p1, q1, q2-q1)
end

--- Calculates area of a triangle.
-- Using cross product.
-- @name calcTriangleArea
-- @param p1 Vector - first corner of triangle
-- @param p2 Vector - second corner of triangle
-- @param p3 Vector - third corner of triangle
-- @return number - area of triangle
function geom.calcTriangleArea(p1, p2, p3)
	local p21 = p2 - p1
	local p31 = p3 - p1
	return 0.5 * math.abs(p21.x * p31.y - p21.y * p31.x)
end

--- Calculates area of a quadrangle.
-- Expects corner to be order cw or ccw. Uses calcTriangleArea.
-- @name calcQuadrangleArea
-- @param p1 Vector - first corner of quadrangle
-- @param p2 Vector - second corner of quadrangle
-- @param p3 Vector - third corner of quadrangle
-- @param p4 Vector - fourth corner of quadrangle
-- @return number - area of quadrangle
function geom.calcQuadrangleArea(p1, p2, p3, p4)
	return geom.calcTriangleArea(p1, p2, p3) + geom.calcTriangleArea(p1, p3, p4)
end

--- Calculates geometric center of points in array.
-- @name center
-- @param pointArray Vector[] - points
-- @return Vector - geometric center of points
function geom.center(pointArray)
	local pos = Vector.create(0,0)
	for _, point in ipairs(pointArray) do
		pos = pos + point -- sum up all points
	end
	return pos / #pointArray
end

--- Checks if p is inside the triangle defined by a b c.
-- The triangle borders are considered as inside.
-- @name isInTriangle
-- @param a Vector - first corner of triangle
-- @param b Vector - second corner of triangle
-- @param c Vector - third corner of triangle
-- @param p Vector - point to check
-- @return bool - Is p in triangle
function geom.isInTriangle(a, b, c, p)
	local a2 = a - a
	local b2 = b - a
	local c2 = c - a
	local p2 = p - a

	local y = (b2.y * p2.x - p2.y) / (c2.x * b2.y - c2.y) -- transform coordinates
	local x = (y * c2.y - p2.y) / b2.y -- to triangle (0,0) (1,0) (0,1)
	if x < 0 or y < 0 or x + y > 1 then
		return false
	else
		return true
	end
end

--- Normalizes angle to value in interval [-pi, +pi].
-- @name normalizeAngle
-- @param angle number - angle in radians
-- @return number - normalized angle
function geom.normalizeAngle(angle)
	while angle > math.pi do
		angle = angle - 2 * math.pi
	end
	while angle < -math.pi do
		angle = angle + 2 * math.pi
	end
	return angle
end

--- Normalized difference between angles.
-- Return value is in interval [-pi, +pi].
-- angle2 = angle1 + angleDiff (normalized)
-- @name getAngleDiff
-- @param angle1 number - first angle in radians
-- @param angle2 number - second angle in radians
-- @return number - angleDiff in radians
function geom.getAngleDiff(angle1, angle2)
	local diff = angle2 - angle1
	return geom.normalizeAngle(diff)
end

return geom
